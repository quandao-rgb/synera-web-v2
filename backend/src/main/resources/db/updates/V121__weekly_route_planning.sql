ALTER TABLE route ADD COLUMN organization_id BIGINT NULL;
ALTER TABLE route ADD COLUMN schedule_mode VARCHAR(20) NOT NULL DEFAULT 'RECURRING';
ALTER TABLE visit ADD COLUMN route_id BIGINT NULL;
ALTER TABLE visit ADD COLUMN sequence_no INT NOT NULL DEFAULT 0;
ALTER TABLE visit ADD COLUMN handover_to_rep_id BIGINT NULL;
CREATE INDEX ix_visit_route_day ON visit (route_id, business_day);
CREATE INDEX ix_visit_handover_day ON visit (handover_to_rep_id, business_day);
CREATE TABLE route_week_plan (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  route_id BIGINT NOT NULL,
  week_start DATE NOT NULL,
  effective_from DATE NOT NULL,
  rep_id BIGINT NOT NULL,
  UNIQUE (route_id, week_start)
);
