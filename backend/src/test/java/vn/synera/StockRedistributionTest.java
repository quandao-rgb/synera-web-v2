package vn.synera;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import vn.synera.catalog.CatalogFacade;
import vn.synera.common.*;
import vn.synera.iam.ActorFacade;
import vn.synera.inventory.*;
import vn.synera.salesorder.SalesFacade;

class StockRedistributionTest {
  @Test
  void demandIsSharedAcrossLotsInExpiryOrderWithoutInventingBuyers() {
    var inventory = mock(InventoryFacade.class);
    var catalog = mock(CatalogFacade.class);
    var sales = mock(SalesFacade.class);
    var actors = mock(ActorFacade.class);
    var warehouse = new CatalogFacade.WarehouseInfo(1L, 2L, "Kho", "NPP");
    when(catalog.warehouse(1L)).thenReturn(warehouse);
    when(catalog.warehouses()).thenReturn(List.of(warehouse));
    when(catalog.product(1L))
        .thenReturn(
            new CatalogFacade.Product(
                1L, "SKU", "Sản phẩm", "DRINK", true, BigDecimal.ONE, "CHAI"));
    when(sales.purchaseHistory(2L)).thenReturn(List.of());
    when(inventory.balances(1L))
        .thenReturn(
            List.of(
                SqlRecords.mutable(
                    "id",
                    1L,
                    "skuId",
                    1L,
                    "warehouseId",
                    1L,
                    "available",
                    new BigDecimal("20"),
                    "expiryDate",
                    Dates.today().plusDays(2).toString())));
    var facade = new StockRedistributionFacade(inventory, catalog, sales, actors);
    var response = (Map<?, ?>) facade.risks(1L);
    var lot = (Map<?, ?>) ((List<?>) response.get("lots")).getFirst();
    assertEquals(new BigDecimal("20.000"), ((BigDecimal) lot.get("surplus")).setScale(3));
    assertTrue(((List<?>) lot.get("buyers")).isEmpty());
    verify(actors).require("WAREHOUSE_WRITE");
    when(inventory.balances(1L))
        .thenReturn(
            List.of(
                SqlRecords.mutable(
                    "id",
                    1L,
                    "skuId",
                    1L,
                    "warehouseId",
                    1L,
                    "available",
                    new BigDecimal("20"),
                    "expiryDate",
                    Dates.today().minusDays(1).toString())));
    lot = (Map<?, ?>) ((List<?>) ((Map<?, ?>) facade.risks(1L)).get("lots")).getFirst();
    assertEquals(true, lot.get("expired"));
    assertTrue(((List<?>) lot.get("buyers")).isEmpty());
  }
}
