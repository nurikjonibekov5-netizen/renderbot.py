import type { BuildingMeta, LotMeta, RoadMeta, SceneEntity } from '@scene/schema';
import { DEFAULT_STOREY } from '@scene/schema';
import { manifestById } from './assets.ts';

export interface LocalBounds {
  /** size before entity scale, local axes */
  size: [number, number, number];
  /** centre in local space */
  center: [number, number, number];
}

export const SIDEWALK_WIDTH = 3;

export function isGlb(e: SceneEntity): boolean {
  return typeof e.assetId === 'string' && e.assetId.startsWith('glb:');
}

export function buildingMeta(e: SceneEntity): BuildingMeta {
  const m = (e.metadata ?? {}) as Partial<BuildingMeta>;
  return {
    width: Number(m.width) > 0 ? Number(m.width) : 10,
    depth: Number(m.depth) > 0 ? Number(m.depth) : 10,
    floors: Math.max(1, Math.round(Number(m.floors) || 1)),
    storeyHeight: Number(m.storeyHeight) > 0 ? Number(m.storeyHeight) : DEFAULT_STOREY,
    style: m.style === 'white' || m.style === 'glass' ? m.style : 'brick',
    ...(m.faces ? { faces: m.faces } : {}),
    ...(m.ground ? { ground: m.ground } : {}),
    ...(m.kind ? { kind: m.kind } : {}),
    ...(m.roof ? { roof: m.roof } : {}),
    ...(m.name ? { name: m.name } : {}),
  };
}

export function roadMeta(e: SceneEntity): RoadMeta {
  const m = (e.metadata ?? {}) as Partial<RoadMeta>;
  return { length: Number(m.length) > 0 ? Number(m.length) : 10, width: Number(m.width) > 0 ? Number(m.width) : 8 };
}

export function lotMeta(e: SceneEntity): LotMeta {
  const m = (e.metadata ?? {}) as Partial<LotMeta>;
  return {
    width: Number(m.width) > 0 ? Number(m.width) : 10,
    depth: Number(m.depth) > 0 ? Number(m.depth) : 10,
    surface: m.surface === 'parking' || m.surface === 'plaza' ? m.surface : 'paved',
  };
}

export function buildingHeight(m: BuildingMeta): number {
  return m.floors * m.storeyHeight + (m.kind === 'clinic' ? 3 : 1);
}

const PROP_SIZE: Record<string, [number, number, number]> = {
  'prim:tree-cone': [3.4, 6.4, 3.4],
  'prim:tree-pine': [3.4, 6.2, 3.4],
  'prim:tree-round': [3.6, 5.4, 3.6],
  'prim:tree-box': [1.6, 3.8, 1.6],
  'prim:hedge': [4, 1.3, 1.2],
  'prim:lamp': [1.2, 5.5, 0.6],
  'prim:traffic-light': [0.5, 4.4, 0.5],
  'prim:car': [4.2, 1.7, 1.8],
  'prim:snow-bush': [3.2, 1.6, 2.6],
  'prim:chimney': [8, 51, 8],
};

export function localBounds(e: SceneEntity): LocalBounds {
  if (isGlb(e)) {
    const size = manifestById.get(e.assetId!)?.size ?? [10, 10, 10];
    return { size: [size[0], size[1], size[2]], center: [0, size[1] / 2, 0] };
  }
  switch (e.type) {
    case 'building': {
      const m = buildingMeta(e);
      const h = buildingHeight(m);
      return { size: [m.width, h, m.depth], center: [0, h / 2, 0] };
    }
    case 'road': {
      const m = roadMeta(e);
      return { size: [m.length, 0.2, m.width], center: [0, 0.1, 0] };
    }
    case 'lot': {
      const m = lotMeta(e);
      return { size: [m.width, 0.2, m.depth], center: [0, 0.1, 0] };
    }
    default: {
      if (e.assetId === 'prim:rail') {
        const len = Number(e.metadata?.length) || 100;
        const tracks = Number(e.metadata?.tracks) || 3;
        return { size: [len, 4.5, tracks * 5 + 2], center: [0, 2.25, 0] };
      }
      if (e.assetId === 'prim:pipe-bridge') {
        const len = Number(e.metadata?.length) || 40;
        return { size: [len, 8.6, 2], center: [0, 4.3, 0] };
      }
      const s = PROP_SIZE[e.assetId ?? ''] ?? [1, 1, 1];
      return { size: s, center: [0, s[1] / 2, 0] };
    }
  }
}

/** Oriented rectangle on the ground plane. */
export interface Obb {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  /** rotation about Y (radians), same convention as entity.rotation[1] */
  a: number;
}

export function obbOf(e: SceneEntity, padZ = 0): Obb {
  const b = localBounds(e);
  const c = Math.cos(e.rotation[1]);
  const s = Math.sin(e.rotation[1]);
  const ox = b.center[0] * e.scale[0];
  const oz = b.center[2] * e.scale[2];
  // Trees collide with their trunk + inner crown, not the full outline, so they fit on a 3 m sidewalk.
  const k = e.type === 'tree' ? 0.6 : 1;
  return {
    cx: e.position[0] + c * ox + s * oz,
    cz: e.position[2] - s * ox + c * oz,
    hx: (b.size[0] * k * Math.abs(e.scale[0])) / 2,
    hz: (b.size[2] * k * Math.abs(e.scale[2])) / 2 + padZ,
    a: e.rotation[1],
  };
}

/** Separating-axis test for two oriented rectangles (touching edges do not overlap). */
export function obbOverlap(p: Obb, q: Obb, eps = 0.05): boolean {
  const axes = (o: Obb): [[number, number], [number, number]] => [[Math.cos(o.a), -Math.sin(o.a)], [Math.sin(o.a), Math.cos(o.a)]];
  const dx = q.cx - p.cx;
  const dz = q.cz - p.cz;
  const [pa, pb] = axes(p);
  const [qa, qb] = axes(q);
  for (const [ax, az] of [pa, pb, qa, qb]) {
    const rp = p.hx * Math.abs(pa[0] * ax + pa[1] * az) + p.hz * Math.abs(pb[0] * ax + pb[1] * az);
    const rq = q.hx * Math.abs(qa[0] * ax + qa[1] * az) + q.hz * Math.abs(qb[0] * ax + qb[1] * az);
    if (Math.abs(dx * ax + dz * az) >= rp + rq - eps) return false;
  }
  return true;
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** World-space XZ axis-aligned bounds of an entity. */
export function footprintRect(e: SceneEntity): Rect {
  const o = obbOf(e);
  const c = Math.abs(Math.cos(o.a));
  const s = Math.abs(Math.sin(o.a));
  const ex = o.hx * c + o.hz * s;
  const ez = o.hx * s + o.hz * c;
  return { minX: o.cx - ex, maxX: o.cx + ex, minZ: o.cz - ez, maxZ: o.cz + ez };
}

export function rectsOverlap(a: Rect, b: Rect, eps = 0.05): boolean {
  return a.minX < b.maxX - eps && a.maxX > b.minX + eps && a.minZ < b.maxZ - eps && a.maxZ > b.minZ + eps;
}

export const WORLD_HALF = 200;

/** Placement categories. */
type Kind = 'building' | 'lot' | 'road' | 'rail' | 'overpass' | 'vehicle' | 'small';
function kindOf(e: SceneEntity): Kind {
  if (e.type === 'building') return 'building';
  if (e.type === 'lot') return 'lot';
  if (e.type === 'road') return 'road';
  if (e.type === 'vehicle') return 'vehicle';
  if (e.assetId === 'prim:rail') return 'rail';
  if (e.assetId === 'prim:pipe-bridge') return 'overpass';
  return 'small';
}

const MSG = {
  road: "yo'l ustiga tushadi",
  sidewalk: "yo'l yoki piyodalar yo'lagi ustiga tushadi",
  building: 'bino bilan ustma-ust tushadi',
  lot: 'boshqa uchastka bilan ustma-ust tushadi',
  rail: "temir yo'l ustiga tushadi",
  object: 'boshqa obyekt bilan ustma-ust tushadi',
};

/**
 * Placement rules (Gate 2): buildings never overlap buildings, roads or sidewalks;
 * lots/parking never sit on roads; roads never cross buildings or lots;
 * small props may stand on sidewalks but not on asphalt; cars may be on roads and lots.
 * Returns a human-readable reason or null.
 */
export function placementProblem(candidate: SceneEntity, others: readonly SceneEntity[]): string | null {
  const r = footprintRect(candidate);
  if (r.minX < -WORLD_HALF || r.maxX > WORLD_HALF || r.minZ < -WORLD_HALF || r.maxZ > WORLD_HALF) {
    return 'Sahna chegarasidan tashqarida';
  }
  const k = kindOf(candidate);
  if (k === 'overpass') {
    // elevated: only its towers touch the ground; they must not stand inside buildings
    for (const o of others) if (o.id !== candidate.id && o.type === 'building' && obbOverlap(obbOf(candidate), obbOf(o))) return MSG.building;
    return null;
  }
  const self = obbOf(candidate);
  const selfCorridor = k === 'road' ? obbOf(candidate, SIDEWALK_WIDTH) : self;
  for (const o of others) {
    if (o.id === candidate.id) continue;
    const ok = kindOf(o);
    if (ok === 'overpass') continue;
    switch (k) {
      case 'building':
        if (ok === 'building' && obbOverlap(self, obbOf(o))) return MSG.building;
        if (ok === 'road' && obbOverlap(self, obbOf(o, SIDEWALK_WIDTH))) return MSG.sidewalk;
        if (ok === 'rail' && obbOverlap(self, obbOf(o))) return MSG.rail;
        if ((ok === 'small' || ok === 'vehicle') && obbOverlap(self, obbOf(o))) return MSG.object;
        break;
      case 'lot':
        if (ok === 'lot' && obbOverlap(self, obbOf(o))) return MSG.lot;
        if (ok === 'road' && obbOverlap(self, obbOf(o, SIDEWALK_WIDTH))) return MSG.sidewalk;
        if (ok === 'rail' && obbOverlap(self, obbOf(o))) return MSG.rail;
        break;
      case 'road':
        if ((ok === 'building' || ok === 'lot' || ok === 'rail') && obbOverlap(selfCorridor, obbOf(o))) {
          return ok === 'building' ? MSG.building : ok === 'lot' ? MSG.lot : MSG.rail;
        }
        break;
      case 'rail':
        if ((ok === 'building' || ok === 'lot' || ok === 'rail') && obbOverlap(self, obbOf(o))) return MSG.object;
        if (ok === 'road' && obbOverlap(self, obbOf(o, SIDEWALK_WIDTH))) return MSG.road;
        break;
      case 'vehicle':
        if ((ok === 'building' || ok === 'small' || ok === 'vehicle' || ok === 'rail') && obbOverlap(self, obbOf(o))) return MSG.object;
        break;
      case 'small':
        if ((ok === 'building' || ok === 'small' || ok === 'vehicle' || ok === 'rail') && obbOverlap(self, obbOf(o))) return MSG.object;
        if (ok === 'road' && obbOverlap(self, obbOf(o))) return MSG.road;
        break;
    }
  }
  return null;
}

export function snap(v: number, step: number): number {
  const r = Math.round(v / step) * step;
  return Object.is(r, -0) ? 0 : Math.round(r * 1e4) / 1e4;
}
