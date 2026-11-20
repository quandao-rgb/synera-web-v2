package vn.synera.route;

import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.synera.catalog.CatalogFacade;
import vn.synera.common.*;
import vn.synera.iam.ActorFacade;
import vn.synera.route.domain.*;
import vn.synera.route.repo.*;

@Service
@Transactional
public class RouteMcpFacade {
  public record Entry(Long storeId, int sequence, List<Integer> weekdays) {}

  public record Schedule(
      LocalDate weekStart,
      LocalDate effectiveFrom,
      Long repId,
      Long organizationId,
      Long version,
      List<Entry> entries) {}

  private final SalesRouteRepository routes;
  private final RouteStopRepository stops;
  private final VisitRepository visits;
  private final RouteWeekPlanRepository weeks;
  private final CatalogFacade catalog;
  private final ActorFacade actors;
  private final AuditService audit;
  private final JdbcTemplate jdbc;

  public RouteMcpFacade(
      SalesRouteRepository routes,
      RouteStopRepository stops,
      VisitRepository visits,
      RouteWeekPlanRepository weeks,
      CatalogFacade catalog,
      ActorFacade actors,
      AuditService audit,
      JdbcTemplate jdbc) {
    this.routes = routes;
    this.stops = stops;
    this.visits = visits;
    this.weeks = weeks;
    this.catalog = catalog;
    this.actors = actors;
    this.audit = audit;
    this.jdbc = jdbc;
  }

  private void week(LocalDate start) {
    BusinessException.require(
        start != null && start.getDayOfWeek() == DayOfWeek.MONDAY, "Chọn tuần bắt đầu từ thứ Hai.");
  }

  private SalesRoute scoped(Long id) {
    var route = routes.findById(id).orElseThrow(BusinessException::missing);
    catalog.npp(route.nppId);
    if (actors.current().sales()) throw BusinessException.missing();
    return route;
  }

  private List<RouteStop> members(Long id) {
    return stops.findAll((r, q, cb) -> cb.equal(r.get("routeId"), id)).stream()
        .sorted(Comparator.comparingInt(s -> s.sequenceNo))
        .toList();
  }

  private List<Visit> routeVisits(SalesRoute route, List<RouteStop> members) {
    var ids = members.stream().map(s -> s.storeId).collect(java.util.stream.Collectors.toSet());
    return visits.findByNppId(route.nppId).stream()
        .filter(
            v ->
                route.id.equals(v.routeId)
                    || (v.routeId == null
                        && route.repId.equals(v.repId)
                        && ids.contains(v.storeId)))
        .toList();
  }

  public Map<String, Object> read(Long id, LocalDate start) {
    week(start);
    var route = scoped(id);
    var members = members(id);
    var plan = weeks.findByRouteIdAndWeekStart(id, start).orElse(null);
    var work =
        routeVisits(route, members).stream()
            .filter(v -> !v.day.isBefore(start) && !v.day.isAfter(start.plusDays(6)))
            .filter(v -> !v.status.equals("CANCELLED"))
            .toList();
    var entries = new ArrayList<Map<String, Object>>();
    for (var stop : members) {
      var store = catalog.routeStoreReference(stop.storeId, route.nppId);
      var days =
          work.stream()
              .filter(v -> v.storeId.equals(stop.storeId))
              .map(v -> v.day.getDayOfWeek().getValue())
              .distinct()
              .sorted()
              .toList();
      if (plan == null && route.scheduleMode.equals("RECURRING")) days = List.of(stop.weekday);
      entries.add(
          SqlRecords.mutable(
              "storeId",
              store.id(),
              "name",
              store.name(),
              "address",
              store.address(),
              "sequence",
              stop.sequenceNo,
              "weekdays",
              days));
    }
    return SqlRecords.mutable(
        "route",
        routeDto(route),
        "weekStart",
        start,
        "weekEnd",
        start.plusDays(6),
        "effectiveFrom",
        plan == null ? (Dates.today().isAfter(start) ? Dates.today() : start) : plan.effectiveFrom,
        "repId",
        plan == null ? route.repId : plan.repId,
        "entries",
        entries,
        "visits",
        work.stream().map(this::visitDto).toList(),
        "holidays",
        holidays(start));
  }

  private Set<LocalDate> holidays(LocalDate start) {
    return new HashSet<>(
        jdbc.query(
            "select holiday_date from business_holiday where holiday_date between ? and ?",
            (r, n) -> r.getDate(1).toLocalDate(),
            java.sql.Date.valueOf(start),
            java.sql.Date.valueOf(start.plusDays(6))));
  }

  public Map<String, Object> create(
      Long nppId, Long repId, String name, Long organizationId, List<Long> storeIds) {
    jdbc.queryForList("select id from organization_graph_guard where id=1 for update");
    catalog.npp(nppId);
    actors.assertRep(repId, nppId);
    BusinessException.require(
        actors.staff(nppId, "SALES").stream().anyMatch(person -> person.id().equals(repId)),
        "Tuyến cần giao cho nhân viên Sales.");
    BusinessException.require(
        name != null && !name.isBlank() && name.length() <= 255, "Tên tuyến không hợp lệ.");
    BusinessException.require(
        storeIds != null && !storeIds.isEmpty(), "Chọn điểm bán trong tuyến.");
    var route = new SalesRoute();
    route.nppId = nppId;
    route.repId = repId;
    route.name = name.trim();
    route.scheduleMode = "WEEKLY";
    route.organizationId = catalog.routeOrganization(organizationId, nppId);
    routes.saveAndFlush(route);
    int sequence = 0;
    for (var id : new LinkedHashSet<>(storeIds)) {
      var store = catalog.store(id);
      BusinessException.require(
          store.nppId().equals(nppId), "Không ghép cửa hàng khác NPP vào tuyến.");
      BusinessException.require(
          store.routeId() == null, "Điểm bán đã thuộc một tuyến; mở tuyến đó để điều chỉnh.");
      var stop = new RouteStop();
      stop.routeId = route.id;
      stop.storeId = id;
      stop.sequenceNo = ++sequence;
      stop.weekday = 0;
      stops.save(stop);
      catalog.setRoute(id, route.id);
    }
    audit.add(
        actors.current().id(),
        "Route",
        route.id,
        "CREATE_WEEKLY",
        SqlRecords.mutable("nppId", nppId, "repId", repId, "storeIds", storeIds));
    return routeDto(route);
  }

  public Map<String, Object> save(Long id, Schedule request) {
    actors.require("ROUTE_WRITE");
    jdbc.queryForList("select id from organization_graph_guard where id=1 for update");
    var route = routes.lockById(id).orElseThrow(BusinessException::missing);
    scoped(id);
    week(request.weekStart());
    if (request.version() == null || !request.version().equals(route.version))
      throw BusinessException.conflict(
          "OPTIMISTIC_LOCK", "Tuyến đã thay đổi; tải lại trước khi lưu.");
    var start = request.weekStart();
    var end = start.plusDays(6);
    var effective = request.effectiveFrom();
    BusinessException.require(
        effective != null
            && !effective.isBefore(Dates.today())
            && !effective.isBefore(start)
            && !effective.isAfter(end),
        "Ngày hiệu lực phải từ hôm nay và nằm trong tuần đang phân tuyến.");
    BusinessException.require(request.repId() != null, "Chọn nhân viên Sales.");
    actors.assertRep(request.repId(), route.nppId);
    BusinessException.require(
        actors.staff(route.nppId, "SALES").stream()
            .anyMatch(person -> person.id().equals(request.repId())),
        "Chọn nhân viên Sales thuộc NPP của tuyến.");
    var organization = catalog.routeOrganization(request.organizationId(), route.nppId);
    BusinessException.require(
        request.entries() != null && request.entries().size() <= 1000,
        "Danh sách điểm bán không hợp lệ.");
    var definitions = new LinkedHashMap<Long, Entry>();
    var usedSequence = new HashSet<Integer>();
    var holidays = holidays(start);
    for (var entry : request.entries()) {
      BusinessException.require(
          entry != null
              && entry.storeId() != null
              && entry.weekdays() != null
              && entry.sequence() > 0
              && usedSequence.add(entry.sequence())
              && !definitions.containsKey(entry.storeId()),
          "Điểm bán hoặc thứ tự bị trùng/không hợp lệ.");
      var store = catalog.store(entry.storeId());
      BusinessException.require(store.nppId().equals(route.nppId), "Điểm bán thuộc NPP khác.");
      BusinessException.require(
          store.routeId() == null || store.routeId().equals(id),
          "Điểm bán đã thuộc tuyến khác; không được chia trùng.");
      BusinessException.require(
          new HashSet<>(entry.weekdays()).size() == entry.weekdays().size(), "Ngày ghé bị trùng.");
      for (var weekday : entry.weekdays()) {
        BusinessException.require(
            weekday != null && weekday >= 1 && weekday <= 7,
            "Ngày ghé phải từ thứ Hai đến Chủ nhật.");
        BusinessException.require(
            !holidays.contains(start.plusDays(weekday - 1)),
            "Không phân lịch vào ngày nghỉ nghiệp vụ.");
      }
      definitions.put(entry.storeId(), entry);
    }
    var oldMembers = members(id);
    var work = new ArrayList<>(routeVisits(route, oldMembers));
    // Associate only legacy rows that unambiguously matched this route's Sales and stores.
    for (var visit : work) if (visit.routeId == null) visit.routeId = id;
    for (var old : oldMembers) {
      if (!definitions.containsKey(old.storeId)) {
        for (var visit : work)
          if (visit.storeId.equals(old.storeId)
              && !visit.day.isBefore(effective)
              && !visit.day.isAfter(end)
              && visit.status.equals("PLANNED")) visit.status = "CANCELLED";
      }
    }
    for (var entry : definitions.values()) {
      var stop =
          oldMembers.stream()
              .filter(s -> s.storeId.equals(entry.storeId()))
              .findFirst()
              .orElseGet(RouteStop::new);
      stop.routeId = id;
      stop.storeId = entry.storeId();
      stop.sequenceNo = entry.sequence();
      stop.weekday = 0;
      stops.save(stop);
      catalog.setRoute(entry.storeId(), id);
    }
    for (var visit : work) {
      if (visit.day.isBefore(effective) || visit.day.isAfter(end)) continue;
      var entry = definitions.get(visit.storeId);
      boolean selected =
          entry != null && entry.weekdays().contains(visit.day.getDayOfWeek().getValue());
      if (!visit.status.equals("PLANNED") && !visit.status.equals("CANCELLED")) {
        if (!visit.repId.equals(request.repId())) visit.handoverToRepId = request.repId();
        continue;
      }
      if (!selected) visit.status = "CANCELLED";
    }
    var sameNppVisits = visits.findByNppId(route.nppId);
    for (var entry : definitions.values())
      for (var weekday : entry.weekdays()) {
        var day = start.plusDays(weekday - 1);
        if (day.isBefore(effective)) continue;
        var actual =
            work.stream()
                .filter(
                    v ->
                        v.storeId.equals(entry.storeId())
                            && v.day.equals(day)
                            && Set.of("CHECKED_IN", "COMPLETED").contains(v.status))
                .findFirst()
                .orElse(null);
        if (actual != null) continue;
        var slot =
            work.stream()
                .filter(
                    v ->
                        v.storeId.equals(entry.storeId())
                            && v.day.equals(day)
                            && v.status.equals("PLANNED"))
                .findFirst()
                .orElse(null);
        var target =
            sameNppVisits.stream()
                .filter(
                    v ->
                        v.storeId.equals(entry.storeId())
                            && v.day.equals(day)
                            && v.repId.equals(request.repId()))
                .findFirst()
                .orElse(null);
        if (target != null && !id.equals(target.routeId))
          throw BusinessException.conflict(
              "DUPLICATE_VISIT", "Điểm bán đã có lịch ở tuyến khác trong ngày này.");
        if (sameNppVisits.stream()
            .anyMatch(
                v ->
                    v.storeId.equals(entry.storeId())
                        && v.day.equals(day)
                        && v.routeId != null
                        && !id.equals(v.routeId)
                        && !v.status.equals("CANCELLED")))
          throw BusinessException.conflict(
              "DUPLICATE_VISIT", "Điểm bán đã có lượt ghé của tuyến khác trong ngày này.");
        if (target != null && !Set.of("PLANNED", "CANCELLED").contains(target.status)) continue;
        if (target == null) target = slot;
        if (target == null) {
          target = new Visit();
          target.nppId = route.nppId;
          target.storeId = entry.storeId();
          target.day = day;
        }
        if (slot != null && slot != target) slot.status = "CANCELLED";
        target.repId = request.repId();
        target.routeId = id;
        target.status = "PLANNED";
        target.sequenceNo = entry.sequence();
        target.handoverToRepId = null;
        visits.save(target);
      }
    var plan = weeks.findByRouteIdAndWeekStart(id, start).orElseGet(RouteWeekPlan::new);
    plan.routeId = id;
    plan.weekStart = start;
    plan.repId = request.repId();
    plan.effectiveFrom = effective;
    weeks.save(plan);
    route.scheduleMode = "WEEKLY";
    route.organizationId = organization;
    route.updatedAt = Instant.now();
    visits.flush();
    routes.saveAndFlush(route);
    audit.add(
        actors.current().id(),
        "Route",
        id,
        "SAVE_MCP_WEEK",
        SqlRecords.mutable(
            "weekStart",
            start,
            "effectiveFrom",
            effective,
            "repId",
            request.repId(),
            "entries",
            request.entries()));
    return read(id, start);
  }

  public Map<String, Object> routeDto(SalesRoute route) {
    return SqlRecords.mutable(
        "id",
        route.id,
        "name",
        route.name,
        "nppId",
        route.nppId,
        "repId",
        route.repId,
        "organizationId",
        route.organizationId,
        "scheduleMode",
        route.scheduleMode,
        "version",
        route.version);
  }

  public Map<String, Object> place(Long id, Long organizationId, Long version, String reason) {
    jdbc.queryForList("select id from organization_graph_guard where id=1 for update");
    var route = scoped(id);
    route = routes.lockById(route.id).orElseThrow(BusinessException::missing);
    if (version == null || route.version.longValue() != version)
      throw BusinessException.conflict(
          "OPTIMISTIC_LOCK", "Tuyến đã thay đổi. Tải lại trước khi phân vùng.");
    var target = catalog.routeOrganization(organizationId, route.nppId);
    if (!Objects.equals(route.organizationId, target)) {
      var previous = route.organizationId;
      route.organizationId = target;
      routes.saveAndFlush(route);
      audit.add(
          actors.current().id(),
          "SalesRoute",
          id,
          "PLACE_ORGANIZATION",
          SqlRecords.mutable("previous", previous, "organizationId", target, "reason", reason));
    }
    return routeDto(route);
  }

  public void handoverContext(Long nppId, Long from, Long to) {
    jdbc.queryForList("select id from organization_graph_guard where id=1 for update");
    for (var route : routes.findByNppId(nppId))
      if (route.repId.equals(from)) {
        for (var visit : routeVisits(route, members(route.id))) {
          if (visit.routeId == null) visit.routeId = route.id;
          if (!visit.day.isBefore(Dates.today())
              && Set.of("CHECKED_IN", "COMPLETED").contains(visit.status))
            visit.handoverToRepId = to;
        }
        for (var plan : weeks.findAll())
          if (plan.routeId.equals(route.id)
              && plan.repId.equals(from)
              && !plan.weekStart.plusDays(6).isBefore(Dates.today())) plan.repId = to;
      }
  }

  public Map<String, Object> visitDto(Visit visit) {
    var store = catalog.routeStoreReference(visit.storeId, visit.nppId);
    return SqlRecords.mutable(
        "id",
        visit.id,
        "storeId",
        visit.storeId,
        "repId",
        visit.repId,
        "day",
        visit.day,
        "status",
        visit.status,
        "outsideRadius",
        visit.outsideRadius,
        "distanceMetres",
        Objects.requireNonNullElse(visit.distanceMetres, 0D),
        "checkedInAt",
        Objects.toString(visit.checkedInAt, ""),
        "checkedOutAt",
        Objects.toString(visit.checkedOutAt, ""),
        "routeId",
        visit.routeId,
        "sequence",
        visit.sequenceNo,
        "readOnly",
        !visit.repId.equals(actors.current().id()),
        "performedBy",
        actors.visitDisplayName(visit.repId),
        "storeName",
        store.name(),
        "address",
        store.address(),
        "latitude",
        store.latitude(),
        "longitude",
        store.longitude());
  }
}
