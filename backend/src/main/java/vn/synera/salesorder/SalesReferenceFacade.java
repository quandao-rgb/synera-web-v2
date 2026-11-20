package vn.synera.salesorder;

import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.synera.common.BusinessException;
import vn.synera.iam.ActorFacade;

/** Scoped reference reads avoid a SalesFacade -> TicketFacade -> SalesFacade cycle. */
@Service
public class SalesReferenceFacade {
  private final JdbcTemplate jdbc;
  private final ActorFacade actors;

  public SalesReferenceFacade(JdbcTemplate jdbc, ActorFacade actors) {
    this.jdbc = jdbc;
    this.actors = actors;
  }

  public void validate(Long nppId, Long storeId, Long orderId, Long lineId) {
    var rows =
        jdbc.queryForList("select npp_id,store_id,rep_id from sales_order where id=?", orderId);
    if (rows.isEmpty()) throw BusinessException.missing();
    var row = rows.get(0);
    if (!Objects.equals(((Number) row.get("npp_id")).longValue(), nppId)
        || storeId != null && !Objects.equals(((Number) row.get("store_id")).longValue(), storeId))
      throw BusinessException.missing();
    actors.assertOwnRep(((Number) row.get("rep_id")).longValue());
    if (lineId != null
        && jdbc.queryForObject(
                "select count(*) from sales_order_line where id=? and order_id=?",
                Integer.class,
                lineId,
                orderId)
            != 1) throw BusinessException.missing();
  }

  public boolean hasUnresolvedShortage(Long orderId) {
    int missing =
        jdbc.queryForObject(
            "select count(*) from sales_order_line l where l.order_id=? and l.qty_shipped >"
                + " l.qty_received + coalesce((select sum(rl.qty_received) from"
                + " sales_replacement_line rl join sales_replacement r on r.id=rl.replacement_id"
                + " where rl.order_line_id=l.id and r.status='RECEIVED'),0)",
            Integer.class,
            orderId);
    int waiting =
        jdbc.queryForObject(
            "select count(*) from sales_replacement where order_id=? and status <> 'CANCELLED' and"
                + " notified_at is null",
            Integer.class,
            orderId);
    return missing > 0 || waiting > 0;
  }
}
