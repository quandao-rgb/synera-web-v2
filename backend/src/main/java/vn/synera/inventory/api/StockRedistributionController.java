package vn.synera.inventory.api;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.synera.common.ApiResponse;
import vn.synera.inventory.StockRedistributionFacade;

@RestController
@RequestMapping("/api/v1/inventory/redistribution")
@PreAuthorize("hasAuthority('WAREHOUSE_WRITE')")
public class StockRedistributionController {
  private final StockRedistributionFacade service;

  public StockRedistributionController(StockRedistributionFacade service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<?> risks(@RequestParam Long warehouseId) {
    return ApiResponse.ok(service.risks(warehouseId));
  }
}
