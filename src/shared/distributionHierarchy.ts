import { textValue, type RecordData } from './api';

export const distributionLevels = ['NSX', 'NPP', 'REGION', 'PROVINCE', 'SALES_REGION'] as const;
const regionCodes = ['NORTH', 'CENTRAL', 'SOUTH'];

export function organizationPath(nodes: RecordData[], id: unknown): RecordData[] {
  const index = new Map(nodes.map((node) => [textValue(node.id), node]));
  const path: RecordData[] = [],
    seen = new Set<string>();
  let key = textValue(id);
  while (key) {
    const node = index.get(key);
    if (!node || seen.has(key)) return [];
    seen.add(key);
    path.unshift(node);
    key = textValue(node.parentId);
  }
  return path;
}
export function validDistributionNode(nodes: RecordData[], node: RecordData) {
  const path = organizationPath(nodes, node.id);
  return (
    path.length > 0 &&
    path.length <= distributionLevels.length &&
    path.every(
      (unit, i) =>
        unit.type === distributionLevels[i] &&
        (i < 2 || (regionCodes.includes(textValue(unit.region)) && unit.region === path[2].region)),
    )
  );
}
export function salesAreas(nodes: RecordData[], nppId: unknown) {
  return nodes.filter(
    (node) =>
      node.type === 'SALES_REGION' &&
      validDistributionNode(nodes, node) &&
      textValue(organizationPath(nodes, node.id)[1]?.id) === textValue(nppId),
  );
}
export function organizationPathLabel(nodes: RecordData[], id: unknown) {
  return organizationPath(nodes, id)
    .slice(1)
    .map((unit) => textValue(unit.name))
    .join(' → ');
}
export function placedRoute(nodes: RecordData[], route: RecordData) {
  return salesAreas(nodes, route.nppId).some(
    (area) => textValue(area.id) === textValue(route.organizationId),
  );
}
export function childDistributionType(type: unknown) {
  const index = distributionLevels.indexOf(textValue(type) as (typeof distributionLevels)[number]);
  return index < 0
    ? ''
    : index === distributionLevels.length - 1
      ? 'ROUTE'
      : distributionLevels[index + 1];
}
