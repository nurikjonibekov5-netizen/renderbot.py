import { describe, expect, it } from 'vitest';
import type { SceneEntity } from '@scene/schema';
import { footprintRect, rectsOverlap, snap } from '../../src/lib/geometry.ts';
import { roadNodes, snapRoadPoint } from '../../src/scene/placement/roadSnap.ts';

const road = (x: number, z: number, length: number, angle: number): SceneEntity => ({
  id: 'r', type: 'road', position: [x, 0, z], rotation: [0, angle, 0], scale: [1, 1, 1], metadata: { length, width: 8 },
});

describe('geometry', () => {
  it('snap rounds to the step without -0', () => {
    expect(snap(3.2, 2)).toBe(4);
    expect(snap(-0.4, 1)).toBe(0);
    expect(Object.is(snap(-0.4, 1), -0)).toBe(false);
  });

  it('rotated footprint grows its AABB', () => {
    const e: SceneEntity = {
      id: 'b', type: 'building', position: [0, 0, 0], rotation: [0, Math.PI / 2, 0], scale: [1, 1, 1],
      metadata: { width: 20, depth: 10, floors: 1, storeyHeight: 3.3, style: 'brick' },
    };
    const r = footprintRect(e);
    expect(r.maxX - r.minX).toBeCloseTo(10);
    expect(r.maxZ - r.minZ).toBeCloseTo(20);
  });

  it('touching rects do not overlap', () => {
    expect(rectsOverlap({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, { minX: 1, maxX: 2, minZ: 0, maxZ: 1 })).toBe(false);
    expect(rectsOverlap({ minX: 0, maxX: 1, minZ: 0, maxZ: 1 }, { minX: 0.5, maxX: 2, minZ: 0, maxZ: 1 })).toBe(true);
  });

  it('road nodes and node snapping', () => {
    const r = road(0, 0, 20, 0);
    const nodes = roadNodes([r]).map(([x, z]) => [Math.round(x), Math.round(z)]);
    expect(nodes).toEqual([[-10, 0], [10, 0]]);
    expect(snapRoadPoint(11.5, 1.2, [r], true)).toEqual([10, 0]);
    expect(snapRoadPoint(31.1, 0.9, [r], true)).toEqual([32, 0]);
    const v = road(0, 0, 20, Math.PI / 2);
    const [x, z] = snapRoadPoint(0.5, -9, [v], true);
    expect(Math.round(x)).toBe(0);
    expect(Math.abs(Math.round(z))).toBe(10);
  });
});
