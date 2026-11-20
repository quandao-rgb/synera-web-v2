import fs from 'node:fs';
import { expect } from '@playwright/test';
import { base, browser, login, token, command } from './browser-session.mjs';
if (base !== 'http://127.0.0.1:8091') throw Error('Use isolated TEST_URL=http://127.0.0.1:8091');
const scenario = JSON.parse(
  fs.readFileSync('artifacts/usability/data-isolated.json', 'utf8'),
).records;
const b = await browser();
const context = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const access = await token(context.request, 'admin@synera.local');
async function read(path) {
  const r = await context.request.get(base + '/api/v1' + path, {
    headers: { Authorization: 'Bearer ' + access },
  });
  expect(r.ok(), path).toBeTruthy();
  return (await r.json()).data;
}
async function go(path) {
  await page.goto(base + '/#' + path);
  await expect(page.locator('.loading')).toHaveCount(0, { timeout: 30000 });
}
const action = async (name) => {
  await page.getByRole('button', { name, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const reason = dialog.locator('[name=reason]');
  if (await reason.count()) await reason.fill('Đã xác nhận phương án xử lý với nhà phân phối');
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(dialog).toHaveCount(0);
};
try {
  await login(page, 'admin@synera.local');
  const first = await command(context.request, access, '/sell-in-orders', {
      nppId: 2,
      lines: [{ skuId: 1, uom: 'THUNG', qty: 1 }],
    }),
    other = await command(context.request, access, '/sell-in-orders', {
      nppId: 2,
      lines: [{ skuId: 2, uom: 'THUNG', qty: 1 }],
    });
  for (const order of [first, other])
    await command(context.request, access, `/sell-in-orders/${order.id}/submit`);
  const before = await read(`/sell-in-orders/${other.id}`);
  await go(`/orders?channel=sellin&order=${first.id}`);
  for (const name of [
    'Duyệt đơn',
    'Xác nhận số lượng',
    'Xuất kho',
    'Bắt đầu giao',
    'Xác nhận đã giao',
    'Ghi nhận thực nhận',
    'Đối soát',
    'Đóng đơn',
  ])
    await action(name);
  await expect(page.locator('.order-next-action')).toContainText('Đơn hàng đã hoàn tất');
  const completed = await read(`/sell-in-orders/${first.id}`),
    unchanged = await read(`/sell-in-orders/${other.id}`);
  expect(completed.status).toBe('CLOSED');
  expect(unchanged.status).toBe(before.status);
  expect(unchanged.history).toEqual(before.history);
  await go('/orders?channel=sellin');
  await page.locator('.search-box input').fill(first.code);
  const row = page.locator('tbody tr').filter({ hasText: first.code });
  await expect(row.getByRole('button', { name: 'Xem kết quả' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Xử lý đơn' })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/usability/orders-completed.png', fullPage: true });
  // The target is frozen and its dialog is retired when switching orders.
  await go(`/orders?channel=sellin&order=${other.id}`);
  await page.getByRole('button', { name: 'Duyệt đơn', exact: true }).click();
  await page.evaluate((id) => {
    location.hash = '/orders?channel=sellin&order=' + id;
  }, scenario['sellin:4'].id);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await read(`/sell-in-orders/${other.id}`)).status).toBe(before.status);
  await go('/finance');
  await page.getByRole('button', { name: 'Ngưỡng quá hạn', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-label', 'Ngưỡng quá hạn');
  await expect(page.locator('[name=reason]')).toHaveAttribute('placeholder', /VD:/);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Ghi nhận thanh toán', exact: true }).click();
  await expect(page.locator('[name=reference]')).toHaveAttribute('placeholder', /CK-/);
  await expect(page.locator('[name=amount]')).toHaveAttribute('placeholder', /1500000/);
  await page.screenshot({ path: 'artifacts/usability/payment-example.png', fullPage: true });
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(page.locator('body')).not.toContainText('INVOICE');
  await go('/policies');
  await page.getByRole('button', { name: 'Soạn chương trình', exact: true }).click();
  const policy = page.getByRole('dialog');
  await expect(policy).not.toHaveClass(/action-sheet/);
  const box = await policy.boundingBox();
  expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(2);
  expect(box.width).toBeGreaterThan(850);
  await expect.poll(() => policy.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect(policy.locator('input:not([type=date]),textarea').first()).toHaveAttribute(
    'placeholder',
    /VD:/,
  );
  await page.screenshot({ path: 'artifacts/usability/policy-centered.png', fullPage: true });
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await go('/reports');
  await expect(page.locator('.report-reading-guide')).toContainText(
    'Một điểm có thể có nhiều lượt ghé',
  );
  await page.locator('.report-reading-guide summary').click();
  await expect(page.locator('.report-reading-guide')).toContainText('Doanh thu thực nhận');
  await page.screenshot({ path: 'artifacts/usability/report-explained.png', fullPage: true });
  const nsxStyle = await page
    .locator('tbody td')
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { font: s.fontFamily, size: s.fontSize };
    });
  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBeTruthy();
    await page.screenshot({ path: `artifacts/usability/report-${width}.png`, fullPage: true });
  }
  const nppContext = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const npp = await nppContext.newPage();
  await npp.setViewportSize({ width: 1440, height: 1000 });
  await login(npp, 'npp@synera.local');
  await npp.goto(base + '/#/catalog?assistant=1');
  const assistant = npp.locator('.npp-order-assist');
  await assistant.locator('textarea').fill('tôi muốn nhập 2 THÙNG nước khoáng');
  await assistant.getByRole('button', { name: 'Phân tích yêu cầu' }).click();
  await expect(assistant.locator('.assist-candidate-list')).toBeVisible();
  await expect(assistant.getByRole('button', { name: 'Xác nhận và thêm vào giỏ' })).toBeDisabled();
  const choices = await assistant.locator('.assist-candidate-row').allTextContents();
  expect(choices.join(' ')).toContain('Nước khoáng');
  await assistant.locator('.assist-candidate-row').first().click();
  await assistant.getByRole('button', { name: 'Xác nhận và thêm vào giỏ' }).click();
  await expect(npp.locator('.cart-panel')).toContainText('2');
  await npp.screenshot({ path: 'artifacts/usability/assistant-candidates.png', fullPage: true });
  await npp.goto(base + '/#/orders?channel=sellin');
  await expect(npp.locator('tbody td').first()).toBeVisible();
  const nppStyle = await npp
    .locator('tbody td')
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { font: s.fontFamily, size: s.fontSize };
    });
  expect(nppStyle).toEqual(nsxStyle);
  expect(errors).toEqual([]);
  fs.writeFileSync(
    'artifacts/usability/ui-results.json',
    JSON.stringify(
      {
        firstOrder: first.id,
        untouchedOrder: other.id,
        untouchedStatus: unchanged.status,
        completed: completed.status,
        sharedTableStyle: nsxStyle,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS one selected order completes while another keeps status/history; no stale action on completed; retiring changed dialog; Vietnamese finance; input examples; centered policy; report guidance/responsive; catalogue nearest-choice confirmation; shared NSX/NPP table styles',
  );
} finally {
  await b.close();
}
