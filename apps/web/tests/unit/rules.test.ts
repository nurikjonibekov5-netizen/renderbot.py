import { describe, expect, it } from 'vitest';
import type { SceneEntity } from '@scene/schema';
import { placementProblem } from '../../src/lib/geometry.ts';
import { computeCrossings } from '../../src/scene/build/roads.ts';
import { snapRectPoint, snapRoadPoint } from '../../src/scene/placement/roadSnap.ts';
import { buildingShape } from '../../src/scene/build/buildings.ts';

const road = (id: string, x: number, z: number, length: number, alongZ = false): SceneEntity => ({
  id, type: 'road', position: [x, 0, z], rotation: [0, alongZ ? Math.PI / 2 : 0, 0], scale: [1, 1, 1], metadata: { length, width: 8 },
});
const bld = (id: string, x: number, z: number, w = 10, d = 10): SceneEntity => ({
  id, type: 'building', assetId: 'prim:building-brick', position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1],
  metadata: { width: w, depth: d, floors: 3, storeyHeight: 3.3, style: 'brick' },
});
const lot = (id: string, x: number, z: number, surface = 'parking'): SceneEntity => ({
  id, type: 'lot', position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1], metadata: { width: 10, depth: 10, surface },
});
const tree = (id: string, x: number, z: number): SceneEntity => ({
  id, type: 'tree', assetId: 'prim:tree-cone', position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1],
});

describe('placement rules (Gate 2)', () => {
  const main = road('r', 0, 0, 100);
  it('buildings stay off roads and sidewalks', () => {
    expect(placementProblem(bld('b', 0, 8), [main])).not.toBeNull(); // edge at z=3: on asphalt
    expect(placementProblem(bld('b', 0, 10), [main])).not.toBeNull(); // edge at z=5: on the sidewalk
    expect(placementProblem(bld('b', 0, 12.1), [main])).toBeNull(); // behind the sidewalk
  });
  it('parking lots never sit on a road', () => {
    expect(placementProblem(lot('l', 0, 6), [main])).not.toBeNull();
    expect(placementProblem(lot('l', 0, 12.1), [main])).toBeNull();
  });
  it('roads never cut through buildings or lots', () => {
    expect(placementProblem(road('n', 0, 0, 40, true), [bld('b', 0, 10)])).not.toBeNull();
    expect(placementProblem(road('n', 0, 0, 40, true), [lot('l', 0, 10)])).not.toBeNull();
    expect(placementProblem(road('n', 30, 0, 40, true), [bld('b', 0, 10)])).toBeNull();
  });
  it('trees may stand on a sidewalk but not on asphalt', () => {
    expect(placementProblem(tree('t', 10, 5.8), [main])).toBeNull();
    expect(placementProblem(tree('t', 10, 2), [main])).not.toBeNull();
  });
  it('buildings may be built on a lot (video: footprint inside a lot)', () => {
    expect(placementProblem(bld('b', 0, 20, 8, 8), [lot('l', 0, 20, 'paved')])).toBeNull();
  });
  it('rotated buildings use oriented boxes, not their AABB', () => {
    const a = { ...bld('a', 0, 0, 20, 4), rotation: [0, Math.PI / 4, 0] as [number, number, number] };
    // `a` runs along (+x, -z); its AABB covers (7, 7) but the oriented box does not
    expect(placementProblem(bld('b', 7, 7, 3, 3), [a])).toBeNull();
    expect(placementProblem(bld('b', 7, -7, 3, 3), [a])).not.toBeNull();
  });
});

describe('road network', () => {
  it('finds X and T junctions with the right sides', () => {
    const ew = road('ew', 0, 0, 100);
    const ns = road('ns', 0, 0, 100, true);
    const t = road('t', 30, 25, 50, true); // ends on the EW road at (30, 0), runs to +Z
    const c = computeCrossings([ew, ns, t]);
    const onEw = c.get('ew')!;
    expect(onEw).toHaveLength(2);
    expect(onEw.find((x) => Math.abs(x.t - 50) < 0.01)!.side).toBe(0);
    const tee = onEw.find((x) => Math.abs(x.t - 80) < 0.01)!;
    expect(tee.side).toBe(1); // the branch lies on the EW road's local +Z side
    expect(c.get('t')!).toHaveLength(1);
  });
  it('road snapping: end node, then road centre line (T-junction), then grid', () => {
    const ew = road('ew', 0, 0, 100);
    expect(snapRoadPoint(51, 1, [ew], true)).toEqual([50, 0]);
    expect(snapRoadPoint(13.1, 2.5, [ew], true)).toEqual([14, 0]);
    expect(snapRoadPoint(13.1, 9.3, [ew], true)).toEqual([14, 10]);
  });
  it('lot corners snap to the block edge (outer sidewalk line)', () => {
    const ew = road('ew', 0, 0, 100);
    expect(snapRectPoint(3.3, 8.2, [ew], true)).toEqual([4, 7]);
    expect(snapRectPoint(3.3, 8.2, [ew], false)).toEqual([3.3, 8.2]);
  });
});

describe('building generator', () => {
  it('is deterministic and changes with facade edits', () => {
    const m = { width: 20, depth: 12, floors: 4, storeyHeight: 3.3, style: 'brick' as const };
    const a = buildingShape('x', m);
    expect(buildingShape('x', m)).toBe(a);
    const b = buildingShape('x', { ...m, faces: { s: 'glass' } });
    expect(b).not.toBe(a);
    expect(a.solid!.getAttribute('position').count).toBeGreaterThan(1000);
    expect(a.glow).not.toBeNull(); // some warm windows
  });
});
