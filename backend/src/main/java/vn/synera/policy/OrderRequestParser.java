package vn.synera.policy;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Catalogue-bound assistance; never creates orders, guesses prices or applies benefits. */
public final class OrderRequestParser {
  private OrderRequestParser() {}

  public record Result(
      List<Map<String, Object>> lines,
      List<String> unresolved,
      String method,
      List<Map<String, Object>> suggestions) {}

  static String fold(String input) {
    return Normalizer.normalize(input, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replace('đ', 'd')
        .replace('Đ', 'D')
        .toLowerCase(Locale.ROOT)
        .trim();
  }

  private static boolean contains(String input, String term) {
    return !term.isBlank()
        && Pattern.compile("(?<![a-z0-9])" + Pattern.quote(fold(term)) + "(?![a-z0-9])")
            .matcher(input)
            .find();
  }

  public static Result parse(String request, List<Map<String, Object>> offerings) {
    var result = new ArrayList<Map<String, Object>>();
    var unresolved = new ArrayList<String>();
    var suggestions = new ArrayList<Map<String, Object>>();
    var unitQuantity =
        Pattern.compile(
            "(?<![a-z0-9])(-?\\d+(?:[.,]\\d{1,3})?|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\\s*(thung|chai|loc|hop|goi|lon|kg|lit|cai)(?![a-z])");
    var numbers =
        Map.of(
            "mot", 1, "hai", 2, "ba", 3, "bon", 4, "nam", 5, "sau", 6, "bay", 7, "tam", 8, "chin",
            9, "muoi", 10);
    for (var raw : request.split("[;\\n]+|(?<!\\d),\\s*(?=\\d)|\\s+[vV][aà]\\s+(?=\\d)")) {
      var input = fold(raw);
      if (input.isBlank()) continue;
      var exactSkus =
          offerings.stream()
              .filter(p -> contains(input, String.valueOf(p.get("code"))))
              .map(p -> p.get("skuId"))
              .distinct()
              .toList();
      if (exactSkus.size() > 1) {
        unresolved.add(
            raw + ": có nhiều mặt hàng trong cùng dòng; tách mỗi mặt hàng thành một dòng.");
        continue;
      }
      var matcher = unitQuantity.matcher(input);
      if (!matcher.find()) {
        unresolved.add(raw + ": cần số lượng và đơn vị, ví dụ 2 thùng nước khoáng.");
        continue;
      }
      String quantity = matcher.group(1), unit = matcher.group(2).toUpperCase(Locale.ROOT);
      BigDecimal qty =
          numbers.containsKey(quantity)
              ? BigDecimal.valueOf(numbers.get(quantity))
              : new BigDecimal(quantity.replace(',', '.'));
      String search = input.substring(0, matcher.start()) + " " + input.substring(matcher.end());
      if (matcher.find() || qty.signum() <= 0) {
        unresolved.add(raw + ": mỗi dòng cần một số lượng dương và một đơn vị.");
        continue;
      }
      var ranked =
          CatalogueMatcher.nearest(search, offerings).stream()
              .filter(m -> exactSkus.isEmpty() || exactSkus.contains(m.product().get("skuId")))
              .toList();
      var candidates = new ArrayList<Map<String, Object>>();
      var scores = new ArrayList<Double>();
      for (var match : ranked) {
        var offering =
            offerings.stream()
                .filter(
                    p ->
                        p.get("skuId").equals(match.product().get("skuId"))
                            && unit.equals(p.get("uom")))
                .findFirst()
                .orElse(null);
        if (offering == null) continue;
        var multiple = new BigDecimal(String.valueOf(offering.get("multiple")));
        if (multiple.signum() <= 0 || qty.remainder(multiple).signum() != 0) continue;
        candidates.add(
            Map.of(
                "skuId",
                offering.get("skuId"),
                "uom",
                offering.get("uom"),
                "qty",
                qty,
                "name",
                offering.get("name"),
                "code",
                offering.get("code"),
                "match",
                match.exact() ? "EXACT" : "NEAREST",
                "requestedText",
                raw));
        scores.add(match.score());
        if (candidates.size() == 3) break;
      }
      if (candidates.isEmpty()) {
        unresolved.add(
            raw
                + ": chưa tìm được mặt hàng phù hợp với đơn vị và bội số bán. Hãy thêm tên hoặc mã"
                + " sản phẩm.");
        continue;
      }
      boolean confident =
          exactSkus.size() == 1
              || scores.get(0) >= 0.82
                  && (scores.size() == 1 || scores.get(0) - scores.get(1) >= 0.12);
      if (confident) result.add(candidates.get(0));
      else suggestions.add(Map.of("text", raw, "candidates", candidates));
    }
    return new Result(result, unresolved, "CATALOGUE_NEAREST", suggestions);
  }
}
