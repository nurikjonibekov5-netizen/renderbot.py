import * as THREE from 'three';

/**
 * Merges many coloured boxes / primitives into one BufferGeometry with vertex colours,
 * so a whole building is 1–2 draw calls instead of hundreds of meshes.
 * Two layers: `solid` (lit, casts shadows) and `glow` (unlit warm windows).
 */
export class GeoBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private idx: number[] = [];
  private glowB: GeoBuilder | null = null;

  get glow(): GeoBuilder {
    if (!this.glowB) this.glowB = new GeoBuilder();
    return this.glowB;
  }

  /** Axis-aligned (optionally Y-rotated) box centred at (x, y, z). */
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: THREE.Color, rotY = 0): this {
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    // local → world: x' = c*lx + s*lz, z' = -s*lx + c*lz
    const tx = (lx: number, lz: number) => x + c * lx + s * lz;
    const tz = (lx: number, lz: number) => z - s * lx + c * lz;
    const faces: [number[], [number, number, number][]][] = [
      [[1, 0, 0], [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]]],
      [[-1, 0, 0], [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]]],
      [[0, 1, 0], [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]]],
      [[0, -1, 0], [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]]],
      [[0, 0, 1], [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]]],
      [[0, 0, -1], [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]]],
    ];
    for (const [n, verts] of faces) {
      const base = this.pos.length / 3;
      const nx = c * n[0]! + s * n[2]!;
      const nz = -s * n[0]! + c * n[2]!;
      for (const [lx, ly, lz] of verts) {
        this.pos.push(tx(lx, lz), y + ly, tz(lx, lz));
        this.nor.push(nx, n[1]!, nz);
        this.col.push(color.r, color.g, color.b);
      }
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return this;
  }

  /** Appends any indexed/non-indexed geometry transformed by `matrix`. */
  geometry(geo: THREE.BufferGeometry, matrix: THREE.Matrix4, color: THREE.Color): this {
    const g = geo;
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const n = g.getAttribute('normal') as THREE.BufferAttribute;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3();
    const base = this.pos.length / 3;
    for (let i = 0; i < p.count; i += 1) {
      v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      this.pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
      this.nor.push(v.x, v.y, v.z);
      this.col.push(color.r, color.g, color.b);
    }
    if (g.index) for (let i = 0; i < g.index.count; i += 1) this.idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i += 1) this.idx.push(base + i);
    return this;
  }

  cylinder(r: number, h: number, x: number, y: number, z: number, color: THREE.Color, seg = 10): this {
    return this.geometry(prim.cylinder(seg), new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, h, r)), color);
  }

  cone(r: number, h: number, x: number, y: number, z: number, color: THREE.Color, seg = 7, rotY = 0): this {
    return this.geometry(prim.cone(seg), new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, rotY), new THREE.Vector3(r, h, r)), color);
  }

  ico(r: number, x: number, y: number, z: number, color: THREE.Color, sy = 1): this {
    return this.geometry(prim.ico(), new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, r * sy, r)), color);
  }

  /**
   * Baked ambient occlusion: multiplies vertex colours by `f(x, y, z)` (0…1).
   * Used to darken the foot of facades and the corners where walls meet the ground.
   */
  shade(f: (x: number, y: number, z: number) => number): this {
    for (let i = 0; i < this.pos.length; i += 3) {
      const k = f(this.pos[i]!, this.pos[i + 1]!, this.pos[i + 2]!);
      this.col[i] = this.col[i]! * k;
      this.col[i + 1] = this.col[i + 1]! * k;
      this.col[i + 2] = this.col[i + 2]! * k;
    }
    return this;
  }

  result(): BuiltShape {
    return { solid: this.build(), glow: this.glowB ? this.glowB.build() : null };
  }

  isEmpty(): boolean {
    return this.idx.length === 0;
  }

  build(): THREE.BufferGeometry | null {
    if (this.isEmpty()) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    const count = this.pos.length / 3;
    g.setIndex(count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }
}

const UP = new THREE.Vector3(0, 1, 0);

/** Unit primitives (radius 1, height 1, centred) reused by the builder. */
const primCache = new Map<string, THREE.BufferGeometry>();
const cached = (key: string, make: () => THREE.BufferGeometry) => {
  let g = primCache.get(key);
  if (!g) {
    g = make();
    g.deleteAttribute('uv');
    primCache.set(key, g);
  }
  return g;
};
export const prim = {
  cylinder: (seg: number) => cached(`cyl${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg)),
  cone: (seg: number) => cached(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg)),
  ico: () => cached('ico', () => new THREE.IcosahedronGeometry(1, 0)),
};

/** Built geometry pair for one shape. */
export interface BuiltShape {
  solid: THREE.BufferGeometry | null;
  glow: THREE.BufferGeometry | null;
}

/**
 * Small LRU cache of built shapes keyed by their parameters, so identical props
 * (all cone trees, all lamps) share one geometry and undo/redo does not rebuild.
 */
const shapeCache = new Map<string, BuiltShape>();
export function cachedShape(key: string, make: () => BuiltShape): BuiltShape {
  const hit = shapeCache.get(key);
  if (hit) {
    shapeCache.delete(key);
    shapeCache.set(key, hit);
    return hit;
  }
  const v = make();
  shapeCache.set(key, v);
  if (shapeCache.size > 400) {
    const oldest = shapeCache.keys().next().value as string;
    const old = shapeCache.get(oldest);
    shapeCache.delete(oldest);
    // Disposal is deferred: an entity may still be rendering the evicted geometry this frame.
    setTimeout(() => { old?.solid?.dispose(); old?.glow?.dispose(); }, 2000);
  }
  return v;
}

/** Shared materials: vertex colours, never mutated by selection or ghosts. */
export const SOLID_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
export const GLOW_MAT = new THREE.MeshBasicMaterial({ vertexColors: true });

/** Deterministic hash of a string (for per-entity seeds). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
