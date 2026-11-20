package vn.synera.route.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.synera.common.*;
import vn.synera.route.RouteFacade;
import vn.synera.route.RouteMcpFacade;
import vn.synera.salesorder.SalesFacade;

@RestController
@RequestMapping("/api/v1")
public class RouteController {
  private final RouteFacade routes;
  private final SalesFacade sales;
  private final IdempotencyService idem;
  private final RouteMcpFacade mcp;

  public RouteController(
      RouteFacade routes, SalesFacade sales, IdempotencyService idem, RouteMcpFacade mcp) {
    this.routes = routes;
    this.sales = sales;
    this.idem = idem;
    this.mcp = mcp;
  }

  public record WeeklyRoute(
      @NotNull Long nppId,
      @NotNull Long repId,
      @NotBlank String name,
      Long organizationId,
      @NotEmpty List<Long> storeIds) {}

  @PostMapping("/routes/weekly")
  @PreAuthorize("hasAuthority('ROUTE_WRITE')")
  public ApiResponse<?> weekly(
      @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody WeeklyRoute r) {
    return ApiResponse.ok(
        idem.execute(
            key,
            "route.create-weekly",
            r,
            () -> mcp.create(r.nppId(), r.repId(), r.name(), r.organizationId(), r.storeIds())));
  }

  @GetMapping("/routes/{id}/mcp")
  @PreAuthorize("hasAnyAuthority('ROUTE_WRITE','REPORT_READ')")
  public ApiResponse<?> mcp(@PathVariable Long id, @RequestParam LocalDate weekStart) {
    return ApiResponse.ok(mcp.read(id, weekStart));
  }

  @PostMapping("/routes/{id}/mcp")
  @PreAuthorize("hasAuthority('ROUTE_WRITE')")
  public ApiResponse<?> saveMcp(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @RequestBody RouteMcpFacade.Schedule request) {
    return ApiResponse.ok(
        idem.execute(key, "route.mcp." + id, request, () -> mcp.save(id, request)));
  }

  public record RouteReq(
      @NotNull Long nppId,
      @NotNull Long repId,
      @NotBlank String name,
      @NotEmpty List<Long> storeIds,
      @Min(1) @Max(7) int weekday,
      Long organizationId) {}

  public record Placement(@NotNull Long organizationId, @NotNull Long version, String reason) {}

  @PostMapping("/routes/{id}/organization")
  @PreAuthorize("hasAuthority('ROUTE_WRITE')")
  public ApiResponse<?> place(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Placement request) {
    return ApiResponse.ok(
        idem.execute(
            key,
            "route.place." + id,
            request,
            () ->
                mcp.place(
                    id,
                    request.organizationId(),
                    request.version(),
                    Objects.toString(request.reason(), ""))));
  }

  public record Plan(@NotNull LocalDate day) {}

  public record CheckIn(
      @DecimalMin("-90") @DecimalMax("90") double latitude,
      @DecimalMin("-180") @DecimalMax("180") double longitude,
      String reason) {
    public CheckIn {
      reason = java.util.Objects.toString(reason, "");
    }
  }

  public record Transfer(
      @NotNull Long nppId, @NotNull Long fromRepId, @NotNull Long toRepId, String reason) {
    public Transfer {
      reason = java.util.Objects.toString(reason, "");
    }
  }

  public record Report(@NotNull LocalDate day, String note, boolean submit) {}

  @GetMapping("/routes")
  public ApiResponse<?> routes() {
    return ApiResponse.ok(routes.list());
  }

  @PostMapping("/routes")
  @PreAuthorize("hasAuthority('ROUTE_WRITE')")
  public ApiResponse<?> create(
      @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody RouteReq r) {
    return ApiResponse.ok(
        idem.execute(
            key,
            "route.create",
            r,
            () ->
                routes.create(
                    r.nppId(),
                    r.repId(),
                    r.name(),
                    r.storeIds(),
                    r.weekday(),
                    r.organizationId())));
  }

  @PostMapping("/routes/{id}/plan")
  @PreAuthorize("hasAuthority('ROUTE_WRITE')")
  public ApiResponse<?> plan(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody Plan r) {
    return ApiResponse.ok(idem.execute(key, "route.plan." + id, r, () -> routes.plan(id, r.day())));
  }

  @GetMapping("/visits/today")
  public ApiResponse<?> visits() {
    return ApiResponse.ok(routes.today());
  }

  @PostMapping("/visits/{id}/check-in")
  @PreAuthorize("hasAuthority('SALES_CREATE')")
  public ApiResponse<?> checkin(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody CheckIn r) {
    return ApiResponse.ok(
        idem.execute(
            key,
            "visit.check-in." + id,
            r,
            () -> routes.checkIn(id, r.latitude(), r.longitude(), r.reason())));
  }

  @PostMapping("/visits/{id}/check-out")
  @PreAuthorize("hasAuthority('SALES_CREATE')")
  public ApiResponse<?> checkout(
      @PathVariable Long id,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody DocumentRequests.Reason r) {
    return ApiResponse.ok(
        idem.execute(key, "visit.check-out." + id, r, () -> routes.checkOut(id, r.reason())));
  }

  @PostMapping("/handovers")
  @PreAuthorize("hasAuthority('ROUTE_WRITE')")
  public ApiResponse<?> handover(
      @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody Transfer r) {
    return ApiResponse.ok(
        idem.execute(
            key,
            "route.handover",
            r,
            () -> routes.handover(r.nppId(), r.fromRepId(), r.toRepId(), r.reason())));
  }

  @PostMapping("/sales/daily-report")
  @PreAuthorize("hasAuthority('SALES_CREATE')")
  public ApiResponse<?> daily(
      @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody Report r) {
    return ApiResponse.ok(
        idem.execute(
            key,
            "daily-report",
            r,
            () -> sales.daily(r.day(), r.note(), r.submit(), routes.ownVisitCount(r.day()))));
  }
}
