package vn.synera;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@EnabledIfEnvironmentVariable(named = "SYNERA_MYSQL_TEST_URL", matches = ".+")
class RouteMcpMySqlTest extends RouteMcpIntegrationTest {
  @DynamicPropertySource
  static void mysql(DynamicPropertyRegistry properties) {
    String url = System.getenv("SYNERA_MYSQL_TEST_URL");
    if (url == null
        || !url.matches("jdbc:mysql://127\\.0\\.0\\.1:3308/synera_npp_verify_[a-f0-9]+(?:\\?.*)?"))
      throw new IllegalArgumentException("Use an isolated synera_npp_verify_* database");
    properties.add("spring.datasource.url", () -> url);
    properties.add("spring.datasource.username", () -> "synera_test");
    properties.add("spring.datasource.password", () -> System.getenv("SYNERA_MYSQL_TEST_PASSWORD"));
    properties.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
    properties.add(
        "spring.flyway.locations",
        () -> "classpath:db/mysql-bootstrap,classpath:db/updates,classpath:db/mysql-updates");
    properties.add("spring.flyway.user", () -> "root");
    properties.add(
        "spring.flyway.password", () -> System.getenv("SYNERA_MYSQL_TEST_MIGRATION_PASSWORD"));
  }
}
