import { describe, expect, it } from 'vitest';
import {
  organizationPath,
  placedRoute,
  salesAreas,
  validDistributionNode,
} from './distributionHierarchy';
import type { RecordData } from './api';
const nodes: RecordData[] = [
  { id: 1, type: 'NSX', parentId: null, region: 'ALL' },
  { id: 2, type: 'NPP', parentId: 1, region: 'SOUTH' },
  { id: 3, type: 'NPP', parentId: 1, region: 'NORTH' },
  { id: 4, type: 'REGION', parentId: 2, region: 'SOUTH' },
  { id: 5, type: 'REGION', parentId: 2, region: 'NORTH' },
  { id: 6, type: 'REGION', parentId: 3, region: 'NORTH' },
  { id: 7, type: 'PROVINCE', parentId: 4, region: 'SOUTH' },
  { id: 8, type: 'PROVINCE', parentId: 5, region: 'NORTH' },
  { id: 9, type: 'PROVINCE', parentId: 6, region: 'NORTH' },
  { id: 10, type: 'SALES_REGION', parentId: 7, region: 'SOUTH' },
  { id: 11, type: 'SALES_REGION', parentId: 8, region: 'NORTH' },
  { id: 12, type: 'SALES_REGION', parentId: 9, region: 'NORTH' },
];
describe('distribution hierarchy', () => {
  it('supports many regions per NPP and the same region under different NPPs without leaking routes', () => {
    expect(salesAreas(nodes, 2).map((node) => node.id)).toEqual([10, 11]);
    expect(salesAreas(nodes, 3).map((node) => node.id)).toEqual([12]);
    expect(placedRoute(nodes, { nppId: 2, organizationId: 12 })).toBe(false);
    expect(placedRoute(nodes, { nppId: 2, organizationId: 11 })).toBe(true);
    expect(placedRoute(nodes, { nppId: 2, organizationId: 2 })).toBe(false);
  });
  it('rejects skipped levels, incompatible regions, cycles and legacy department branches', () => {
    for (const change of [{ parentId: 2 }, { region: 'CENTRAL' }, { parentId: 10 }]) {
      const changed = nodes.map((node) => (node.id === 10 ? { ...node, ...change } : node));
      expect(
        validDistributionNode(
          changed,
          changed.find((node) => node.id === 10)!,
        ),
      ).toBe(false);
    }
    const legacy = [
      ...nodes,
      { id: 13, type: 'BUSINESS_UNIT', parentId: 1, region: 'SOUTH' },
      { id: 14, type: 'REGION', parentId: 13, region: 'SOUTH' },
    ];
    expect(validDistributionNode(legacy, legacy.at(-1)!)).toBe(false);
    expect(
      organizationPath(
        [
          { id: 1, parentId: 2 },
          { id: 2, parentId: 1 },
        ],
        1,
      ),
    ).toEqual([]);
  });
});
