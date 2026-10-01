import type { SceneEntity } from '@scene/schema';
import { roadMeta, snap } from '../../lib/geometry.ts';
import { ROAD_STEP } from '../../editor/store.ts';

export const NODE_SNAP_RADIUS = 4;

/** Both endpoints of every road (video: new roads start from existing road nodes). */
export function roadNodes(entities: readonly SceneEntity[]): [number, number][] {
  const out: [number, number][] = [];
  for (const e of entities) {
    if (e.type !== 'road') continue;
    const { length } = roadMeta(e);
    const half = (length * Math.abs(e.scale[0])) / 2;
    const dx = Math.cos(e.rotation[1]) * half;
    const dz = -Math.sin(e.rotation[1]) * half;
    out.push([e.position[0] - dx, e.position[2] - dz], [e.position[0] + dx, e.position[2] + dz]);
  }
  return out;
}

/** Snap to the nearest road node within the radius, otherwise to the 2 m road grid (when snapping is on). */
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
  if (best) return [Math.round(best[0] * 1e4) / 1e4, Math.round(best[1] * 1e4) / 1e4];
  return snapOn ? [snap(x, ROAD_STEP), snap(z, ROAD_STEP)] : [x, z];
}
