package vn.synera;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import vn.synera.integration.OtpDeliveryFacade;

class OtpProfileTest {
  OtpDeliveryFacade delivery(String... profiles) {
    var environment = new MockEnvironment();
    environment.setActiveProfiles(profiles);
    return new OtpDeliveryFacade(
        new DefaultListableBeanFactory().getBeanProvider(JavaMailSender.class),
        "local",
        "",
        "",
        environment);
  }

  @Test
  void explicitSharedTestKeepsExistingAccountsUsableWithoutClaimingEmailDelivery() {
    var service = delivery("shared-test");
    assertTrue(service.local());
    assertDoesNotThrow(service::assertAvailable);
  }

  @Test
  void productionAndUnspecifiedEnvironmentsCannotUseTestOtpEvenWithMixedProfiles() {
    assertThrows(IllegalStateException.class, () -> delivery());
    assertThrows(IllegalStateException.class, () -> delivery("prod"));
    assertThrows(IllegalStateException.class, () -> delivery("shared-test", "prod"));
    assertDoesNotThrow(() -> delivery("local"));
  }
}
