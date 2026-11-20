import fs from 'node:fs';
import { expect } from '@playwright/test';
import { base, browser, login, token, command } from './browser-session.mjs';

const mutate = process.env.HIERARCHY_WRITE === '1';
if (mutate && base !== 'http://127.0.0.1:8091') throw Error('Writes require disposable runtime');
fs.mkdirSync('artifacts/hierarchy', { recursive: true });
const b = await browser();
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await c.newPage();
const errors = [];
p.on('pageerror', (error) => errors.push(error.message));
const get = async (access, path) => {
  const r = await c.request.get(base + '/api/v1' + path, {
    headers: { Authorization: 'Bearer ' + access },
  });
  expect(r.ok(), path).toBeTruthy();
  return (await r.json()).data;
};
try {
  const access = await token(c.request, 'admin@synera.local');
  let data = await get(access, '/manufacturer/network');
  const mp = data.npps.find((n) => n.code === 'NPP-001');
  expect(mp).toBeTruthy();
  await login(p, 'admin@synera.local');
  const go = async () => {
    await p.goto(base + '/#/network?view=organization');
    await expect(p.locator('.org-node-card')).not.toHaveCount(0);
    await expect(p.locator('.loading')).toHaveCount(0);
  };
  await go();
  if (mutate) {
    let north = data.organizations.find(
      (n) => n.parentId === mp.id && n.type === 'REGION' && n.region === 'NORTH',
    );
    if (!north) {
      await p.getByRole('button', { name: 'Thêm Miền dưới Minh Phát', exact: true }).click();
      const dialog = p.getByRole('dialog');
      await expect(dialog).toContainText('Cấp đang cấu hình: Miền');
      await dialog.getByLabel('Mã đơn vị', { exact: true }).fill('MP-NORTH-' + Date.now());
      await dialog.locator('select[name=region]').selectOption('NORTH');
      await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      data = await get(access, '/manufacturer/network');
      north = data.organizations.find(
        (n) => n.parentId === mp.id && n.type === 'REGION' && n.region === 'NORTH',
      );
    }
    expect(north).toBeTruthy();
    const province = await command(c.request, access, '/organizations/nodes', {
      code: 'MP-HN-' + Date.now(),
      name: 'Hà Nội',
      type: 'PROVINCE',
      parentId: north.id,
      region: 'NORTH',
    });
    const area = await command(c.request, access, '/organizations/nodes', {
      code: 'MP-HN-CG-' + Date.now(),
      name: 'Vùng Cầu Giấy',
      type: 'SALES_REGION',
      parentId: province.id,
      region: 'NORTH',
    });
    const nppAccess = await token(c.request, 'npp@synera.local');
    const own = await get(nppAccess, '/organizations/tree');
    expect(own.some((n) => n.id === area.id)).toBe(true);
    expect(
      own.filter((n) => n.type === 'REGION' && n.parentId === mp.id).map((n) => n.region),
    ).toEqual(expect.arrayContaining(['NORTH', 'SOUTH']));
    const bad = await c.request.post(base + '/api/v1/organizations/nodes', {
      headers: { Authorization: 'Bearer ' + access, 'Idempotency-Key': crypto.randomUUID() },
      data: {
        code: 'SKIP-' + Date.now(),
        name: 'Vùng bỏ cấp',
        type: 'SALES_REGION',
        parentId: mp.id,
        region: 'SOUTH',
      },
    });
    expect(bad.status()).toBe(422);
    await go();
  }
  const checks = [];
  const groups = await p
    .locator('[data-region-group]')
    .evaluateAll((cards) => cards.map((card) => card.dataset.regionGroup));
  const order = ['SOUTH', 'NORTH', 'CENTRAL', 'MULTI', 'UNASSIGNED'];
  expect(groups.map((group) => order.indexOf(group))).toEqual(
    [...groups.map((group) => order.indexOf(group))].sort((a, b) => a - b),
  );
  const checkLinks = async () => {
    await expect
      .poll(async () => p.locator('.org-connectors path').count())
      .toBe((await p.locator('[data-org-key]').count()) - 1);
    const geometry = await p.locator('.org-tree-canvas').evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      const cards = [...canvas.querySelectorAll('[data-org-key]')];
      const index = new Map(cards.map((card) => [card.dataset.orgKey, card]));
      const children = cards.filter((card) => index.has(card.dataset.orgParent));
      return [...canvas.querySelectorAll('.org-connectors path')].map((path, i) => {
        const source = index.get(children[i].dataset.orgParent).getBoundingClientRect();
        const target = children[i].getBoundingClientRect();
        const start = path.getPointAtLength(0),
          end = path.getPointAtLength(path.getTotalLength());
        return {
          stroke: getComputedStyle(path).strokeWidth,
          invalid: /NaN|Infinity/.test(path.getAttribute('d')),
          error: Math.max(
            Math.abs(start.x - (source.right - bounds.left)),
            Math.abs(start.y - (source.top + source.height / 2 - bounds.top)),
            Math.abs(end.x - (target.left - bounds.left)),
            Math.abs(end.y - (target.top + target.height / 2 - bounds.top)),
          ),
        };
      });
    });
    expect(
      geometry.every((line) => !line.invalid && line.error < 1 && line.stroke === '1.75px'),
    ).toBe(true);
    return geometry.length;
  };
  for (const width of [1440, 900, 390]) {
    await p.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () => Math.round((await p.locator('.main-shell').boundingBox()).x))
      .toBe(width > 1100 ? 230 : width > 760 ? 68 : 0);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(p.locator('.org-level-labels span')).toHaveText([
      'Công ty sản xuất',
      'Nhà phân phối',
      'Miền',
      'Tỉnh / Thành phố',
      'Vùng bán hàng',
      'Tuyến',
    ]);
    const line = await checkLinks();
    expect(await p.locator('.org-connectors path[d*="Q"]').count()).toBeGreaterThan(0);
    await p.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelector('.org-chart-scroll').scrollLeft = 0;
    });
    await p.screenshot({
      path: `artifacts/hierarchy/tree-${new URL(base).port}-${width}.png`,
      fullPage: true,
    });
    checks.push({ width, line });
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.getByRole('button', { name: 'Thu gọn cấp dưới', exact: true }).click();
  await expect(p.locator('.org-route-card')).toHaveCount(0);
  await checkLinks();
  await p.getByRole('button', { name: 'Mở rộng tất cả', exact: true }).click();
  expect(await p.locator('.org-route-card').count()).toBeGreaterThanOrEqual(
    base.endsWith(':8091') ? 5 : 6,
  );
  await checkLinks();
  await p.emulateMedia({ reducedMotion: 'reduce' });
  const toggle = p.getByRole('button', { name: 'Thu gọn Minh Phát', exact: true });
  await toggle.click();
  await expect(p.getByRole('button', { name: 'Mở rộng Minh Phát', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await checkLinks();
  expect(errors).toEqual([]);
  fs.writeFileSync(
    `artifacts/hierarchy/ui-${new URL(base).port}.json`,
    JSON.stringify({ mutate, checks, errors }, null, 2),
  );
  console.log(
    'PASS hierarchy: region grouping, rounded connector alignment, strict levels, 3 widths, collapse/expand, reduced motion',
  );
} finally {
  await b.close();
}
