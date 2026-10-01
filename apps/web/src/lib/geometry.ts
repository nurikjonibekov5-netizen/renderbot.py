import type { BuildingMeta, RoadMeta, SceneEntity } from '@scene/schema';
import { DEFAULT_STOREY } from '@scene/schema';

export interface LocalBounds {
  /** size before entity scale, local axes */
  size: [number, number, number];
  /** centre in local space */
  center: [number, number, number];
}

export function buildingMeta(e: SceneEntity): BuildingMeta {
  const m = (e.metadata ?? {}) as Partial<BuildingMeta>;
  return {
    width: Number(m.width) > 0 ? Number(m.width) : 10,
    depth: Number(m.depth) > 0 ? Number(m.depth) : 10,
    floors: Math.max(1, Math.round(Number(m.floors) || 1)),
    storeyHeight: Number(m.storeyHeight) > 0 ? Number(m.storeyHeight) : DEFAULT_STOREY,
    style: m.style === 'white' || m.style === 'glass' ? m.style : 'brick',
  };
}

export function roadMeta(e: SceneEntity): RoadMeta {
  const m = (e.metadata ?? {}) as Partial<RoadMeta>;
  return { length: Number(m.length) > 0 ? Number(m.length) : 10, width: Number(m.width) > 0 ? Number(m.width) : 8 };
}

export function buildingHeight(m: BuildingMeta): number {
  return m.floors * m.storeyHeight + 0.6;
}

export function localBounds(e: SceneEntity): LocalBounds {
  switch (e.type) {
    case 'building': {
      const m = buildingMeta(e);
      const h = buildingHeight(m);
      return { size: [m.width, h, m.depth], center: [0, h / 2, 0] };
    }
    case 'road': {
      const m = roadMeta(e);
      return { size: [m.length, 0.1, m.width], center: [0, 0.05, 0] };
    }
    case 'tree':
      return { size: [3.2, 7, 3.2], center: [0, 3.5, 0] };
    default:
      if (e.assetId === 'prim:hedge') return { size: [4, 1.2, 1.2], center: [0, 0.6, 0] };
      if (e.assetId === 'prim:lamp') return { size: [0.8, 5.5, 0.8], center: [0, 2.75, 0] };
      return { size: [1, 1, 1], center: [0, 0.5, 0] };
  }
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** World-space XZ axis-aligned bounds of an entity (rotation about Y and scale applied). */
export function footprintRect(e: SceneEntity): Rect {
  const b = localBounds(e);
  const hw = (b.size[0] * Math.abs(e.scale[0])) / 2;
  const hd = (b.size[2] * Math.abs(e.scale[2])) / 2;
  const a = e.rotation[1];
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const ex = hw * c + hd * s;
  const ez = hw * s + hd * c;
  return { minX: e.position[0] - ex, maxX: e.position[0] + ex, minZ: e.position[2] - ez, maxZ: e.position[2] + ez };
}

export function rectsOverlap(a: Rect, b: Rect, eps = 0.05): boolean {
  return a.minX < b.maxX - eps && a.maxX > b.minX + eps && a.minZ < b.maxZ - eps && a.maxZ > b.minZ + eps;
}

export const WORLD_HALF = 200;

/**
 * Placement validity: inside the world and not overlapping other solid entities.
 * Roads are ignored here (Phase 1); buildings on roads are checked from Phase 2.
 */
export function placementProblem(candidate: SceneEntity, others: readonly SceneEntity[]): string | null {
  const r = footprintRect(candidate);
  if (r.minX < -WORLD_HALF || r.maxX > WORLD_HALF || r.minZ < -WORLD_HALF || r.maxZ > WORLD_HALF) {
    return 'Sahna chegarasidan tashqarida';
  }
  if (candidate.type === 'road') return null;
  for (const o of others) {
    if (o.id === candidate.id || o.type === 'road') continue;
    if (rectsOverlap(r, footprintRect(o))) return 'Boshqa obyekt bilan ustma-ust tushadi';
  }
  return null;
}

export function snap(v: number, step: number): number {
  const r = Math.round(v / step) * step;
  return Object.is(r, -0) ? 0 : Math.round(r * 1e4) / 1e4;
}
