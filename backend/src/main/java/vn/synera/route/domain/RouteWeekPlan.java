package vn.synera.route.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import vn.synera.common.BaseEntity;

@Entity
@Table(name = "route_week_plan")
public class RouteWeekPlan extends BaseEntity {
  @Column(name = "route_id", nullable = false)
  public Long routeId;

  @Column(name = "week_start", nullable = false)
  public LocalDate weekStart;

  @Column(name = "effective_from", nullable = false)
  public LocalDate effectiveFrom;

  @Column(name = "rep_id", nullable = false)
  public Long repId;
}
