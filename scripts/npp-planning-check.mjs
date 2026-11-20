import { chromium, expect } from '@playwright/test';
import { login, base } from './browser-session.mjs';
import fs from 'node:fs';
const output = 'artifacts/local-real-integration';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [],
  apiErrors = [],
  writes = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (
    r.url().includes('/api/v1/') &&
    r.status() >= 400 &&
    !r.url().includes('/auth/session/refresh')
  )
    apiErrors.push(`${r.status()} ${new URL(r.url()).pathname}`);
});
page.on('request', (r) => {
  if (
    r.method() !== 'GET' &&
    /\/api\/v1\/(delivery-trips|interactions|quotations|sales-orders)(\/|\?|$)/.test(r.url())
  )
    writes.push(r.url());
});
try {
  await login(page, 'npp@synera.local');
  await page.locator('.sidebar').getByRole('button', { name: 'Đơn hàng', exact: true }).click();
  await page.locator('.sidebar').getByRole('link', { name: 'Chuyến giao', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Đơn chờ xếp chuyến', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Đề xuất gom đơn', exact: true })).toBeVisible();
  await expect(page.locator('.planning-order-choice input')).toHaveCount(2);
  await expect(page.getByText('2 đơn đã chọn', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/delivery-menu-desktop.png`, fullPage: true });
  for (const box of await page.locator('.planning-order-choice input').all()) await box.uncheck();
  await expect(
    page.getByRole('button', { name: 'Chốt ngày & lập chuyến', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Gom đơn hàng', exact: true }).click();
  await expect(page.getByText('2 đơn đã chọn', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chốt ngày & lập chuyến', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm.getByLabel('Tài xế', { exact: true })).toBeVisible();
  await expect(
    confirm.getByRole('button', { name: 'Lập chuyến giao', exact: true }),
  ).toBeDisabled();
  if ((await confirm.getByLabel('Tài xế').locator('option').count()) === 1) {
    await expect(confirm.getByText(/Chưa có tài xế trong NPP/)).toBeVisible();
  }
  await confirm.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: /Chuyến đã lập/ }).click();
  await expect(page.getByRole('heading', { name: 'Chuyến giao hàng', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Tài xế/ })).toBeVisible();
  await page.locator('.sidebar').getByRole('button', { name: 'Kho hàng', exact: true }).click();
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Phân phối hàng tồn', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Dự báo tồn theo lô', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Điểm bán đề xuất', exact: true })).toBeVisible();
  await expect(page.getByLabel('Kho', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Liên hệ', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lập đơn nháp', exact: true })).toBeDisabled();
  await expect(page.locator('.loading')).toHaveCount(0);
  await page.screenshot({ path: `${output}/stock-menu-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Liên hệ', exact: true }).first().click();
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Gọi điểm bán', exact: true }),
  ).toHaveAttribute('href', /^tel:/);
  await page
    .getByRole('dialog')
    .getByLabel('Nội dung trao đổi', { exact: true })
    .fill('Kiểm tra giao diện, chưa lưu');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Lưu vào hồ sơ điểm bán', exact: true }),
  ).toBeEnabled();
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Dự báo tồn theo lô', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.loading')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: `${output}/stock-menu-mobile.png`, fullPage: true });
  await page.goto(base + '/#/delivery');
  await expect(page.getByRole('heading', { name: 'Đề xuất gom đơn', exact: true })).toBeVisible();
  await expect(page.locator('.loading')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: `${output}/delivery-menu-mobile.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(apiErrors).toEqual([]);
  expect(writes).toEqual([]);
  // Exercise final actions without creating documents in the user's database.
  // Only this test intercepts writes; the app and its read checks above use real APIs.
  const simulated = [];
  const respond = (route, data) =>
    route.fulfill({
      json: { success: true, data, error: null },
    });
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === 'GET' && path.startsWith('/api/v1/staff'))
      return respond(route, [{ id: 999999, name: 'Tài xế kiểm thử cô lập', role: 'DRIVER' }]);
    if (req.method() === 'GET' && path === '/api/v1/delivery-trips/999995')
      return respond(route, { id: 999995, status: 'PLANNED', stops: [] });
    if (req.method() === 'GET') return route.continue();
    const body = req.postDataJSON();
    simulated.push(path);
    if (path === '/api/v1/interactions') {
      expect(body.note).toContain('Kiểm thử cô lập');
      return respond(route, { id: 999991 });
    }
    if (path === '/api/v1/quotations') {
      expect(body.lines).toHaveLength(1);
      return respond(route, { id: 999992, status: 'DRAFT', total: 11000 });
    }
    if (path === '/api/v1/quotations/999992/transition') {
      expect(body.status).toBe(
        simulated.filter((p) => p === path).length === 1 ? 'SENT' : 'ACCEPTED',
      );
      return respond(route, {
        id: 999992,
        status: body.status,
        total: 11000,
        sales_order_id: body.status === 'ACCEPTED' ? 999993 : null,
      });
    }
    if (path === '/api/v1/delivery-trips') {
      expect(body.driverId).toBe(999999);
      expect(body.stops).toHaveLength(2);
      return respond(route, { id: 999995 });
    }
    throw Error(`Unexpected write blocked: ${path}`);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + '/#/inventory?view=risk');
  await page.getByRole('button', { name: 'Liên hệ', exact: true }).first().click();
  await page
    .getByRole('dialog')
    .getByLabel('Nội dung trao đổi')
    .fill('Kiểm thử cô lập, không lưu dữ liệu thật');
  await page.getByRole('button', { name: 'Lưu vào hồ sơ điểm bán', exact: true }).click();
  await page.getByRole('button', { name: 'Lập đơn nháp', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('999992');
  await page
    .getByRole('button', { name: 'Khách đồng ý — xác nhận & lên đơn', exact: true })
    .click();
  await expect(page.getByRole('link', { name: 'Xem đơn #999993', exact: true })).toBeVisible();
  await page.goto(base + '/#/delivery');
  await page.getByRole('button', { name: 'Chốt ngày & lập chuyến', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Tài xế', { exact: true }).selectOption('999999');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Lập chuyến giao', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Chuyến #999995', exact: true })).toBeVisible();
  expect(simulated).toEqual([
    '/api/v1/interactions',
    '/api/v1/quotations',
    '/api/v1/quotations/999992/transition',
    '/api/v1/quotations/999992/transition',
    '/api/v1/delivery-trips',
  ]);
  expect(errors).toEqual([]);
  expect(apiErrors).toEqual([]);
  console.log(
    'PASS: real NPP sidebar → consolidation → driver confirmation; operational trips preserved; stock risk → real buyer → contact dialog; desktop/mobile/reload; no business writes.',
  );
  console.log(
    'PASS: isolated write-contract checks for contact → DRAFT → SENT → ACCEPTED → order and trip creation; all business writes intercepted, database untouched.',
  );
} finally {
  await browser.close();
}
