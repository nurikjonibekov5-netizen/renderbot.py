import * as THREE from 'three';
import { createRng, type BuildingMeta, type BuildingStyle, type FaceKey } from '@scene/schema';
import { GeoBuilder, cachedShape, hashString, type BuiltShape } from './builder.ts';
import { COL } from './colors.ts';

/** A facade segment in local XZ; the outward normal is (u.z, -u.x). */
interface Seg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  face?: FaceKey;
  entrance?: boolean;
}

interface FacadeOpts {
  floors: number;
  storey: number;
  style: BuildingStyle;
  storefront: boolean;
  rng: () => number;
  litChance: number;
}

/** Places boxes along a segment: t = distance along it, out = offset along the outward normal. */
function along(b: GeoBuilder, s: Seg) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const nx = uz;
  const nz = -ux;
  const rot = Math.atan2(-uz, ux);
  const put = (t: number, out: number, y: number, w: number, h: number, d: number, color: THREE.Color, glow = false) => {
    (glow ? b.glow : b).box(w, h, d, s.ax + ux * t + nx * out, y, s.az + uz * t + nz * out, color, rot);
  };
  return { L, put };
}

const bays = (L: number, target: number) => Math.max(1, Math.round(L / target));

/** Zlín functionalism (images 2, 4, 5): white concrete frame, red brick spandrels, blue-grey glazing, some warm windows. */
function brickFacade(b: GeoBuilder, s: Seg, o: FacadeOpts) {
  const { L, put } = along(b, s);
  const n = bays(L, 3.1);
  const m = L / n;
  const H = o.floors * o.storey;
  for (let i = 0; i < o.floors; i += 1) {
    const y0 = i * o.storey;
    if (i === 0 && o.storefront) {
      storefront(put, L, n, m, y0, o);
      continue;
    }
    put(L / 2, 0.08, y0 + 0.15, L + 0.04, 0.3, 0.3, COL.frame);
    put(L / 2, 0.02, y0 + 0.3 + 0.45, L, 0.9, 0.22, COL.brick);
    const wy = y0 + 1.2;
    const wh = o.storey - 1.25;
    for (let j = 0; j < n; j += 1) {
      const lit = o.rng() < o.litChance;
      put(m * (j + 0.5), 0.0, wy + wh / 2, m - 0.18, wh, 0.14, lit ? COL.warm : COL.glass, lit);
      put(m * j, 0.06, wy + wh / 2, 0.14, wh, 0.2, COL.mullion);
    }
  }
  // piers every two bays + corners, full height
  for (let j = 0; j <= n; j += 2) put(Math.min(L - 0.18, Math.max(0.18, m * j)), 0.12, H / 2, 0.36, H, 0.4, COL.frame);
  if (n % 2 === 1) put(L - 0.18, 0.12, H / 2, 0.36, H, 0.4, COL.frame);
  put(L / 2, 0.12, H + 0.12, L + 0.1, 0.3, 0.42, COL.frame);
}

/** Glass curtain wall with white slab bands (the glass massing in the video, 14–17 s). */
function glassFacade(b: GeoBuilder, s: Seg, o: FacadeOpts) {
  const { L, put } = along(b, s);
  const n = bays(L, 2.6);
  const m = L / n;
  for (let i = 0; i < o.floors; i += 1) {
    const y0 = i * o.storey;
    if (i === 0 && o.storefront) {
      storefront(put, L, n, m, y0, o);
      continue;
    }
    put(L / 2, 0.1, y0 + 0.25, L + 0.06, 0.5, 0.36, COL.frame);
    const wh = o.storey - 0.5;
    for (let j = 0; j < n; j += 1) {
      const lit = o.rng() < o.litChance * 0.8;
      put(m * (j + 0.5), 0, y0 + 0.5 + wh / 2, m - 0.08, wh, 0.14, lit ? COL.warm : COL.glassDark, lit);
    }
    for (let j = 0; j <= n; j += 1) put(Math.min(L - 0.05, Math.max(0.05, m * j)), 0.05, y0 + 0.5 + wh / 2, 0.1, wh, 0.18, COL.mullion);
  }
  put(L / 2, 0.1, o.floors * o.storey + 0.2, L + 0.06, 0.4, 0.36, COL.frame);
}

/** White facade with pilasters and dark windows (the clinic, image 6). */
function whiteFacade(b: GeoBuilder, s: Seg, o: FacadeOpts) {
  const { L, put } = along(b, s);
  const H = o.floors * o.storey;
  if (s.entrance) {
    entrance(put, L, o);
    return;
  }
  const n = bays(L, 3.2);
  const m = L / n;
  for (let i = 0; i < o.floors; i += 1) {
    const y0 = i * o.storey;
    if (i === 0 && o.storefront) {
      storefront(put, L, n, m, y0, o);
      continue;
    }
    put(L / 2, 0, y0 + o.storey / 2, L, o.storey, 0.24, COL.white);
    const ground = i === 0;
    const wh = ground ? o.storey * 0.72 : o.storey * 0.56;
    const wy = ground ? y0 + 0.15 + wh / 2 : y0 + o.storey * 0.5;
    for (let j = 0; j < n; j += 1) {
      put(m * (j + 0.5), 0.07, wy, m * 0.46, wh, 0.12, COL.windowDark);
      put(m * (j + 0.5), 0.12, wy - wh / 2 - 0.06, m * 0.56, 0.14, 0.2, COL.whiteShade);
    }
    if (ground) put(L / 2, 0.14, y0 + o.storey - 0.25, L + 0.05, 0.32, 0.3, COL.baseDark);
    else put(L / 2, 0.1, y0 + 0.1, L + 0.04, 0.22, 0.28, COL.whiteShade);
  }
  for (let j = 0; j <= n; j += 1) put(Math.min(L - 0.22, Math.max(0.22, m * j)), 0.16, H / 2, 0.44, H, 0.36, COL.white);
  put(L / 2, 0.22, H + 0.1, L + 0.5, 0.55, 0.62, COL.white);
}

/** Corner entrance of the clinic: two-storey dark portal, canopy, steps, sign. */
function entrance(put: ReturnType<typeof along>['put'], L: number, o: FacadeOpts) {
  const H = o.floors * o.storey;
  const portalH = o.storey * 2 - 0.4;
  put(L / 2, 0, H / 2, L, H, 0.3, COL.white);
  put(L / 2, 0.06, portalH / 2 + 0.1, L - 2.2, portalH, 0.2, COL.windowDark);
  put(L / 2, 0.14, portalH / 2 + 0.1, 0.12, portalH, 0.22, COL.baseDark);
  put(0.55, 0.3, H / 2, 1.1, H, 0.5, COL.white);
  put(L - 0.55, 0.3, H / 2, 1.1, H, 0.5, COL.white);
  put(L / 2, 0.9, o.storey * 2 + 0.1, L + 0.6, 0.45, 2.2, COL.white);
  put(L / 2, 0.12, o.storey * 1.3, L * 0.5, 0.35, 0.22, COL.sign, true);
  for (let i = 2; i < o.floors; i += 1) {
    const y0 = i * o.storey;
    put(L * 0.3, 0.14, y0 + o.storey * 0.5, L * 0.22, o.storey * 0.56, 0.12, COL.windowDark);
    put(L * 0.7, 0.14, y0 + o.storey * 0.5, L * 0.22, o.storey * 0.56, 0.12, COL.windowDark);
    put(L / 2, 0.22, y0 + 0.1, L - 1.8, 0.2, 0.2, COL.whiteShade);
  }
  put(L / 2, 1.2, 0.12, L - 1.6, 0.24, 2.6, COL.baseDark);
  put(L / 2, 2.0, 0.06, L - 0.6, 0.12, 4.2, COL.baseDark);
  put(L / 2, 0.22, H + 0.1, L + 0.5, 0.55, 0.62, COL.white);
}

/** Ground-floor shop windows with a white frame (video 22–25 s). */
function storefront(put: ReturnType<typeof along>['put'], L: number, n: number, m: number, y0: number, o: FacadeOpts) {
  const h = o.storey - 0.55;
  put(L / 2, 0.1, y0 + o.storey - 0.27, L + 0.06, 0.5, 0.34, COL.frame);
  for (let j = 0; j < n; j += 1) {
    const lit = o.rng() < 0.5;
    put(m * (j + 0.5), -0.05, y0 + h / 2, m - 0.12, h, 0.12, lit ? COL.warm : COL.glassDark, lit);
  }
  for (let j = 0; j <= n; j += 1) put(Math.min(L - 0.08, Math.max(0.08, m * j)), 0.06, y0 + h / 2, 0.16, h, 0.22, COL.frame);
}

const FACADE: Record<BuildingStyle, (b: GeoBuilder, s: Seg, o: FacadeOpts) => void> = {
  brick: brickFacade,
  glass: glassFacade,
  white: whiteFacade,
};

function rectSegments(w: number, d: number): Seg[] {
  const x = w / 2;
  const z = d / 2;
  return [
    { ax: -x, az: -z, bx: x, bz: -z, face: 'n' },
    { ax: x, az: -z, bx: x, bz: z, face: 'e' },
    { ax: x, az: z, bx: -x, bz: z, face: 's' },
    { ax: -x, az: z, bx: -x, bz: -z, face: 'w' },
  ];
}

/** Clinic footprint: rectangle with the (-X, +Z) corner chamfered towards the crossroads. */
function clinicSegments(w: number, d: number): Seg[] {
  const x = w / 2;
  const z = d / 2;
  const c = Math.min(w, d) * 0.22;
  return [
    { ax: -x, az: -z, bx: x, bz: -z, face: 'n' },
    { ax: x, az: -z, bx: x, bz: z, face: 'e' },
    { ax: x, az: z, bx: -x + c, bz: z, face: 's' },
    { ax: -x + c, az: z, bx: -x, bz: z - c, face: 's', entrance: true },
    { ax: -x, az: z - c, bx: -x, bz: -z, face: 'w' },
  ];
}

function extrude(b: GeoBuilder, segs: Seg[], y: number, h: number, color: THREE.Color, inset = 0) {
  const shape = new THREE.Shape();
  segs.forEach((s, i) => {
    const px = s.ax * (1 - inset);
    const pz = s.az * (1 - inset);
    if (i === 0) shape.moveTo(px, -pz);
    else shape.lineTo(px, -pz);
  });
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  b.geometry(g, new THREE.Matrix4().makeTranslation(0, y, 0), color);
  g.dispose();
}

function roof(b: GeoBuilder, segs: Seg[], w: number, d: number, H: number, rng: () => number, clinic: boolean, dark: boolean) {
  extrude(b, segs, H, 0.35, dark ? COL.roofDark : COL.roof);
  for (const s of segs) {
    const { L, put } = along(b, s);
    put(L / 2, -0.15, H + 0.55, L + 0.3, 0.7, 0.3, COL.parapet);
  }
  if (clinic) {
    // rooftop plant (image 6): two HVAC units with fans, round vent, stair housing, crates
    for (const [x, z] of [[-w * 0.12, -d * 0.28], [w * 0.08, -d * 0.28]] as const) {
      b.box(3.4, 1.3, 2.6, x, H + 1, z, COL.hvac);
      b.cylinder(0.85, 0.12, x, H + 1.7, z, COL.fan, 14);
      b.cylinder(0.35, 0.16, x, H + 1.72, z, COL.hvac, 10);
    }
    b.cylinder(1.4, 1.4, -w * 0.32, H + 1.05, -d * 0.24, COL.hvac, 18);
    b.cylinder(1.15, 0.1, -w * 0.32, H + 1.8, -d * 0.24, COL.fan, 18);
    b.box(6, 2.6, 4.6, w * 0.28, H + 1.65, -d * 0.18, COL.parapet);
    b.box(1.2, 2, 0.1, w * 0.28 - 1.5, H + 1.35, -d * 0.18 + 2.32, COL.windowDark);
    for (const [x, z, s] of [[0.24, 0.22, 1.1], [0.3, 0.26, 0.9], [0.27, 0.32, 1], [0.33, 0.19, 0.8]] as const) {
      b.box(s, s * 0.8, s, w * x, H + 0.35 + s * 0.4, d * z, COL.crate);
    }
    return;
  }
  // Zlín roofs: rows of small skylights, one stair housing
  const nx = Math.max(1, Math.floor(w / 7));
  const nz = Math.max(1, Math.floor(d / 6));
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < nz; j += 1) {
      if (rng() < 0.35) continue;
      const x = -w / 2 + (w / nx) * (i + 0.5);
      const z = -d / 2 + (d / nz) * (j + 0.5);
      b.box(1.8, 0.35, 0.8, x, H + 0.5, z, COL.skylight);
    }
  }
  if (w * d > 200 && rng() < 0.7) b.box(3.2, 2.2, 3.2, (rng() - 0.5) * w * 0.5, H + 1.45, (rng() - 0.5) * d * 0.4, COL.parapet);
}

/** Merged geometry for a procedural building; cached by its parameters and id (the seed). */
export function buildingShape(id: string, m: BuildingMeta): BuiltShape {
  const key = `bld|${id}|${m.width}|${m.depth}|${m.floors}|${m.storeyHeight}|${m.style}|${JSON.stringify(m.faces ?? {})}|${m.ground ?? ''}|${m.kind ?? ''}|${m.roof ?? ''}`;
  return cachedShape(key, () => {
    const b = new GeoBuilder();
    const rng = createRng(hashString(id));
    const clinic = m.kind === 'clinic';
    const segs = clinic ? clinicSegments(m.width, m.depth) : rectSegments(m.width, m.depth);
    const H = m.floors * m.storeyHeight;
    extrude(b, segs, 0, H, COL.core, 0.012);
    for (const s of segs) {
      const style = (s.face && m.faces?.[s.face]) || m.style;
      FACADE[clinic && !m.faces?.[s.face ?? 'n'] ? 'white' : style](b, s, {
        floors: m.floors,
        storey: m.storeyHeight,
        style,
        storefront: m.ground === 'storefront',
        rng,
        litChance: 0.2,
      });
    }
    roof(b, segs, m.width, m.depth, H, rng, clinic, m.roof === 'dark');
    return b.result();
  });
}

/** Total height including parapet and rooftop plant. */
export function buildingTotalHeight(m: BuildingMeta): number {
  return m.floors * m.storeyHeight + (m.kind === 'clinic' ? 3 : 1);
}
