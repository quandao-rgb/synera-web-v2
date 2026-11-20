package vn.synera;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;
import vn.synera.common.Dates;

@SpringBootTest(
    properties =
        "spring.datasource.url=jdbc:h2:mem:route_mcp;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RouteMcpIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
  @Autowired jakarta.persistence.EntityManager entityManager;
  String admin, sales, replacement;
  long rep, substitute, area;
  final LocalDate day = Dates.today();
  final LocalDate monday =
      day.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

  JsonNode call(String token, String method, String path, Object body, int expected, String key)
      throws Exception {
    var request =
        MockMvcRequestBuilders.request(
                org.springframework.http.HttpMethod.valueOf(method), "/api/v1" + path)
            .contentType(MediaType.APPLICATION_JSON);
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (key != null) request.header("Idempotency-Key", key);
    if (body != null) request.content(json.writeValueAsBytes(body));
    var response = mvc.perform(request).andReturn().getResponse();
    assertEquals(
        expected, response.getStatus(), method + " " + path + ": " + response.getContentAsString());
    return json.readTree(response.getContentAsByteArray()).path("data");
  }

  JsonNode get(String token, String path) throws Exception {
    return call(token, "GET", path, null, 200, null);
  }

  JsonNode post(String token, String path, Object body) throws Exception {
    return call(token, "POST", path, body, 200, UUID.randomUUID().toString());
  }

  String login(String username) throws Exception {
    var result =
        post(null, "/auth/login", Map.of("username", username, "password", "TestPassword2026!"));
    if (result.path("requiresOtp").asBoolean())
      result =
          post(
              null,
              "/auth/otp/verify",
              Map.of(
                  "challengeId",
                  result.path("challengeId").asLong(),
                  "code",
                  result.path("localOtp").asText()));
    return result.path("accessToken").asText();
  }

  @BeforeEach
  void identities() throws Exception {
    admin = login("admin@synera.local");
    sales = login("sales@synera.local");
    rep = get(sales, "/auth/me").path("id").asLong();
    String email = "quocbao-" + UUID.randomUUID() + "@example.local";
    substitute =
        post(
                admin,
                "/admin/users",
                Map.of(
                    "username",
                    email,
                    "name",
                    "Lê Quốc Bảo",
                    "password",
                    "TestPassword2026!",
                    "role",
                    "SALES",
                    "nppId",
                    2))
            .path("id")
            .asLong();
    replacement = login(email);
    long region = unit("REGION", 2, "SOUTH", "Miền Nam");
    long province = unit("PROVINCE", region, "SOUTH", "TP. Hồ Chí Minh");
    area = unit("SALES_REGION", province, "SOUTH", "Vùng Phú Nhuận 01");
  }

  long unit(String type, long parent, String region, String name) throws Exception {
    return post(
            admin,
            "/organizations/nodes",
            Map.of(
                "code",
                "U_" + UUID.randomUUID().toString().replace("-", ""),
                "name",
                name,
                "type",
                type,
                "parentId",
                parent,
                "region",
                region))
        .path("id")
        .asLong();
  }

  long store(String name) throws Exception {
    return post(
            admin,
            "/stores",
            Map.of(
                "nppId",
                2,
                "repId",
                rep,
                "name",
                name,
                "owner",
                "Nguyễn Minh",
                "phone",
                "09"
                    + String.format(
                        "%08d",
                        Math.floorMod(UUID.randomUUID().getLeastSignificantBits(), 100000000)),
                "address",
                "Phan Xích Long, TP. Hồ Chí Minh",
                "latitude",
                10.8,
                "longitude",
                106.68))
        .path("id")
        .asLong();
  }

  long route(List<Long> stores) throws Exception {
    return post(
            admin,
            "/routes/weekly",
            Map.of(
                "nppId",
                2,
                "repId",
                rep,
                "name",
                "Phú Nhuận buổi sáng",
                "organizationId",
                area,
                "storeIds",
                stores))
        .path("id")
        .asLong();
  }

  JsonNode schedule(long route, LocalDate week) throws Exception {
    return get(admin, "/routes/" + route + "/mcp?weekStart=" + week);
  }

  Map<String, Object> payload(
      long route,
      LocalDate week,
      LocalDate effective,
      long actor,
      List<Long> stores,
      List<Integer> days)
      throws Exception {
    var data = schedule(route, week);
    var entries = new ArrayList<Map<String, Object>>();
    for (int i = 0; i < stores.size(); i++)
      entries.add(Map.of("storeId", stores.get(i), "sequence", i + 1, "weekdays", days));
    return Map.of(
        "weekStart",
        week,
        "effectiveFrom",
        effective,
        "repId",
        actor,
        "organizationId",
        area,
        "version",
        data.path("route").path("version").asLong(),
        "entries",
        entries);
  }

  JsonNode visit(String token, long store) throws Exception {
    for (var value : get(token, "/visits/today"))
      if (value.path("storeId").asLong() == store) return value;
    throw new AssertionError("Missing assigned visit");
  }

  @Test
  void explicitWeekPublishesOnceAndUsesSameVisitOnIdempotentRetry() throws Exception {
    long store = store("Tạp hóa Hồng Phúc"), route = route(List.of(store));
    var request =
        payload(route, monday, day, rep, List.of(store), List.of(day.getDayOfWeek().getValue()));
    String key = UUID.randomUUID().toString();
    var first = call(admin, "POST", "/routes/" + route + "/mcp", request, 200, key);
    var again = call(admin, "POST", "/routes/" + route + "/mcp", request, 200, key);
    assertEquals(first, again);
    assertEquals("PLANNED", visit(sales, store).path("status").asText());
    assertEquals(
        1,
        jdbc.queryForObject(
            "select count(*) from visit where route_id=? and store_id=? and status='PLANNED'",
            Integer.class,
            route,
            store));
    call(admin, "POST", "/routes/" + route + "/mcp", request, 409, UUID.randomUUID().toString());
  }

  @Test
  void replacingSalesMovesOnlyUnvisitedWorkAndPreservesCompletedPerformer() throws Exception {
    long completed = store("Tạp hóa Thanh Hà"), remaining = store("Cửa hàng Minh Châu");
    long route = route(List.of(completed, remaining));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(
            route,
            monday,
            day,
            rep,
            List.of(completed, remaining),
            List.of(day.getDayOfWeek().getValue())));
    long id = visit(sales, completed).path("id").asLong();
    post(sales, "/visits/" + id + "/check-in", Map.of("latitude", 10.8, "longitude", 106.68));
    var before = post(sales, "/visits/" + id + "/check-out", Map.of("reason", ""));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(
            route,
            monday,
            day,
            substitute,
            List.of(completed, remaining),
            List.of(day.getDayOfWeek().getValue())));
    var historic = visit(replacement, completed);
    assertEquals(rep, historic.path("repId").asLong());
    assertEquals("COMPLETED", historic.path("status").asText());
    assertTrue(historic.path("readOnly").asBoolean());
    assertEquals(before.path("checkedInAt"), historic.path("checkedInAt"));
    assertEquals(before.path("checkedOutAt"), historic.path("checkedOutAt"));
    assertEquals(substitute, visit(replacement, remaining).path("repId").asLong());
    assertEquals(remaining, get(replacement, "/stores/" + remaining).path("id").asLong());
    call(
        replacement,
        "POST",
        "/visits/" + id + "/check-out",
        Map.of("reason", ""),
        422,
        UUID.randomUUID().toString());
    call(replacement, "GET", "/stores/" + completed, null, 404, null);
  }

  @Test
  void currentPerformerCanFinishAnActiveVisitAfterReplacementIsAssigned() throws Exception {
    long store = store("Tạp hóa Gia Bảo"), route = route(List.of(store));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(route, monday, day, rep, List.of(store), List.of(day.getDayOfWeek().getValue())));
    long id = visit(sales, store).path("id").asLong();
    post(sales, "/visits/" + id + "/check-in", Map.of("latitude", 10.8, "longitude", 106.68));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(
            route,
            monday,
            day,
            substitute,
            List.of(store),
            List.of(day.getDayOfWeek().getValue())));
    assertTrue(visit(replacement, store).path("readOnly").asBoolean());
    assertEquals(
        "COMPLETED",
        post(sales, "/visits/" + id + "/check-out", Map.of("reason", "")).path("status").asText());
    assertEquals(rep, visit(replacement, store).path("repId").asLong());
  }

  @Test
  void clearingThisWeekDoesNotCancelAnotherWeekAndCannotRewritePastWork() throws Exception {
    long store = store("Cửa hàng An Khang"), route = route(List.of(store));
    var future = monday.plusWeeks(1);
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(route, future, future, rep, List.of(store), List.of(1)));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(
            route,
            monday,
            day,
            substitute,
            List.of(store),
            List.of(day.getDayOfWeek().getValue())));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(route, monday, day, substitute, List.of(store), List.of()));
    assertFalse(
        get(replacement, "/visits/today")
            .findValuesAsText("storeId")
            .contains(Long.toString(store)));
    assertEquals(1, schedule(route, future).path("entries").get(0).path("weekdays").size());
    call(
        admin,
        "POST",
        "/routes/" + route + "/mcp",
        payload(route, monday, day.minusDays(1), rep, List.of(store), List.of(1)),
        422,
        UUID.randomUUID().toString());
  }

  @Test
  void rejectsDuplicateStoresAndARepFromAnotherNppWithoutChangingTheWeek() throws Exception {
    long store = store("Tạp hóa Bảo Trân"), route = route(List.of(store));
    var request =
        new HashMap<>(payload(route, monday, day, rep, List.of(store, store), List.of(1)));
    call(admin, "POST", "/routes/" + route + "/mcp", request, 422, UUID.randomUUID().toString());
    String email = "other-npp-" + UUID.randomUUID() + "@example.local";
    long foreign =
        post(
                admin,
                "/admin/users",
                Map.of(
                    "username",
                    email,
                    "name",
                    "Nguyễn Thành Nam",
                    "password",
                    "TestPassword2026!",
                    "role",
                    "SALES",
                    "nppId",
                    3))
            .path("id")
            .asLong();
    request = new HashMap<>(payload(route, monday, day, rep, List.of(store), List.of(1)));
    request.put("repId", foreign);
    call(admin, "POST", "/routes/" + route + "/mcp", request, 422, UUID.randomUUID().toString());
    assertEquals(
        0,
        jdbc.queryForObject(
            "select count(*) from route_week_plan where route_id=?", Integer.class, route));
    call(sales, "POST", "/routes/" + route + "/mcp", request, 403, UUID.randomUUID().toString());
  }

  @Test
  void supportsManyRegionsPerNppAndManyNppsInTheSameRegionWithoutCrossAssignment()
      throws Exception {
    long north = unit("REGION", 2, "NORTH", "Miền Bắc");
    long hanoi = unit("PROVINCE", north, "NORTH", "Hà Nội");
    long ownNorth = unit("SALES_REGION", hanoi, "NORTH", "Vùng Cầu Giấy 01");
    long otherNorth = unit("REGION", 3, "NORTH", "Miền Bắc");
    long otherHanoi = unit("PROVINCE", otherNorth, "NORTH", "Hà Nội");
    long foreignArea = unit("SALES_REGION", otherHanoi, "NORTH", "Vùng Cầu Giấy 02");
    long store = store("Cửa hàng Phương Linh"), route = route(List.of(store));
    var request =
        new HashMap<>(
            payload(
                route, monday, day, rep, List.of(store), List.of(day.getDayOfWeek().getValue())));
    request.put("organizationId", ownNorth);
    post(admin, "/routes/" + route + "/mcp", request);
    assertEquals(ownNorth, schedule(route, monday).path("route").path("organizationId").asLong());
    request =
        new HashMap<>(
            payload(
                route, monday, day, rep, List.of(store), List.of(day.getDayOfWeek().getValue())));
    request.put("organizationId", foreignArea);
    call(admin, "POST", "/routes/" + route + "/mcp", request, 422, UUID.randomUUID().toString());
    request.put("organizationId", 2);
    call(admin, "POST", "/routes/" + route + "/mcp", request, 422, UUID.randomUUID().toString());
    assertEquals(ownNorth, schedule(route, monday).path("route").path("organizationId").asLong());
    String npp = login("npp@synera.local");
    var visible = get(npp, "/organizations/tree");
    var ids = new HashSet<Long>();
    visible.forEach(node -> ids.add(node.path("id").asLong()));
    assertTrue(ids.contains(area));
    assertTrue(ids.contains(ownNorth));
    assertFalse(ids.contains(foreignArea));
  }

  @Test
  void rejectsSkippedLevelsCyclesMismatchedRegionsAndDuplicateRegionPerNpp() throws Exception {
    for (var bad :
        List.of(
            Map.of("type", "REGION", "parentId", 1, "region", "SOUTH"),
            Map.of("type", "PROVINCE", "parentId", 2, "region", "SOUTH"),
            Map.of("type", "SALES_REGION", "parentId", 1, "region", "NORTH"),
            Map.of("type", "BUSINESS_UNIT", "parentId", 1, "region", "SOUTH"))) {
      var body = new HashMap<String, Object>(bad);
      body.put("code", "BAD_" + UUID.randomUUID().toString().replace("-", ""));
      body.put("name", "Đơn vị sai cấp");
      call(admin, "POST", "/organizations/nodes", body, 422, UUID.randomUUID().toString());
    }
    var selected = jdbc.queryForMap("select parent_id,version from organization where id=?", area);
    call(
        admin,
        "POST",
        "/organizations/" + area,
        Map.of(
            "name",
            "Vùng Phú Nhuận",
            "region",
            "SOUTH",
            "parentId",
            area,
            "version",
            selected.get("version")),
        422,
        UUID.randomUUID().toString());
    call(
        admin,
        "POST",
        "/organizations/nodes",
        Map.of(
            "code",
            "MISMATCH",
            "name",
            "Vùng sai miền",
            "type",
            "SALES_REGION",
            "parentId",
            selected.get("parent_id"),
            "region",
            "NORTH"),
        422,
        UUID.randomUUID().toString());
    call(
        admin,
        "POST",
        "/organizations/nodes",
        Map.of(
            "code",
            "DUP_REGION",
            "name",
            "Miền Nam",
            "type",
            "REGION",
            "parentId",
            2,
            "region",
            "SOUTH"),
        422,
        UUID.randomUUID().toString());
  }

  @Test
  void placingLegacyRouteDoesNotChangeVisitsStopsOrSalesAndRejectsStaleOrForeignTargets()
      throws Exception {
    long store = store("Tạp hóa Thanh Bình"), route = route(List.of(store));
    post(
        admin,
        "/routes/" + route + "/mcp",
        payload(route, monday, day, rep, List.of(store), List.of(day.getDayOfWeek().getValue())));
    var visitsBefore = jdbc.queryForList("select * from visit where route_id=? order by id", route);
    var stopsBefore =
        jdbc.queryForList("select * from route_stop where route_id=? order by id", route);
    long version = schedule(route, monday).path("route").path("version").asLong();
    jdbc.update("update route set organization_id=null where id=?", route);
    entityManager.flush();
    entityManager.clear();
    var request =
        Map.of("organizationId", area, "version", version, "reason", "Sắp xếp đúng vùng bán hàng");
    String key = UUID.randomUUID().toString();
    var placed = call(admin, "POST", "/routes/" + route + "/organization", request, 200, key);
    assertEquals(
        placed, call(admin, "POST", "/routes/" + route + "/organization", request, 200, key));
    assertEquals(area, placed.path("organizationId").asLong());
    assertEquals(
        area,
        jdbc.queryForObject("select organization_id from route where id=?", Long.class, route));
    assertEquals(rep, placed.path("repId").asLong());
    call(
        admin,
        "POST",
        "/routes/" + route + "/organization",
        request,
        409,
        UUID.randomUUID().toString());
    call(
        admin,
        "POST",
        "/routes/" + route + "/organization",
        Map.of("organizationId", 3, "version", placed.path("version").asLong()),
        422,
        UUID.randomUUID().toString());
    assertEquals(
        visitsBefore, jdbc.queryForList("select * from visit where route_id=? order by id", route));
    assertEquals(
        stopsBefore,
        jdbc.queryForList("select * from route_stop where route_id=? order by id", route));
  }

  @Test
  void refusesToMoveARegionWithRoutesUnderAnotherNpp() throws Exception {
    long store = store("Cửa hàng Hồng Hà"), route = route(List.of(store));
    long province =
        jdbc.queryForObject("select parent_id from organization where id=?", Long.class, area);
    long region =
        jdbc.queryForObject("select parent_id from organization where id=?", Long.class, province);
    long version =
        jdbc.queryForObject("select version from organization where id=?", Long.class, region);
    call(
        admin,
        "POST",
        "/organizations/" + region,
        Map.of("name", "Miền Nam", "region", "SOUTH", "parentId", 3, "version", version),
        422,
        UUID.randomUUID().toString());
    assertEquals(
        2L,
        jdbc.queryForObject("select parent_id from organization where id=?", Long.class, region));
    assertEquals(area, schedule(route, monday).path("route").path("organizationId").asLong());
  }
}
