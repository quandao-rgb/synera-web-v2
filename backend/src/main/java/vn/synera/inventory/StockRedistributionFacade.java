package vn.synera.inventory;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.synera.catalog.CatalogFacade;
import vn.synera.common.*;
import vn.synera.iam.ActorFacade;
import vn.synera.salesorder.SalesFacade;

@Service
@Transactional(readOnly = true)
public class StockRedistributionFacade {
  private final InventoryFacade inventory;
  private final CatalogFacade catalog;
  private final SalesFacade sales;
  private final ActorFacade actors;

  public StockRedistributionFacade(
      InventoryFacade inventory, CatalogFacade catalog, SalesFacade sales, ActorFacade actors) {
    this.inventory = inventory;
    this.catalog = catalog;
    this.sales = sales;
    this.actors = actors;
  }

  public Object risks(Long warehouseId) {
    actors.require("WAREHOUSE_WRITE");
    var warehouse = catalog.warehouse(warehouseId);
    BusinessException.require(warehouse.type().equals("NPP"), "Chỉ dự báo kho bán hàng của NPP.");
    var history = sales.purchaseHistory(warehouse.orgId());
    var stock = new ArrayList<Map<String, Object>>();
    for (var w : catalog.warehouses())
      if (w.orgId().equals(warehouse.orgId()) && w.type().equals("NPP"))
        stock.addAll(inventory.balances(w.id()));
    stock.sort(
        Comparator.comparing(
                (Map<String, Object> r) -> Objects.toString(r.get("expiryDate"), "9999"))
            .thenComparing(r -> ((Number) r.get("id")).longValue()));
    var allocatedDemand = new HashMap<Long, BigDecimal>();
    var result = new ArrayList<Map<String, Object>>();
    for (var row : stock) {
      Long sku = ((Number) row.get("skuId")).longValue();
      var product = catalog.product(sku);
      var expiry = Objects.toString(row.get("expiryDate"), "");
      var available = new BigDecimal(row.get("available").toString()).max(BigDecimal.ZERO);
      if (expiry.isBlank() || available.signum() == 0) continue;
      var days = Math.max(0, ChronoUnit.DAYS.between(Dates.today(), LocalDate.parse(expiry)));
      var same =
          history.stream().filter(h -> ((Number) h.get("skuId")).longValue() == sku).toList();
      var sold30 =
          same.stream()
              .map(h -> (BigDecimal) h.get("qtyBase30"))
              .reduce(BigDecimal.ZERO, BigDecimal::add);
      var daily = sold30.divide(BigDecimal.valueOf(30), 6, RoundingMode.HALF_UP);
      var expected =
          daily
              .multiply(BigDecimal.valueOf(days))
              .subtract(allocatedDemand.getOrDefault(sku, BigDecimal.ZERO))
              .max(BigDecimal.ZERO)
              .min(available)
              .setScale(3, RoundingMode.DOWN);
      allocatedDemand.merge(sku, expected, BigDecimal::add);
      var expired = LocalDate.parse(expiry).isBefore(Dates.today());
      var buyers = new ArrayList<Map<String, Object>>();
      if (!expired)
        for (var h : same) {
          var store = catalog.store(((Number) h.get("storeId")).longValue());
          if (!"ACTIVE".equals(store.status())) continue;
          var buyer = new LinkedHashMap<>(h);
          buyer.put("id", store.id());
          buyer.put("nppId", warehouse.orgId());
          buyer.put("name", store.name());
          buyer.put("phone", Objects.toString(store.phone(), ""));
          buyer.put("address", Objects.toString(store.address(), ""));
          buyers.add(buyer);
        }
      buyers.sort(
          Comparator.comparing((Map<String, Object> h) -> (BigDecimal) h.get("qtyBase30"))
              .reversed()
              .thenComparing(
                  h -> Objects.toString(h.get("lastPurchase"), ""), Comparator.reverseOrder()));
      if (((Number) row.get("warehouseId")).longValue() != warehouseId) continue;
      var value = new LinkedHashMap<>(row);
      value.put("name", product.name());
      value.put("code", product.code());
      value.put("unit", product.baseUnit());
      value.put("days", days);
      value.put("daily", daily);
      value.put("sold30", sold30);
      value.put("expectedSold", expected);
      value.put("surplus", available.subtract(expected));
      value.put("expired", expired);
      value.put("buyers", buyers);
      result.add(value);
    }
    return SqlRecords.mutable("asOf", Dates.today().toString(), "lookbackDays", 30, "lots", result);
  }
}
