import type { RecordData } from './api';

export function nearbyDeliveryStores(a: Record<string, unknown>, b: Record<string, unknown>) {
  if (a.routeId && a.routeId === b.routeId) return true;
  const values = [a.latitude, a.longitude, b.latitude, b.longitude];
  if (!values.every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
  const [lat1, lon1, lat2, lon2] = values as number[];
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180)
    return false;
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h))) <= 3;
}

/** Advisory groups only: use real routes/coordinates and never postpone a promised delivery. */
export function deliveryGroups(orders: RecordData[], day: string) {
  const due = (o: RecordData) => String(o.expectedDelivery || '');
  const remaining = [...orders].sort(
    (a, b) => (due(a) || '9999').localeCompare(due(b) || '9999') || Number(a.id) - Number(b.id),
  );
  const groups: { orders: RecordData[]; date: string }[] = [];
  while (remaining.length) {
    const first = remaining.shift()!;
    const date = due(first) > day ? due(first) : day;
    const group = [first];
    for (let i = 0; i < remaining.length;) {
      const candidate = remaining[i];
      const canReceive = !due(candidate) || due(candidate) >= date || date === day;
      if (
        canReceive &&
        nearbyDeliveryStores(
          (first.store || {}) as RecordData,
          (candidate.store || {}) as RecordData,
        )
      ) {
        group.push(candidate);
        remaining.splice(i, 1);
      } else i++;
    }
    groups.push({ orders: group, date });
  }
  return groups;
}
