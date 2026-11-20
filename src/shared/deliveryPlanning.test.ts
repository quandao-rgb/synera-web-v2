import { expect, it } from 'vitest';
import { deliveryGroups, nearbyDeliveryStores } from './deliveryPlanning';
it('groups assigned routes or nearby real coordinates, never missing locations', () => {
  expect(nearbyDeliveryStores({ routeId: 1 }, { routeId: 1 })).toBe(true);
  expect(nearbyDeliveryStores({}, {})).toBe(false);
  expect(
    nearbyDeliveryStores({ latitude: null, longitude: null }, { latitude: null, longitude: null }),
  ).toBe(false);
  expect(
    nearbyDeliveryStores(
      { latitude: 10.78, longitude: 106.68 },
      { latitude: 10.781, longitude: 106.681 },
    ),
  ).toBe(true);
  expect(
    nearbyDeliveryStores(
      { latitude: 10.78, longitude: 106.68 },
      { latitude: 21.03, longitude: 105.85 },
    ),
  ).toBe(false);
});

it('keeps urgent promises first, groups nearby stores and leaves unknown locations separate', () => {
  const orders = [
    { id: 3, expectedDelivery: '2026-11-19', store: { routeId: 8 } },
    { id: 2, expectedDelivery: '2026-11-18', store: { routeId: 7 } },
    { id: 1, expectedDelivery: '2026-11-15', store: { routeId: 7 } },
    { id: 4, expectedDelivery: '', store: {} },
    { id: 5, expectedDelivery: '', store: {} },
  ];
  const groups = deliveryGroups(orders, '2026-11-16');
  expect(groups[0].orders.map((o) => o.id)).toEqual([1, 2]);
  expect(groups[0].date).toBe('2026-11-16');
  expect(groups[1].date).toBe('2026-11-19');
  expect(groups.flatMap((g) => g.orders)).toHaveLength(orders.length);
  expect(new Set(groups.flatMap((g) => g.orders.map((o) => o.id))).size).toBe(orders.length);
  expect(groups.slice(2).every((g) => g.orders.length === 1)).toBe(true);
});
