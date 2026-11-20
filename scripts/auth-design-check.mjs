import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import { base, login } from './browser-session.mjs';
const output = 'artifacts/login-redesign';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1915, height: 1079 } });
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(base + '/#/login');
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Trang giới thiệu', exact: true })).toHaveAttribute(
    'href',
    '#/landing',
  );
  await expect(page.getByRole('link', { name: 'Đăng ký SYNERA', exact: true })).toHaveAttribute(
    'href',
    /^mailto:/,
  );
  const asset = await page.request.get(base + '/assets/auth/login-warehouse-v1.png');
  expect(asset.ok()).toBe(true);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode()));
    const background = new Image();
    background.src = '/assets/auth/login-warehouse-v1.png';
    await background.decode();
  });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => img.decode()));
    const background = new Image();
    background.src = '/assets/auth/login-warehouse-v1.png';
    await background.decode();
  });
  const artwork = fs.readFileSync('public/assets/auth/login-warehouse-v1.png');
  const artworkSize = { width: artwork.readUInt32BE(16), height: artwork.readUInt32BE(20) };
  for (const [width, height] of [
    [1915, 1079],
    [1440, 1000],
    [900, 1000],
    [390, 844],
    [1920, 640],
    [1920, 768],
    [1366, 768],
    [1680, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width > 1100) {
      expect((await page.locator('.auth-form').boundingBox()).x).toBeGreaterThan(width * 0.58);
      const scene = await page.locator('.auth-page').boundingBox();
      const copy = await page.locator('.auth-message').boundingBox();
      await expect(page.locator('.auth-page')).toHaveCSS('background-position-y', '0%');
      // The laptop starts at y=414 in this specific 1672x941 artwork. Keep the
      // rendered photo below the live copy, including wide but short windows.
      const scale = Math.max(scene.width / artworkSize.width, scene.height / artworkSize.height);
      expect(
        scene.y + 414 * scale - (copy.y + copy.height),
        `${width}x${height} copy/photo gap`,
      ).toBeGreaterThanOrEqual(16);
    }
    await page.screenshot({ path: `${output}/login-${width}x${height}.png`, fullPage: true });
  }
  await page.getByLabel('Mật khẩu', { exact: true }).fill('NotSubmitted123!');
  await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Quên mật khẩu?', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Khôi phục mật khẩu', exact: true }),
  ).toBeVisible();
  // Exercise reset presentation while intercepting both account-changing requests.
  await page.route('**/api/v1/auth/forgot-password', (route) =>
    route.fulfill({
      json: { success: true, data: { localResetToken: 'isolated-ui-token' }, error: null },
    }),
  );
  await page.route('**/api/v1/auth/reset-password', (route) =>
    route.fulfill({ json: { success: true, data: {}, error: null } }),
  );
  await page.getByLabel('Email', { exact: true }).fill('isolated-ui@example.invalid');
  await page.getByRole('button', { name: 'Gửi yêu cầu khôi phục', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đặt mật khẩu mới', exact: true })).toBeVisible();
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('IsolatedUITestOnly123!');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, 'admin@synera.local');
  await expect(page.locator('.topbar')).toBeVisible();
  const nppContext = await browser.newContext();
  const npp = await nppContext.newPage();
  await login(npp, 'npp@synera.local');
  await expect(npp.locator('.topbar')).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: login at 8 viewport sizes including 1920x640/768 and 1366x768; copy stays above laptop, original logos, no overflow, password visibility, isolated reset UI, real admin OTP and NPP login. No account passwords changed.',
  );
} finally {
  await browser.close();
}
