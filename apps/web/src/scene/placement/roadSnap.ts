import type { SceneEntity } from '@scene/schema';
import { roadMeta, SIDEWALK_WIDTH, snap } from '../../lib/geometry.ts';
import { ROAD_STEP } from '../../editor/store.ts';

export const NODE_SNAP_RADIUS = 4;
export const EDGE_SNAP_RADIUS = 3;

interface Centerline {
  ax: number;
  az: number;
  ux: number;
  uz: number;
  L: number;
  w: number;
}

function centerlines(entities: readonly SceneEntity[]): Centerline[] {
  const out: Centerline[] = [];
  for (const e of entities) {
    if (e.type !== 'road') continue;
    const { length, width } = roadMeta(e);
    const L = length * Math.abs(e.scale[0]);
    const ux = Math.cos(e.rotation[1]);
    const uz = -Math.sin(e.rotation[1]);
    out.push({ ax: e.position[0] - (ux * L) / 2, az: e.position[2] - (uz * L) / 2, ux, uz, L, w: width * Math.abs(e.scale[2]) });
  }
  return out;
}

/** Both endpoints of every road (video: new roads start from existing road nodes). */
export function roadNodes(entities: readonly SceneEntity[]): [number, number][] {
  return centerlines(entities).flatMap((c) => [[c.ax, c.az], [c.ax + c.ux * c.L, c.az + c.uz * c.L]] as [number, number][]);
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

/**
 * Road tool snapping (video 0–5 s): an existing road end node first, then any point
 * on an existing road's centre line (T-junction), otherwise the 2 m grid.
 */
export function snapRoadPoint(x: number, z: number, entities: readonly SceneEntity[], snapOn: boolean): [number, number] {
  let best: [number, number] | null = null;
  let bestD = NODE_SNAP_RADIUS;
  for (const n of roadNodes(entities)) {
    const d = Math.hypot(n[0] - x, n[1] - z);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  if (best) return [r4(best[0]), r4(best[1])];
  let bestLine: [number, number] | null = null;
  bestD = NODE_SNAP_RADIUS;
  for (const c of centerlines(entities)) {
    const t = Math.min(c.L, Math.max(0, (x - c.ax) * c.ux + (z - c.az) * c.uz));
    const px = c.ax + c.ux * t;
    const pz = c.az + c.uz * t;
    const d = Math.hypot(px - x, pz - z);
    if (d < bestD) {
      bestD = d;
      // keep the junction on the grid along the road when it is axis-aligned
      const gx = Math.abs(c.ux) > 0.999 && snapOn ? snap(px, ROAD_STEP) : px;
      const gz = Math.abs(c.uz) > 0.999 && snapOn ? snap(pz, ROAD_STEP) : pz;
      bestLine = [r4(gx), r4(gz)];
    }
  }
  if (bestLine) return bestLine;
  return snapOn ? [snap(x, ROAD_STEP), snap(z, ROAD_STEP)] : [x, z];
}

/**
 * Lot / footprint corner snapping (video 8–10 s: the lot outline locks to the block edge):
 * each coordinate snaps to the outer edge of a nearby sidewalk, otherwise to the 2 m grid.
 */
export function snapRectPoint(x: number, z: number, entities: readonly SceneEntity[], snapOn: boolean): [number, number] {
  if (!snapOn) return [x, z];
  let sx = snap(x, ROAD_STEP);
  let sz = snap(z, ROAD_STEP);
  let dx = EDGE_SNAP_RADIUS;
  let dz = EDGE_SNAP_RADIUS;
  for (const c of centerlines(entities)) {
    const off = c.w / 2 + SIDEWALK_WIDTH;
    const t = (x - c.ax) * c.ux + (z - c.az) * c.uz;
    if (t < -off || t > c.L + off) continue;
    if (Math.abs(c.ux) > 0.999) {
      for (const edge of [c.az - off, c.az + off]) {
        const d = Math.abs(z - edge);
        if (d < dz) {
          dz = d;
          sz = r4(edge);
        }
      }
    } else if (Math.abs(c.uz) > 0.999) {
      for (const edge of [c.ax - off, c.ax + off]) {
        const d = Math.abs(x - edge);
        if (d < dx) {
          dx = d;
          sx = r4(edge);
        }
      }
    }
  }
  return [sx, sz];
}
