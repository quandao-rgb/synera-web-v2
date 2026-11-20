package vn.synera.route;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.synera.common.Dates;

/** Narrow reference for Catalog: only today's explicitly assigned, unfinished work. */
@Service
@Transactional(readOnly = true)
public class RouteAccessFacade {
  private final JdbcTemplate jdbc;

  public RouteAccessFacade(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Long> assignedStoreIds(Long repId, Long nppId) {
    return jdbc.queryForList(
        "select distinct store_id from visit where rep_id=? and npp_id=? and business_day=? and"
            + " status in ('PLANNED','CHECKED_IN')",
        Long.class,
        repId,
        nppId,
        java.sql.Date.valueOf(Dates.today()));
  }

  /** References only; Catalog uses this to prevent reparenting routes across NPP boundaries. */
  public List<java.util.Map<String, Object>> organizationReferences(java.util.Set<Long> ids) {
    if (ids.isEmpty()) return List.of();
    return jdbc.queryForList(
        "select id,npp_id,organization_id from route where organization_id in ("
            + String.join(",", java.util.Collections.nCopies(ids.size(), "?"))
            + ")",
        ids.toArray());
  }
}
