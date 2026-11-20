package vn.synera.config;

import java.util.Map;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Handshake used by existing IPA builds; never returns datasource or system details. */
@RestController
public class MobileHealthController {
  private final HealthEndpoint health;

  public MobileHealthController(HealthEndpoint health) {
    this.health = health;
  }

  @GetMapping("/health")
  public ResponseEntity<Map<String, Object>> health() {
    boolean ready = Status.UP.equals(health.health().getStatus());
    return ResponseEntity.status(ready ? 200 : 503)
        .body(Map.of("service", "SYNERA Sales API", "ready", ready));
  }
}
