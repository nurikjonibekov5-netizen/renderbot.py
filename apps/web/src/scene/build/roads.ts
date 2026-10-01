import type { SceneEntity } from '@scene/schema';
import { GeoBuilder, cachedShape, type BuiltShape } from './builder.ts';
import { COL } from './colors.ts';
import { roadMeta } from '../../lib/geometry.ts';

export const SIDEWALK = 3;

/** Where another road meets this one: t along this road (from its start), the other road's width and the side it lies on. */
export interface Crossing {
  t: number;
  width: number;
  /** 0 = crosses through; 1 / -1 = a T-junction on local +Z / −Z side */
  side: 0 | 1 | -1;
}

interface Seg {
  id: string;
  ax: number;
  az: number;
  ux: number;
  uz: number;
  L: number;
  w: number;
  /** local +Z in world */
  nx: number;
  nz: number;
}

function toSeg(e: SceneEntity): Seg {
  const { length, width } = roadMeta(e);
  const L = length * Math.abs(e.scale[0]);
  const th = e.rotation[1];
  const ux = Math.cos(th);
  const uz = -Math.sin(th);
  return {
    id: e.id,
    ax: e.position[0] - (ux * L) / 2,
    az: e.position[2] - (uz * L) / 2,
    ux, uz, L,
    w: width * Math.abs(e.scale[2]),
    nx: Math.sin(th),
    nz: Math.cos(th),
  };
}

/** Road network: for every road, the crossings with all other roads (X and T junctions, video 6–8 s). */
export function computeCrossings(roads: readonly SceneEntity[]): Map<string, Crossing[]> {
  const segs = roads.map(toSeg);
  const out = new Map<string, Crossing[]>(segs.map((s) => [s.id, []]));
  for (let i = 0; i < segs.length; i += 1) {
    for (let j = i + 1; j < segs.length; j += 1) {
      const A = segs[i]!;
      const B = segs[j]!;
      const den = A.ux * B.uz - A.uz * B.ux;
      if (Math.abs(den) < 1e-6) continue;
      const dx = B.ax - A.ax;
      const dz = B.az - A.az;
      const t = (dx * B.uz - dz * B.ux) / den;
      const s = (dx * A.uz - dz * A.ux) / den;
      const eps = 1;
      if (t < -eps || t > A.L + eps || s < -eps || s > B.L + eps) continue;
      const sideOf = (self: Seg, other: Seg, param: number, selfParam: number): 0 | 1 | -1 => {
        // does `other` continue on both sides of `self`?
        const margin = self.w / 2 + 1;
        if (param > margin && param < other.L - margin) return 0;
        const dir = param <= margin ? 1 : -1;
        const d = dir * (other.ux * self.nx + other.uz * self.nz);
        void selfParam;
        return d >= 0 ? 1 : -1;
      };
      out.get(A.id)!.push({ t: Math.min(A.L, Math.max(0, t)), width: B.w, side: sideOf(A, B, s, t) });
      out.get(B.id)!.push({ t: Math.min(B.L, Math.max(0, s)), width: A.w, side: sideOf(B, A, t, s) });
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.t - b.t);
  return out;
}

/** [0, L] minus the given cut intervals. */
function intervals(L: number, cuts: [number, number][]): [number, number][] {
  const sorted = cuts.map(([a, b]) => [Math.max(0, a), Math.min(L, b)] as [number, number]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const res: [number, number][] = [];
  let cur = 0;
  for (const [a, b] of sorted) {
    if (a > cur) res.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (cur < L) res.push([cur, L]);
  return res.filter(([a, b]) => b - a > 0.2);
}

/** Asphalt, dashed centre line, raised sidewalks with curbs, zebra crossings at junctions (image 6). */
export function roadShape(length: number, width: number, crossings: readonly Crossing[]): BuiltShape {
  const key = `road|${length}|${width}|${crossings.map((c) => `${c.t.toFixed(2)}:${c.width}:${c.side}`).join(',')}`;
  return cachedShape(key, () => {
    const b = new GeoBuilder();
    const L = length;
    const x = (t: number) => t - L / 2;
    b.box(L, 0.04, width, 0, 0.02, 0, COL.asphalt);

    // dashed centre line, interrupted at junctions and crosswalks
    const markCuts = crossings.map((c) => [c.t - c.width / 2 - SIDEWALK - 0.5, c.t + c.width / 2 + SIDEWALK + 0.5] as [number, number]);
    for (const [a, z] of intervals(L, markCuts)) {
      for (let t = a + 1.5; t + 3 <= z; t += 6) b.box(3, 0.012, 0.2, x(t + 1.5), 0.046, 0, COL.line);
    }

    // sidewalks on both sides, cut where another road's asphalt passes
    for (const side of [1, -1] as const) {
      const cuts = crossings.filter((c) => c.side === 0 || c.side === side).map((c) => [c.t - c.width / 2, c.t + c.width / 2] as [number, number]);
      for (const [a, z] of intervals(L, cuts)) {
        const len = z - a;
        b.box(len, 0.16, SIDEWALK - 0.25, x(a + len / 2), 0.08, side * (width / 2 + 0.25 + (SIDEWALK - 0.25) / 2), COL.sidewalk);
        b.box(len, 0.18, 0.25, x(a + len / 2), 0.09, side * (width / 2 + 0.125), COL.curb);
      }
    }

    // zebra crossings on each arm next to a junction
    for (const c of crossings) {
      for (const dir of [-1, 1]) {
        const t = c.t + dir * (c.width / 2 + SIDEWALK / 2 + 0.3);
        if (t < 2 || t > L - 2) continue;
        for (let z = -width / 2 + 0.9; z <= width / 2 - 0.6; z += 1.05) b.box(2.4, 0.012, 0.55, x(t), 0.047, z + 0.25, COL.line);
      }
    }
    return b.result();
  });
}
