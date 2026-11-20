import fs from 'node:fs';
import { expect } from '@playwright/test';
import { base, browser, login } from './browser-session.mjs';
fs.mkdirSync('artifacts/gray-review', { recursive: true });
const b = await browser();
const checks = [];
const productBaseline = JSON.parse(
  fs.readFileSync('artifacts/gray-review/products-before.json', 'utf8'),
);
try {
  for (const user of ['admin@synera.local', 'npp@synera.local']) {
    const context = await b.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const role = user.startsWith('admin') ? 'nsx' : 'npp';
    await login(page, user);
    await page.goto(base + '/#/catalog');
    const cards = page.locator('.product-card');
    await expect(cards).toHaveCount(12);
    await expect(page.locator('.catalog-products-compact,.catalog-view-tools')).toHaveCount(0);
    const productState = await cards.evaluateAll((cards) =>
      cards.map((card) => ({
        name: card.querySelector('h3').textContent,
        code: card.querySelector('small').textContent,
        price: card.querySelector('strong').textContent,
        units: [...card.querySelectorAll('option')].map((o) => [o.value, o.textContent]),
        image: card.querySelector('img')?.getAttribute('src'),
        quantity: card.querySelector('input').value,
        tags: [...card.children].map((el) => el.tagName),
      })),
    );
    // UOM order is not part of the API contract and differs between the two databases.
    const normalized = (items) =>
      items.map((item) => ({
        ...item,
        units: [...item.units].sort((a, b) => a[0].localeCompare(b[0])),
      }));
    expect(normalized(productState)).toEqual(normalized(productBaseline[user]));
    const first = cards.first();
    await first.getByRole('spinbutton').fill('2');
    const chosen = await first.getByRole('heading').innerText();
    await expect(page.locator('.cart-panel')).toContainText(chosen);
    for (const width of [1440, 900, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(async () => Math.round((await page.locator('.main-shell').boundingBox()).x))
        .toBe(width > 1100 ? 230 : width > 760 ? 68 : 0);
      await expect(cards).toHaveCount(12);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      for (const image of await cards.locator('img').all()) await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          cards
            .locator('img')
            .evaluateAll(
              (imgs) =>
                imgs.length === 12 && imgs.every((img) => img.complete && img.naturalWidth > 0),
            ),
        )
        .toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `artifacts/gray-review/catalog-${role}-${width}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const paths = [
      '/references',
      '/delivery',
      '/trade',
      '/npp-workflow',
      '/policies',
      '/demand',
      '/dashboard',
      '/reports',
      '/inventory',
      ...(role === 'nsx' ? ['/network?view=organization'] : []),
    ];
    for (const path of paths) {
      await page.goto(base + '/#' + path);
      await expect(page.locator('main')).toHaveAttribute('data-page', path.split('?')[0].slice(1));
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main .loading')).toHaveCount(0, { timeout: 15000 });
      if (path === '/network?view=organization')
        await expect(page.locator('.org-node-card').first()).toBeVisible();
      if (path === '/policies') {
        for (const details of await page.locator('main tbody details').all())
          await details.evaluate((el) => (el.open = true));
      }
      for (const width of [1440, 900, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect
          .poll(async () => Math.round((await page.locator('.main-shell').boundingBox()).x))
          .toBe(width > 1100 ? 230 : width > 760 ? 68 : 0);
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        const audit = await page.locator('main').evaluate((main) => {
          const shown = (el) =>
            el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
          const headers = [
            ...main.querySelectorAll('.panel-head,.nsx-work-head,.org-chart-title,thead th'),
          ]
            .filter(shown)
            .map((el) => ({
              text: el.textContent.trim().slice(0, 60),
              bg: getComputedStyle(el).backgroundColor,
            }));
          const clipped = [...main.querySelectorAll('h1,h2,h3,td p,.panel > .toolbar label')]
            .filter(shown)
            .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 3)
            .map((el) => el.textContent.trim().slice(0, 90));
          const flush = [...main.querySelectorAll('.panel > .toolbar,.org-chart-title')]
            .filter(shown)
            .filter((el) => parseFloat(getComputedStyle(el).paddingLeft) < 14)
            .map((el) => el.className);
          return {
            headers,
            clipped,
            flush,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        expect(audit.clipped, `${role}${path}${width} clipped text`).toEqual([]);
        expect(audit.flush, `${role}${path}${width} missing padding`).toEqual([]);
        expect(audit.overflow, `${role}${path}${width} overflow`).toBe(false);
        for (const header of audit.headers)
          expect(header.bg, `${role}${path}${width} ${header.text}`).toBe('rgb(241, 243, 246)');
        checks.push({ role, path, width, headers: audit.headers.length });
        if (width === 1440 || path === '/references')
          await page.screenshot({
            path: `artifacts/gray-review/gray-${role}-${path.replaceAll(/[^a-z]/g, '_')}-${width}.png`,
            fullPage: true,
          });
      }
    }
    expect(errors).toEqual([]);
    await context.close();
  }
  fs.writeFileSync(
    `artifacts/gray-review/results-${base.endsWith(':8091') ? 'isolated' : 'main'}.json`,
    JSON.stringify({ base, checks, verifiedAt: new Date().toISOString() }, null, 2),
  );
  console.log(
    `PASS preserved12 product cards, images, prices, units and quantities; ${checks.length} NSX/NPP gray-header, text/padding and responsive checks`,
  );
} finally {
  await b.close();
}
