package vn.synera.sellin;

import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.synera.common.BusinessException;

/** Read-only document boundary used by ticket validation; no dependency on ticket services. */
@Service
public class SellInReferenceFacade {
  private final JdbcTemplate jdbc;
  private final vn.synera.closing.ReconciliationFacade reconciliation;

  public SellInReferenceFacade(
      JdbcTemplate jdbc, vn.synera.closing.ReconciliationFacade reconciliation) {
    this.jdbc = jdbc;
    this.reconciliation = reconciliation;
  }

  public void validate(Long nppId, Long orderId, Long lineId) {
    var rows = jdbc.queryForList("select npp_id from sell_in_order where id=?", orderId);
    if (rows.isEmpty() || !Objects.equals(((Number) rows.get(0).get("npp_id")).longValue(), nppId))
      throw BusinessException.missing();
    if (lineId != null
        && jdbc.queryForObject(
                "select count(*) from sell_in_order_line where id=? and order_id=?",
                Integer.class,
                lineId,
                orderId)
            != 1) throw BusinessException.missing();
  }

  public boolean hasUnresolvedShortage(Long orderId) {
    return reconciliation.unresolved(orderId);
  }
}
