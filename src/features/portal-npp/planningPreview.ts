/** Explicit mockup fixtures. Never read/write orders, stock or customer records through this module. */
export const previewDate = '2026-11-16';
export interface ReadyOrder {
  id: string;
  store: string;
  area: string;
  cluster: string;
  from: string;
  to: string;
  urgent: boolean;
  ready: boolean;
}
export const readyOrders: ReadyOrder[] = [
  {
    id: 'DH-101',
    store: 'Tạp hóa Thanh Hương',
    area: 'Bình Hưng Hòa',
    cluster: 'Bình Tân – Tân Phú',
    from: '2026-11-17',
    to: '2026-11-18',
    urgent: false,
    ready: true,
  },
  {
    id: 'DH-102',
    store: 'Tạp hóa Ngọc Lan',
    area: 'Bình Hưng Hòa',
    cluster: 'Bình Tân – Tân Phú',
    from: '2026-11-16',
    to: '2026-11-18',
    urgent: false,
    ready: true,
  },
  {
    id: 'DH-103',
    store: 'Cửa hàng Mai Hương',
    area: 'Tây Thạnh',
    cluster: 'Bình Tân – Tân Phú',
    from: '2026-11-17',
    to: '2026-11-19',
    urgent: false,
    ready: true,
  },
  {
    id: 'DH-104',
    store: 'Tạp hóa Bảo Ngọc',
    area: 'Tây Thạnh',
    cluster: 'Bình Tân – Tân Phú',
    from: '2026-11-16',
    to: '2026-11-16',
    urgent: true,
    ready: true,
  },
  {
    id: 'DH-105',
    store: 'Tạp hóa An Phú',
    area: 'Gò Vấp',
    cluster: 'Gò Vấp',
    from: '2026-11-18',
    to: '2026-11-19',
    urgent: false,
    ready: true,
  },
  {
    id: 'DH-106',
    store: 'Cửa hàng Hồng Phúc',
    area: 'Gò Vấp',
    cluster: 'Gò Vấp',
    from: '2026-11-18',
    to: '2026-11-18',
    urgent: false,
    ready: true,
  },
];
export function commonDeliveryWindow(orders: ReadyOrder[]) {
  const from = orders.reduce((d, o) => (o.from > d ? o.from : d), previewDate);
  const to = orders.reduce((d, o) => (o.to < d ? o.to : d), '9999-12-31');
  const sameCluster = new Set(orders.map((o) => o.cluster)).size === 1;
  return {
    from,
    to,
    valid: orders.length > 0 && sameCluster && from <= to && orders.every((o) => o.ready),
  };
}
export function canPlanDelivery(orders: ReadyOrder[], date: string) {
  const window = commonDeliveryWindow(orders);
  return window.valid && date >= window.from && date <= window.to;
}
export function suggestDeliveryGroups(orders: ReadyOrder[]) {
  const groups: ReadyOrder[][] = [];
  for (const order of orders
    .filter((o) => o.ready && !o.urgent && o.to >= previewDate)
    .sort((a, b) => a.to.localeCompare(b.to))) {
    const group = groups.find((g) => commonDeliveryWindow([...g, order]).valid);
    if (group) group.push(order);
    else groups.push([order]);
  }
  return groups.map((orders) => ({
    name: orders[0].cluster,
    orders,
    date: commonDeliveryWindow(orders).from,
  }));
}
export const shortDate = (date: string) => date.slice(8, 10) + '/' + date.slice(5, 7);
export const fullDate = (date: string) => shortDate(date) + '/' + date.slice(0, 4);
export interface RiskLot {
  id: string;
  sku: string;
  name: string;
  unit: string;
  expiry: string;
  onHand: number;
  reserved: number;
  sold30: number;
  price: number;
}
export const riskLots: RiskLot[] = [
  {
    id: 'MP-0915',
    sku: 'SKU-001',
    name: 'Sữa tươi nguyên chất',
    unit: 'hộp',
    expiry: '2026-12-16',
    onHand: 500,
    reserved: 20,
    sold30: 240,
    price: 18000,
  },
  {
    id: 'MP-0922',
    sku: 'SKU-002',
    name: 'Trà xanh thanh mát',
    unit: 'chai',
    expiry: '2026-12-31',
    onHand: 630,
    reserved: 30,
    sold30: 300,
    price: 9000,
  },
  {
    id: 'MP-1010',
    sku: 'SKU-004',
    name: 'Nước ép cam tươi',
    unit: 'chai',
    expiry: '2027-01-10',
    onHand: 360,
    reserved: 0,
    sold30: 180,
    price: 11000,
  },
];
export function forecastLot(lot: RiskLot, asOf = previewDate) {
  const days = Math.max(
    0,
    Math.round(
      (Date.parse(lot.expiry + 'T00:00:00Z') - Date.parse(asOf + 'T00:00:00Z')) / 86400000,
    ),
  );
  const available = Math.max(0, lot.onHand - lot.reserved);
  const daily = Math.max(0, lot.sold30) / 30;
  const expectedSold = Math.min(available, Math.floor(daily * days));
  return {
    days,
    available,
    daily,
    expectedSold,
    surplus: available - expectedSold,
    expired: lot.expiry <= asOf,
  };
}
export interface BuyerHistory {
  id: string;
  name: string;
  phone: string;
  area: string;
  sku: string;
  qty30: number;
  lastPurchase: string;
}
const buyers = [
  { id: 's1', name: 'Tạp hóa Thanh Hương', phone: '090x xxx 218', area: 'Bình Hưng Hòa' },
  { id: 's2', name: 'Tạp hóa Ngọc Lan', phone: '093x xxx 646', area: 'Bình Hưng Hòa' },
  { id: 's3', name: 'Cửa hàng Mai Hương', phone: '096x xxx 302', area: 'Tây Thạnh' },
  { id: 's4', name: 'Tạp hóa An Phú', phone: '091x xxx 428', area: 'Gò Vấp' },
  { id: 's5', name: 'Cửa hàng Hồng Phúc', phone: '097x xxx 510', area: 'Gò Vấp' },
  { id: 's6', name: 'Tạp hóa Bảo Ngọc', phone: '098x xxx 604', area: 'Tây Thạnh' },
];
export const buyerHistory: BuyerHistory[] = riskLots.flatMap((lot) =>
  buyers.map((buyer, i) => ({
    ...buyer,
    sku: lot.sku,
    qty30:
      i < buyers.length - 1
        ? Math.round(([72, 48, 36, 30, 30][i] / 240) * lot.sold30)
        : lot.sold30 -
          [72, 48, 36, 30, 30].reduce(
            (sum, share) => sum + Math.round((share / 240) * lot.sold30),
            0,
          ),
    lastPurchase: [
      '2026-11-12',
      '2026-11-10',
      '2026-11-07',
      '2026-11-04',
      '2026-11-02',
      '2026-10-28',
    ][i],
  })),
);
export function targetBuyers(lot: RiskLot, history = buyerHistory) {
  if (forecastLot(lot).expired) return [];
  return history
    .filter((h) => h.sku === lot.sku && h.qty30 > 0 && h.lastPurchase <= previewDate)
    .sort((a, b) => b.qty30 - a.qty30 || b.lastPurchase.localeCompare(a.lastPurchase))
    .slice(0, 3);
}
