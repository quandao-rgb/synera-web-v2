import { describe, expect, it } from 'vitest';
import {
  canPlanDelivery,
  commonDeliveryWindow,
  forecastLot,
  readyOrders,
  riskLots,
  suggestDeliveryGroups,
  targetBuyers,
} from './planningPreview';
describe('NPP planning mockup rules', () => {
  it('groups nearby ready orders on a common day without postponing urgent orders', () => {
    const groups = suggestDeliveryGroups(readyOrders);
    expect(groups.map((g) => [g.orders.length, g.date])).toEqual([
      [3, '2026-11-17'],
      [2, '2026-11-18'],
    ]);
    expect(groups.flatMap((g) => g.orders).some((o) => o.urgent)).toBe(false);
    expect(canPlanDelivery([readyOrders[3]], '2026-11-17')).toBe(false);
    expect(canPlanDelivery([readyOrders[3]], '2026-11-16')).toBe(true);
  });
  it('rejects incompatible areas, delivery windows and unprepared orders', () => {
    expect(commonDeliveryWindow([readyOrders[0], readyOrders[4]]).valid).toBe(false);
    expect(canPlanDelivery([readyOrders[0], readyOrders[3]], '2026-11-17')).toBe(false);
    expect(canPlanDelivery([{ ...readyOrders[0], ready: false }], '2026-11-17')).toBe(false);
    expect(canPlanDelivery([], '2026-11-17')).toBe(false);
    expect(suggestDeliveryGroups([{ ...readyOrders[0], ready: false }])).toEqual([]);
  });
  it('computes forecast from available stock, actual fixture sales and days to expiry', () => {
    expect(riskLots.map((lot) => forecastLot(lot).surplus)).toEqual([240, 150, 30]);
    const result = forecastLot(riskLots[0]);
    expect(result.available).toBe(480);
    expect(result.expectedSold + result.surplus).toBe(result.available);
    expect(result.days).toBe(30);
    expect(forecastLot({ ...riskLots[0], sold30: 0 }).surplus).toBe(480);
    expect(forecastLot({ ...riskLots[0], sold30: 10000 }).surplus).toBe(0);
  });
  it('only targets buyers of that SKU; expired lots are never proposed for selling', () => {
    expect(targetBuyers(riskLots[0]).map((h) => h.id)).toEqual(['s1', 's2', 's3']);
    expect(
      targetBuyers(riskLots[0], [
        {
          id: 'x',
          name: 'Other',
          phone: '',
          area: '',
          sku: 'OTHER',
          qty30: 999,
          lastPurchase: '2026-11-15',
        },
      ]),
    ).toEqual([]);
    expect(targetBuyers({ ...riskLots[0], expiry: '2026-11-16' })).toEqual([]);
  });
});
