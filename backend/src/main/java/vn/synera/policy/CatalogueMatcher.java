package vn.synera.policy;

import java.util.*;

/** Nearest catalogue neighbours using weighted token coverage and bounded spelling distance. */
final class CatalogueMatcher {
  record Match(Map<String, Object> product, double score, boolean exact) {}

  private static final Set<String> STOP =
      Set.of(
          "toi", "muon", "nhap", "can", "dat", "mua", "lay", "cho", "minh", "giup", "them", "voi",
          "hang", "loai", "san", "pham");

  static String query(String value) {
    return OrderRequestParser.fold(value)
        .replaceAll("[^a-z0-9\\s-]", " ")
        .replaceAll("\\bnc\\b", "nuoc")
        .replaceAll("\\b(?:nuoc suoi|nuoc loc)\\b", "nuoc khoang")
        .replaceAll("\\bsua bo\\b", "sua tuoi")
        .replaceAll("\\s+", " ")
        .trim();
  }

  private static List<String> tokens(String value) {
    return Arrays.stream(query(value).split("\\s+"))
        .filter(s -> !s.isBlank() && !STOP.contains(s))
        .distinct()
        .toList();
  }

  static List<Match> nearest(String input, List<Map<String, Object>> offerings) {
    var unique = new LinkedHashMap<Object, Map<String, Object>>();
    offerings.forEach(p -> unique.putIfAbsent(p.get("skuId"), p));
    var words = tokens(input);
    if (words.isEmpty()) return List.of();
    var result = new ArrayList<Match>();
    for (var p : unique.values()) {
      var name = tokens(String.valueOf(p.get("name")));
      String code = OrderRequestParser.fold(String.valueOf(p.get("code")));
      boolean exact =
          words.contains(code)
              || query(input).equals(query(String.valueOf(p.get("name"))))
              || query(input)
                  .matches(
                      ".*(?<![a-z0-9])"
                          + java.util.regex.Pattern.quote(query(String.valueOf(p.get("name"))))
                          + "(?![a-z0-9]).*");
      double total = 0, matched = 0;
      for (var word : words) {
        double weight = Set.of("nuoc", "sua", "banh", "tra").contains(word) ? 0.55 : 1;
        total += weight;
        double similarity =
            name.stream().mapToDouble(token -> similarity(word, token)).max().orElse(0);
        similarity = Math.max(similarity, similarity(word, code));
        matched += weight * similarity;
      }
      long covered =
          name.stream()
              .filter(token -> words.stream().anyMatch(word -> similarity(word, token) >= 0.8))
              .count();
      double score =
          words.contains(code) || query(input).equals(query(String.valueOf(p.get("name"))))
              ? 1
              : exact ? 0.96 : 0.85 * matched / total + 0.15 * covered / Math.max(1, name.size());
      if (score >= 0.5) result.add(new Match(p, score, exact));
    }
    return result.stream()
        .sorted(
            Comparator.comparingDouble(Match::score)
                .reversed()
                .thenComparing(m -> String.valueOf(m.product().get("code"))))
        .limit(4)
        .toList();
  }

  private static double similarity(String a, String b) {
    if (a.equals(b)) return 1;
    if (a.length() < 4 || b.length() < 4 || Math.abs(a.length() - b.length()) > 1) return 0;
    if (a.length() == b.length()) {
      for (int index = 0; index < a.length() - 1; index++) {
        char[] letters = a.toCharArray();
        char first = letters[index];
        letters[index] = letters[index + 1];
        letters[index + 1] = first;
        if (new String(letters).equals(b)) return 0.85;
      }
    }
    int[] previous = new int[b.length() + 1];
    for (int j = 0; j < previous.length; j++) previous[j] = j;
    for (int i = 1; i <= a.length(); i++) {
      int[] next = new int[b.length() + 1];
      next[0] = i;
      for (int j = 1; j <= b.length(); j++)
        next[j] =
            Math.min(
                Math.min(next[j - 1] + 1, previous[j] + 1),
                previous[j - 1] + (a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1));
      previous = next;
    }
    return previous[b.length()] == 1 ? 0.85 : 0;
  }
}
