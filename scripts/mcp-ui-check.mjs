import { expect } from '@playwright/test';
import fs from 'node:fs';
import { base, browser, login, token, command, password } from './browser-session.mjs';

// This suite creates ordinary business records ONLY on the disposable audit runtime.
if (base !== 'http://127.0.0.1:8091')
  throw Error('Use TEST_URL=http://127.0.0.1:8091 (isolated database)');
const instance = await browser();
const context = await instance.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
fs.mkdirSync('artifacts/mcp', { recursive: true });
const go = async (path) => {
  await page.goto(base + '/#' + path);
  await expect(page.locator('.loading')).toHaveCount(0, { timeout: 30000 });
};
const get = async (access, path) => {
  const response = await context.request.get(base + '/api/v1' + path, {
    headers: { Authorization: 'Bearer ' + access },
  });
  expect(response.ok(), path).toBeTruthy();
  return (await response.json()).data;
};
const laneStyle = () =>
  page
    .locator('.work-lane')
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(
        [
          'borderRadius',
          'padding',
          'minHeight',
          'fontFamily',
          'transitionDuration',
          'boxShadow',
        ].map((key) => [key, style[key]]),
      );
    });
try {
  const access = await token(context.request, 'admin@synera.local');
  const primary = await token(context.request, 'sales@synera.local');
  const identity = await get(primary, '/auth/me');
  const suffix = Date.now();
  const email = `quocbao.${suffix}@example.local`;
  const substitute = await command(context.request, access, '/admin/users', {
    username: email,
    name: 'Lê Quốc Bảo',
    password,
    role: 'SALES',
    nppId: identity.nppId,
  });
  const network = await get(access, '/manufacturer/network');
  let parent = identity.nppId;
  for (const [type, name] of [
    ['REGION', 'Miền Nam'],
    ['PROVINCE', 'TP. Hồ Chí Minh'],
    ['SALES_REGION', 'Vùng Phan Xích Long'],
  ]) {
    const existing = network.organizations.find(
      (node) => node.type === type && node.parentId === parent && node.region === 'SOUTH',
    );
    if (existing) {
      parent = existing.id;
      continue;
    }
    parent = (
      await command(context.request, access, '/organizations/nodes', {
        code: `U${suffix}_${type}`,
        name,
        type,
        parentId: parent,
        region: 'SOUTH',
      })
    ).id;
  }
  const outlets = [];
  for (const [index, name] of [
    'Tạp hóa Hồng Phúc',
    'Cửa hàng Minh Châu',
    'Tạp hóa Gia Bảo',
  ].entries()) {
    outlets.push(
      await command(context.request, access, '/stores', {
        nppId: identity.nppId,
        repId: identity.id,
        name,
        owner: 'Nguyễn Minh',
        phone: `09${String(suffix + index).slice(-8)}`,
        address: `${42 + index * 10} Phan Xích Long, Phú Nhuận, TP. Hồ Chí Minh`,
        latitude: 10.8,
        longitude: 106.68,
      }),
    );
  }
  const route = await command(context.request, access, '/routes/weekly', {
    nppId: identity.nppId,
    repId: identity.id,
    name: 'Phú Nhuận buổi sáng',
    organizationId: parent,
    storeIds: outlets.map((s) => s.id),
  });
  await login(page, 'admin@synera.local');
  await go('/dashboard');
  const nsxLane = await laneStyle();
  await expect(page.locator('.work-lane')).toHaveCount(4);
  await page.locator('.sidebar-parent').filter({ hasText: 'Mạng lưới' }).click();
  await expect(page.locator('.sidebar-child').filter({ hasText: 'Tổ chức & vùng' })).toBeVisible();
  await page.locator('.sidebar-child').filter({ hasText: 'Tổ chức & vùng' }).click();
  await expect(page.locator('.org-chart')).toBeVisible();
  expect(await page.locator('.org-node-card').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('.org-level-labels span')).toHaveCount(6);
  await expect(page.locator('.related-links,.nsx-related-links,.context-links')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/mcp/organization-desktop.png', fullPage: true });
  await page.locator('.org-route-card').filter({ hasText: route.name }).click();
  await expect(page.locator('.mcp-editor')).toBeVisible();
  await expect(page.locator('.sidebar-child[aria-current=page]')).toHaveText('Tuyến bán hàng');
  const date = await page.locator('.mcp-assignment-fields input[type=date]').inputValue();
  const weekday = new Date(date + 'T00:00:00Z').getUTCDay() || 7;
  for (const outlet of outlets)
    await page
      .locator('.mcp-edit-table tbody tr')
      .filter({ hasText: outlet.name })
      .locator('input[type=checkbox]')
      .nth(weekday - 1)
      .check();
  // A focus refresh must not discard edits (the shared API hook normally refreshes on focus).
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.mcp-edit-table input:checked')).toHaveCount(outlets.length);
  await page.getByRole('button', { name: 'Lưu & giao lịch tuần' }).click();
  await expect(page.locator('.mcp-list-tools')).toContainText('Đã đồng bộ');
  const assigned = (await get(primary, '/visits/today')).filter((v) => v.routeId === route.id);
  expect(assigned).toHaveLength(3);
  await command(context.request, primary, `/visits/${assigned[0].id}/check-in`, {
    latitude: 10.8,
    longitude: 106.68,
  });
  await command(context.request, primary, `/visits/${assigned[0].id}/check-out`, {
    reason: 'Đã trao đổi nhu cầu bổ sung hàng',
  });
  await page.reload();
  await page.getByRole('button', { name: 'Thiết lập MCP', exact: true }).first().click();
  await expect(page.locator('.mcp-editor')).toBeVisible();
  await page.locator('.mcp-assignment-fields select').first().selectOption(String(substitute.id));
  await page.getByRole('button', { name: 'Lưu & giao lịch tuần' }).click();
  await expect(page.locator('.mcp-list-tools')).toContainText('Đã đồng bộ');
  const secondary = await token(context.request, email);
  const continued = (await get(secondary, '/visits/today')).filter((v) => v.routeId === route.id);
  expect(continued.filter((v) => v.readOnly && v.status === 'COMPLETED')).toHaveLength(1);
  expect(continued.filter((v) => !v.readOnly && v.status === 'PLANNED')).toHaveLength(2);
  await page.screenshot({ path: 'artifacts/mcp/schedule-desktop.png', fullPage: true });
  const currentWeek = await page.locator('.mcp-week-picker input').inputValue();
  await page.getByRole('button', { name: 'Tuần sau', exact: true }).click();
  await expect(page.locator('.mcp-week-picker input')).not.toHaveValue(currentWeek);
  await page.getByRole('button', { name: 'Sao chép tuần trước' }).click();
  await expect(page.locator('.mcp-edit-table input:checked')).toHaveCount(3);
  await page.getByRole('button', { name: 'Lưu & giao lịch tuần' }).click();
  await expect(page.locator('.mcp-list-tools')).toContainText('Đã đồng bộ');
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBeTruthy();
    if (width === 390) {
      await expect
        .poll(() =>
          page.locator('.sidebar').evaluate((el) => Math.round(el.getBoundingClientRect().right)),
        )
        .toBeLessThanOrEqual(0);
      expect(
        await page
          .locator('.mcp-assignment-fields')
          .evaluate((el) =>
            [...el.querySelectorAll('input,select')].every(
              (field) =>
                field.getBoundingClientRect().right <= el.getBoundingClientRect().right + 1,
            ),
          ),
      ).toBeTruthy();
    }
    await page.screenshot({ path: `artifacts/mcp/schedule-${width}.png`, fullPage: true });
    if (width === 900) {
      const parentButton = page.locator('.sidebar-parent').filter({ hasText: 'Mạng lưới' });
      await parentButton.click();
      await expect(page.locator('.sidebar-submenu.expanded')).toBeVisible();
      const rect = await page.locator('.sidebar-submenu.expanded').boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(68);
      await page.keyboard.press('Escape');
      await expect(parentButton).toBeFocused();
    } else {
      await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
      const parentButton = page.locator('.sidebar-parent').filter({ hasText: 'Mạng lưới' });
      if ((await parentButton.getAttribute('aria-expanded')) !== 'true') await parentButton.click();
      await page.locator('.sidebar-child').filter({ hasText: 'Điểm bán', exact: true }).click();
      await expect(page.locator('.sidebar.open')).toHaveCount(0);
      await expect(page).toHaveURL(/view=stores/);
    }
  }
  const nppContext = await instance.newContext({ viewport: { width: 1440, height: 1000 } });
  const npp = await nppContext.newPage();
  await login(npp, 'npp@synera.local');
  await expect(npp.locator('.work-lane')).toHaveCount(4);
  const nppStyle = await npp
    .locator('.work-lane')
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return Object.fromEntries(
        [
          'borderRadius',
          'padding',
          'minHeight',
          'fontFamily',
          'transitionDuration',
          'boxShadow',
        ].map((k) => [k, s[k]]),
      );
    });
  expect(nppStyle).toEqual(nsxLane);
  await npp.locator('.sidebar-parent').filter({ hasText: 'Điểm bán & CRM' }).click();
  await npp.locator('.sidebar-child').filter({ hasText: 'Lịch hẹn', exact: true }).click();
  await expect(npp).toHaveURL(/view=appointments/);
  await npp.locator('.sidebar-child').filter({ hasText: 'Cơ hội bán hàng', exact: true }).click();
  await expect(npp.getByRole('heading', { level: 1 })).toHaveText('Cơ hội bán hàng');
  await npp.goto(base + '/#/dashboard');
  await expect(npp.locator('.work-lane')).toHaveCount(4);
  await npp.screenshot({ path: 'artifacts/mcp/npp-desktop.png', fullPage: true });
  await npp.emulateMedia({ reducedMotion: 'reduce' });
  await npp.locator('.work-lane').first().hover();
  expect(
    await npp
      .locator('.work-lane')
      .first()
      .evaluate((el) => getComputedStyle(el).transform),
  ).toBe('none');
  expect(errors).toEqual([]);
  fs.writeFileSync(
    'artifacts/mcp/ui-result.json',
    JSON.stringify(
      {
        routeId: route.id,
        substituteId: substitute.id,
        substituteEmail: email,
        stores: outlets.map((s) => s.id),
        readOnlyCompleted: 1,
        pendingForReplacement: 2,
        sharedCardStyle: nsxLane,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS NSX tree → weekly MCP → Sales assignment → preserved completed context; copy week; sidebar desktop/tablet/mobile; NPP query navigation; shared card styles; reduced motion',
  );
} finally {
  await instance.close();
}
