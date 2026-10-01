import * as THREE from 'three';
import { createRng, type LotMeta } from '@scene/schema';
import { GeoBuilder, cachedShape, hashString, type BuiltShape } from './builder.ts';
import { CAR_COLORS, COL, WAGON_COLORS } from './colors.ts';

/** Snowy white cone tree (images 2 and 6). */
export const coneTree = () => cachedShape('tree-cone', () => {
  const b = new GeoBuilder();
  b.cylinder(0.22, 1, 0, 0.5, 0, COL.trunk, 6);
  b.cone(1.7, 3.2, 0, 2.4, 0, COL.snow, 8);
  b.cone(1.25, 2.6, 0, 3.9, 0, COL.snow, 8, 0.3);
  b.cone(0.8, 2, 0, 5.3, 0, COL.snow, 8, 0.6);
  return b.result();
});

/** Dark green pine with snow on the tips (image 6, left). */
export const pineTree = () => cachedShape('tree-pine', () => {
  const b = new GeoBuilder();
  b.cylinder(0.22, 1, 0, 0.5, 0, COL.trunk, 6);
  b.cone(1.7, 2.4, 0, 2, 0, COL.pine, 8);
  b.cone(1.6, 0.6, 0, 3.0, 0, COL.snow, 8);
  b.cone(1.25, 2.1, 0, 3.6, 0, COL.pine, 8, 0.3);
  b.cone(1.15, 0.5, 0, 4.5, 0, COL.snow, 8, 0.3);
  b.cone(0.8, 1.8, 0, 5.1, 0, COL.pine, 8, 0.6);
  b.cone(0.55, 0.7, 0, 5.85, 0, COL.snow, 8, 0.6);
  return b.result();
});

/** Rounded white low-poly tree cluster (image 2). */
export const roundTree = () => cachedShape('tree-round', () => {
  const b = new GeoBuilder();
  b.cylinder(0.24, 2, 0, 1, 0, COL.trunk, 6);
  b.ico(1.7, 0, 3.5, 0, COL.snow, 1.05);
  b.ico(1.15, 0.9, 4.4, 0.5, COL.snowShade, 1);
  b.ico(1.0, -0.8, 4.3, -0.6, COL.snow, 1);
  return b.result();
});

/** Green box-cut tree with a snow cap (image 6, along the clinic). */
export const boxTree = () => cachedShape('tree-box', () => {
  const b = new GeoBuilder();
  b.box(0.3, 1.2, 0.3, 0, 0.6, 0, COL.trunk);
  b.box(1.5, 2.3, 1.5, 0, 2.35, 0, COL.leaf);
  b.box(1.6, 0.3, 1.6, 0, 3.6, 0, COL.snow);
  return b.result();
});

export const hedge = () => cachedShape('hedge', () => {
  const b = new GeoBuilder();
  b.box(4, 1.1, 1.2, 0, 0.55, 0, COL.hedge);
  b.box(4.05, 0.2, 1.25, 0, 1.15, 0, COL.snow);
  return b.result();
});

export const lamp = () => cachedShape('lamp', () => {
  const b = new GeoBuilder();
  b.cylinder(0.09, 5.4, 0, 2.7, 0, COL.metal, 8);
  b.box(1.0, 0.1, 0.12, 0.45, 5.35, 0, COL.metal);
  b.glow.box(0.5, 0.12, 0.3, 0.9, 5.25, 0, COL.lampGlow);
  b.box(0.56, 0.1, 0.36, 0.9, 5.36, 0, COL.metal);
  return b.result();
});

/** Traffic light: pole + head with red/amber/green (image 6 corners). Faces local +Z. */
export const trafficLight = () => cachedShape('traffic-light', () => {
  const b = new GeoBuilder();
  b.cylinder(0.09, 3.6, 0, 1.8, 0, COL.black, 8);
  b.box(0.42, 1.15, 0.32, 0, 3.75, 0, COL.black);
  b.glow.box(0.22, 0.22, 0.05, 0, 4.1, 0.17, COL.red);
  b.box(0.22, 0.22, 0.05, 0, 3.75, 0.17, COL.metal);
  b.box(0.22, 0.22, 0.05, 0, 3.4, 0.17, COL.metal);
  return b.result();
});

function addCar(b: GeoBuilder, x: number, z: number, rot: number, paint: THREE.Color) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (lx: number, lz: number): [number, number] => [x + c * lx + s * lz, z - s * lx + c * lz];
  let p = at(0, 0);
  b.box(4.2, 0.75, 1.8, p[0], 0.62, p[1], paint, rot);
  p = at(-0.25, 0);
  b.box(2.3, 0.62, 1.62, p[0], 1.28, p[1], COL.windowDark, rot);
  b.box(2.0, 0.08, 1.5, p[0], 1.62, p[1], paint, rot);
  for (const [wx, wz] of [[1.35, 0.82], [-1.35, 0.82], [1.35, -0.82], [-1.35, -0.82]] as const) {
    p = at(wx, wz);
    b.box(0.68, 0.62, 0.26, p[0], 0.31, p[1], COL.black, rot);
  }
  p = at(2.11, 0.6);
  b.glow.box(0.04, 0.16, 0.3, p[0], 0.75, p[1], COL.lampGlow, rot);
  p = at(2.11, -0.6);
  b.glow.box(0.04, 0.16, 0.3, p[0], 0.75, p[1], COL.lampGlow, rot);
}

/** One parked car (vehicle entity); `color` is an index into CAR_COLORS. Faces local +X. */
export const car = (color: number) => cachedShape(`car${color}`, () => {
  const b = new GeoBuilder();
  addCar(b, 0, 0, 0, CAR_COLORS[((color % CAR_COLORS.length) + CAR_COLORS.length) % CAR_COLORS.length]!);
  return b.result();
});

/** Unit car geometry (white paint) for instanced traffic; paint comes from instance colours. */
export const trafficCar = () => cachedShape('car-traffic', () => {
  const b = new GeoBuilder();
  addCar(b, 0, 0, 0, new THREE.Color(1, 1, 1));
  return b.result();
});

/** Ground parcel: paving, plaza or parking bays with seeded parked cars (images 2 and 6). */
export function lotShape(id: string, m: LotMeta): BuiltShape {
  return cachedShape(`lot|${id}|${m.width}|${m.depth}|${m.surface}`, () => {
    const b = new GeoBuilder();
    const { width: w, depth: d } = m;
    if (m.surface === 'parking') {
      b.box(w, 0.06, d, 0, 0.03, 0, COL.asphalt);
      b.box(w + 0.5, 0.14, 0.25, 0, 0.07, -d / 2 - 0.12, COL.curb);
      b.box(w + 0.5, 0.14, 0.25, 0, 0.07, d / 2 + 0.12, COL.curb);
      b.box(0.25, 0.14, d, -w / 2 - 0.12, 0.07, 0, COL.curb);
      b.box(0.25, 0.14, d, w / 2 + 0.12, 0.07, 0, COL.curb);
      const rng = createRng(hashString(id));
      // bays 2.6 m wide, 5.2 m deep along both long edges, aisle in the middle
      const rows = d >= 14 ? [-d / 2 + 2.6, d / 2 - 2.6] : [0];
      const n = Math.floor((w - 1) / 2.6);
      const x0 = -((n - 1) * 2.6) / 2;
      for (const rz of rows) {
        for (let i = 0; i <= n; i += 1) b.box(0.12, 0.012, 5, x0 - 1.3 + i * 2.6, 0.065, rz, COL.line);
        for (let i = 0; i < n; i += 1) {
          if (rng() < 0.3) continue;
          const paint = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)]!;
          addCar(b, x0 + i * 2.6, rz + (rng() - 0.5) * 0.3, Math.PI / 2 + (rz > 0 ? Math.PI : 0) + (rng() - 0.5) * 0.06, paint);
        }
      }
    } else {
      const color = m.surface === 'plaza' ? COL.plaza : COL.paving;
      b.box(w, 0.08, d, 0, 0.04, 0, color);
      const step = m.surface === 'plaza' ? 4 : 6;
      for (let x = -w / 2 + step; x < w / 2 - 0.5; x += step) b.box(0.08, 0.01, d, x, 0.085, 0, COL.pavingLine);
      for (let z = -d / 2 + step; z < d / 2 - 0.5; z += step) b.box(w, 0.01, 0.08, 0, 0.085, z, COL.pavingLine);
    }
    return b.result();
  });
}

/** Railway corridor along local X: ballast, 2–3 tracks, freight trains (images 2 and 6). */
export function railShape(id: string, length: number, tracks: number): BuiltShape {
  return cachedShape(`rail|${id}|${length}|${tracks}`, () => {
    const b = new GeoBuilder();
    const rng = createRng(hashString(id));
    const gap = 5;
    const width = tracks * gap + 2;
    b.box(length, 0.12, width, 0, 0.06, 0, COL.snowShade);
    for (let t = 0; t < tracks; t += 1) {
      const z = -((tracks - 1) * gap) / 2 + t * gap;
      b.box(length, 0.1, 3.2, 0, 0.17, z, COL.ballast);
      for (let x = -length / 2 + 0.4; x < length / 2; x += 1.1) b.box(0.3, 0.08, 2.6, x, 0.25, z, COL.sleeper);
      b.box(length, 0.16, 0.12, 0, 0.36, z - 0.72, COL.rail);
      b.box(length, 0.16, 0.12, 0, 0.36, z + 0.72, COL.rail);
      if (rng() < 0.25) continue;
      // a freight train: locomotive + wagons
      const wagons = 6 + Math.floor(rng() * 12);
      let x = -length / 2 + 10 + rng() * Math.max(1, length - wagons * 13 - 20);
      b.box(16, 3.4, 2.9, x + 8, 2.3, z, COL.glassDark);
      b.box(15.6, 0.5, 3, x + 8, 4.2, z, COL.amber);
      x += 17;
      const paint = WAGON_COLORS[Math.floor(rng() * WAGON_COLORS.length)]!;
      for (let i = 0; i < wagons && x < length / 2 - 13; i += 1) {
        const pc = rng() < 0.75 ? paint : WAGON_COLORS[Math.floor(rng() * WAGON_COLORS.length)]!;
        b.box(12, 2.6, 2.9, x + 6, 1.95, z, pc);
        b.box(11.6, 0.18, 2.7, x + 6, 3.3, z, COL.snow);
        b.box(12.4, 0.5, 2.2, x + 6, 0.7, z, COL.black);
        x += 13;
      }
    }
    return b.result();
  });
}

/** Elevated pipe bridge on lattice towers (images 2 and 6). Runs along local X at ~8 m. */
export function pipeBridgeShape(length: number): BuiltShape {
  return cachedShape(`pipe|${length}`, () => {
    const b = new GeoBuilder();
    const y = 8;
    for (const z of [-0.55, 0.55]) {
      b.geometry(new THREE.CylinderGeometry(0.5, 0.5, length, 12), new THREE.Matrix4().compose(
        new THREE.Vector3(0, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(1, 1, 1)), COL.pipe);
    }
    b.box(length, 0.15, 1.9, 0, y - 0.62, 0, COL.truss);
    const towers = Math.max(2, Math.round(length / 22) + 1);
    for (let i = 0; i < towers; i += 1) {
      const x = -length / 2 + (length / (towers - 1)) * i;
      for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]] as const) b.box(0.14, y - 0.6, 0.14, x + dx, (y - 0.6) / 2, dz, COL.truss);
      for (let h = 1.2; h < y - 0.8; h += 1.6) {
        b.box(1.5, 0.1, 0.1, x, h, -0.7, COL.truss);
        b.box(1.5, 0.1, 0.1, x, h, 0.7, COL.truss);
        b.box(0.1, 0.1, 1.5, x - 0.7, h + 0.8, 0, COL.truss);
        b.box(0.1, 0.1, 1.5, x + 0.7, h + 0.8, 0, COL.truss);
      }
    }
    return b.result();
  });
}
