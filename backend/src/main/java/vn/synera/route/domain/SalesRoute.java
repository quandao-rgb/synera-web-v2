package vn.synera.route.domain;

import jakarta.persistence.*;
import java.time.*;
import vn.synera.common.BaseEntity;

@Entity
@Table(name = "route")
public class SalesRoute extends BaseEntity {
  @Column(name = "npp_id", nullable = false)
  public Long nppId;

  @Column(name = "rep_id", nullable = false)
  public Long repId;

  @Column(name = "name", nullable = false)
  public String name;

  @Column(name = "organization_id")
  public Long organizationId;

  @Column(name = "schedule_mode", nullable = false)
  public String scheduleMode = "RECURRING";
}
