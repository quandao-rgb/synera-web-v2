import fs from 'node:fs';
import { expect } from '@playwright/test';
import { base, browser, login, token, command } from './browser-session.mjs';
if (base !== 'http://127.0.0.1:8091') throw Error('Run against isolated 8091 only');
fs.mkdirSync('artifacts/product-choice', { recursive: true });
const b = await browser();
const errors = [];
async function centered(page, name, shot) {
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveClass(/action-sheet/);
  await expect.poll(() => dialog.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  const box = await dialog.boundingBox();
  const size = page.viewportSize();
  expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - size.height / 2)).toBeLessThan(2);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: /Lưu thay đổi|Xác nhận/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/product-choice/${shot}.png`, fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
}
try {
  for (const user of ['admin@synera.local', 'npp@synera.local']) {
    const context = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, user);
    const role = user.startsWith('admin') ? 'nsx' : 'npp';
    await page.goto(base + '/#/catalog?assistant=1');
    await expect(page.locator('.product-card')).toHaveCount(12);
    for (const image of await page.locator('.product-card img').all())
      await image.scrollIntoViewIfNeeded();
    await expect(page.locator('.product-card img')).toHaveCount(12);
    await expect
      .poll(() =>
        page
          .locator('.product-card img')
          .evaluateAll((imgs) => imgs.every((img) => img.complete && img.naturalWidth > 0)),
      )
      .toBe(true);
    const assistant = page.locator('.npp-order-assist');
    await assistant.locator('textarea').fill('1 thùng nước ép');
    await assistant.getByRole('button', { name: 'Phân tích yêu cầu' }).click();
    const choices = assistant.locator('.assist-candidate-row');
    await expect(choices).toHaveCount(2);
    await expect(choices.locator('img')).toHaveCount(2);
    const photoBox = await choices.first().locator('img').boundingBox();
    const nameBox = await choices.first().locator('.assist-candidate-name').boundingBox();
    expect(nameBox.x).toBeGreaterThan(photoBox.x + photoBox.width);
    expect(
      Math.abs(nameBox.y + nameBox.height / 2 - photoBox.y - photoBox.height / 2),
    ).toBeLessThan(8);
    await expect(assistant.locator('select')).toHaveCount(0);
    await expect(
      assistant.getByRole('button', { name: 'Xác nhận và thêm vào giỏ' }),
    ).toBeDisabled();
    await choices.filter({ hasText: 'Nước ép táo nguyên chất' }).click();
    await expect(
      choices.filter({ hasText: 'Nước ép táo nguyên chất' }).getByRole('radio'),
    ).toBeChecked();
    await expect(
      choices.filter({ hasText: 'Nước ép cam tươi' }).getByRole('radio'),
    ).not.toBeChecked();
    await page.screenshot({
      path: `artifacts/product-choice/${role}-candidates.png`,
      fullPage: true,
    });
    await assistant.getByRole('button', { name: 'Xác nhận và thêm vào giỏ' }).click();
    await expect(page.locator('.cart-panel')).toContainText('Nước ép táo nguyên chất');
    await page.locator('.product-card').first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/product-choice/${role}-products.png`,
      fullPage: true,
    });
    for (const width of [900, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await assistant.locator('textarea').fill('1 thùng nước ép');
      await assistant.getByRole('button', { name: 'Phân tích yêu cầu' }).click();
      await expect(choices).toHaveCount(2);
      await choices.first().scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `artifacts/product-choice/${role}-choice-${width}.png`,
        fullPage: true,
      });
    }
    for (const width of [1440, 900, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + (role === 'nsx' ? '/#/network' : '/#/trade'));
      await page
        .getByRole('button', {
          name: role === 'nsx' ? 'Thêm nhà phân phối' : 'Đề xuất hỗ trợ',
          exact: true,
        })
        .click();
      await centered(
        page,
        role === 'nsx' ? 'Thêm nhà phân phối' : 'Đề xuất hỗ trợ',
        `${role}-form-${width}`,
      );
    }
    await context.close();
  }
  const context = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const access = await token(context.request, 'admin@synera.local');
  const read = async (path) => {
    const r = await context.request.get(base + '/api/v1' + path, {
      headers: { Authorization: 'Bearer ' + access },
    });
    expect(r.ok()).toBeTruthy();
    return (await r.json()).data;
  };
  const day = new Date().toISOString().slice(0, 10);
  const budget = await command(context.request, access, '/trade/budgets', {
    name: 'Ngân sách đối chiếu quyết định',
    amount: 5000000,
    from: day,
    to: day,
  });
  const requests = [];
  for (const title of ['Bổ sung quầy giới thiệu đồ uống', 'Cấp thêm kệ trưng bày bánh'])
    requests.push({
      ...(await command(context.request, access, '/trade/requests', {
        nppId: 2,
        budgetId: budget.id,
        title,
        amount: 1000000,
      })),
      title,
    });
  await login(page, 'admin@synera.local');
  await page.goto(base + '/#/trade');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const row = (item) =>
    page.locator('tbody tr').filter({
      has: page.locator('td[data-column=id]').filter({ hasText: new RegExp(`^${item.id}$`) }),
    });
  // Locate by immutable ID, including when older requests have the same title.
  while (!(await row(requests[0]).count())) {
    const next = page.getByRole('button', { name: /Trang sau/ });
    if (!(await next.count()) || (await next.isDisabled()))
      throw Error('New trade request not visible');
    await next.click();
  }
  await expect(row(requests[0]).getByRole('button', { name: 'Duyệt', exact: true })).toBeVisible();
  await expect(
    row(requests[0]).getByRole('button', { name: 'Từ chối', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt / từ chối', exact: true })).toHaveCount(0);
  await page.screenshot({
    path: 'artifacts/product-choice/separate-decisions.png',
    fullPage: true,
  });
  await row(requests[0]).getByRole('button', { name: 'Duyệt', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Duyệt đề xuất', exact: true });
  await dialog.locator('[name=approvedAmount]').fill('0');
  await dialog.getByRole('button', { name: 'Xác nhận duyệt' }).click();
  await expect(dialog).toBeVisible();
  await dialog.locator('[name=approvedAmount]').fill('750000');
  await dialog.getByRole('button', { name: 'Xác nhận duyệt' }).click();
  await expect(dialog).toHaveCount(0);
  let data = await read('/trade/requests');
  expect(data.find((r) => r.id === requests[0].id).status).toBe('PARTIALLY_APPROVED');
  expect(data.find((r) => r.id === requests[1].id).status).toBe('SUBMITTED');
  await expect(row(requests[0]).getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
  await row(requests[1]).getByRole('button', { name: 'Từ chối', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Từ chối đề xuất', exact: true });
  await expect(dialog.locator('[name=approvedAmount]')).toHaveCount(0);
  await dialog.locator('[name=reason]').fill('Chưa phù hợp kế hoạch bố trí quầy hiện tại');
  await dialog.getByRole('button', { name: 'Xác nhận từ chối' }).click();
  await expect(dialog).toHaveCount(0);
  data = await read('/trade/requests');
  expect(data.find((r) => r.id === requests[1].id).status).toBe('REJECTED');
  expect(data.find((r) => r.id === requests[0].id).approved).toBe(750000);
  await expect(row(requests[1]).getByRole('button', { name: 'Từ chối', exact: true })).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
  fs.writeFileSync(
    'artifacts/product-choice/results.json',
    JSON.stringify(
      {
        photos: 12,
        roles: ['nsx', 'npp'],
        widths: [1440, 900, 390],
        requests,
        errors,
        checked:
          'Image loading, clickable exclusive candidates, centered scrolling forms, separate decisions and correct row state',
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS photos, image/name choices, centered NSX/NPP forms at 3 widths, separate approve/reject with isolated API state checks',
  );
} finally {
  await b.close();
}
