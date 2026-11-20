package vn.synera.route.repo;

import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.synera.route.domain.RouteWeekPlan;

public interface RouteWeekPlanRepository extends JpaRepository<RouteWeekPlan, Long> {
  Optional<RouteWeekPlan> findByRouteIdAndWeekStart(Long routeId, LocalDate weekStart);
}
