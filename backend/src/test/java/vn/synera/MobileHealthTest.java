package vn.synera;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthEndpoint;
import vn.synera.config.MobileHealthController;

class MobileHealthTest {
  @Test
  void existingIpaHandshakeReflectsReadinessWithoutExposingDatabaseDetails() {
    var endpoint = mock(HealthEndpoint.class);
    var controller = new MobileHealthController(endpoint);
    when(endpoint.health()).thenReturn(Health.up().withDetail("private", "hidden").build());
    var up = controller.health();
    assertEquals(200, up.getStatusCode().value());
    assertEquals(Map.of("service", "SYNERA Sales API", "ready", true), up.getBody());
    when(endpoint.health()).thenReturn(Health.down().withDetail("database", "hidden").build());
    var down = controller.health();
    assertEquals(503, down.getStatusCode().value());
    assertEquals(Map.of("service", "SYNERA Sales API", "ready", false), down.getBody());
  }
}
