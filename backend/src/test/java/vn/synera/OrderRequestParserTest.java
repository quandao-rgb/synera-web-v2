package vn.synera;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import vn.synera.policy.OrderRequestParser;

class OrderRequestParserTest {
  List<Map<String, Object>> offerings =
      List.of(
          Map.of(
              "skuId",
              1L,
              "name",
              "Sữa dinh dưỡng",
              "code",
              "MILK-01",
              "uom",
              "THUNG",
              "multiple",
              1),
          Map.of(
              "skuId",
              1L,
              "name",
              "Sữa dinh dưỡng",
              "code",
              "MILK-01",
              "uom",
              "HOP",
              "multiple",
              6),
          Map.of("skuId", 2L, "name", "Trà xanh", "code", "TEA-01", "uom", "THUNG", "multiple", 1));

  @Test
  void usesRealCatalogueAndDoesNotReturnPricesOrSubmitAnything() {
    var r = OrderRequestParser.parse("10 thùng MILK-01; 6 HOP Sữa dinh dưỡng", offerings);
    assertEquals(2, r.lines().size());
    assertTrue(r.unresolved().isEmpty());
    assertFalse(r.lines().get(0).containsKey("price"));
  }

  @Test
  void ambiguousUnknownMissingUnitNegativeAndWrongMultipleStayUnresolved() {
    for (var text :
        List.of(
            "10 thùng MILK-01 TEA-01",
            "10 THUNG UNKNOWN",
            "10 MILK-01",
            "-1 THUNG MILK-01",
            "1 HOP MILK-01")) {
      assertTrue(OrderRequestParser.parse(text, offerings).lines().isEmpty(), text);
      assertFalse(OrderRequestParser.parse(text, offerings).unresolved().isEmpty(), text);
    }
  }

  @Test
  void matchesPartialVietnameseNamesAndSmallSpellingErrorsWithoutInventingPrices() {
    var water =
        Map.<String, Object>of(
            "skuId",
            3L,
            "name",
            "Nước khoáng thiên nhiên",
            "code",
            "WATER-01",
            "uom",
            "THUNG",
            "multiple",
            1);
    var catalogue = new ArrayList<>(offerings);
    catalogue.add(water);
    for (var text :
        List.of(
            "tôi muốn nhập 2 thùng nước khoáng",
            "2 THÙNG NƯỚC KHOÁNG",
            "2thung nuoc khoan",
            "2 thung nuoc khoagn",
            "hai thùng nước suối")) {
      var parsed = OrderRequestParser.parse(text, catalogue);
      assertEquals(1, parsed.lines().size(), text);
      assertEquals(3L, parsed.lines().get(0).get("skuId"), text);
      assertEquals(
          0,
          new java.math.BigDecimal("2")
              .compareTo((java.math.BigDecimal) parsed.lines().get(0).get("qty")));
      assertFalse(parsed.lines().get(0).containsKey("price"));
    }
  }

  @Test
  void ambiguousNearbyProductsRequireAChoiceAndRemainWithinTheSuppliedCatalogue() {
    var water =
        List.of(
            Map.<String, Object>of(
                "skuId",
                3L,
                "name",
                "Nước khoáng thiên nhiên",
                "code",
                "WATER-01",
                "uom",
                "THUNG",
                "multiple",
                1),
            Map.<String, Object>of(
                "skuId",
                4L,
                "name",
                "Nước khoáng có ga",
                "code",
                "WATER-02",
                "uom",
                "THUNG",
                "multiple",
                1));
    var parsed = OrderRequestParser.parse("2 thùng nước khoáng", water);
    assertTrue(parsed.lines().isEmpty());
    assertEquals(1, parsed.suggestions().size());
    assertEquals(2, ((List<?>) parsed.suggestions().get(0).get("candidates")).size());
    assertTrue(OrderRequestParser.parse("2 thùng nước khoáng", List.of()).lines().isEmpty());
    var exact = OrderRequestParser.parse("2 thùng WATER-02", water);
    assertEquals(4L, exact.lines().get(0).get("skuId"));
    assertTrue(OrderRequestParser.parse("1 lít nước khoáng", water).lines().isEmpty());
  }
}
