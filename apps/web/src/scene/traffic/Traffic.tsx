import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createRng, type SceneEntity } from '@scene/schema';
import { roadMeta } from '../../lib/geometry.ts';
import { SOLID_MAT, hashString } from '../build/builder.ts';
import { CAR_COLORS } from '../build/colors.ts';
import { trafficCar } from '../build/props.ts';
import { computeCrossings, SIDEWALK } from '../build/roads.ts';
import { isStill } from '../interaction.ts';

/** Signal cycle (s): east–west green, all red, north–south green, all red. */
const CYCLE = 18;
const greenFor = (ew: boolean, t: number) => {
  const p = t % CYCLE;
  return ew ? p < 8 : p >= 9 && p < 17;
};

interface Lane {
  ox: number;
  oz: number;
  ux: number;
  uz: number;
  L: number;
  rot: number;
  ew: boolean;
  /** stop lines along the travel coordinate, ascending */
  stops: number[];
}
interface Car {
  lane: number;
  u: number;
  speed: number;
}

const GAP = 7.5;
const APPROACH = 30;

/**
 * Light street traffic so the city looks alive (Phase 2 requirement 12). Not a full simulation:
 * cars keep their lane, keep a gap to the car ahead and stop at red signals before junctions,
 * then wrap at the road end. State lives in refs and one InstancedMesh — no React state per frame.
 * In ?still mode nothing moves, so screenshots stay deterministic.
 */
export function Traffic({ roads }: { roads: readonly SceneEntity[] }) {
  const { lanes, cars } = useMemo(() => {
    const crossings = computeCrossings(roads);
    const lanes: Lane[] = [];
    const cars: Car[] = [];
    for (const r of roads) {
      const { length, width } = roadMeta(r);
      const L = length * Math.abs(r.scale[0]);
      if (L < 40) continue;
      const rng = createRng(hashString(r.id));
      const th = r.rotation[1];
      const ux = Math.cos(th);
      const uz = -Math.sin(th);
      const nx = Math.sin(th);
      const nz = Math.cos(th);
      const cross = crossings.get(r.id) ?? [];
      for (const dir of [1, -1] as const) {
        const off = dir * (width / 4);
        const sx = r.position[0] - (dir * ux * L) / 2 + nx * off;
        const sz = r.position[2] - (dir * uz * L) / 2 + nz * off;
        const stops = cross
          .map((c) => (dir === 1 ? c.t : L - c.t) - (c.width / 2 + SIDEWALK + 1.5))
          .filter((u) => u > 0)
          .sort((a, b) => a - b);
        const li = lanes.push({ ox: sx, oz: sz, ux: dir * ux, uz: dir * uz, L, rot: th + (dir === 1 ? 0 : Math.PI), ew: Math.abs(ux) > 0.7, stops }) - 1;
        const n = Math.max(1, Math.round(L / 60));
        for (let i = 0; i < n; i += 1) cars.push({ lane: li, u: ((i + rng() * 0.4) / n) * L, speed: 7 + rng() * 3 });
      }
    }
    return { lanes, cars };
  }, [roads]);

  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = trafficCar().solid!;
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1), up: new THREE.Vector3(0, 1, 0) }), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    cars.forEach((_, i) => m.setColorAt(i, CAR_COLORS[(i * 5 + 3) % CAR_COLORS.length]!));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cars]);

  const write = () => {
    const m = mesh.current;
    if (!m) return;
    cars.forEach((c, i) => {
      const l = lanes[c.lane]!;
      tmp.p.set(l.ox + l.ux * c.u, 0, l.oz + l.uz * c.u);
      tmp.q.setFromAxisAngle(tmp.up, l.rot);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      m.setMatrixAt(i, tmp.m);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  };

  const step = (t: number, dt: number) => {
    // car ahead in the same lane (lanes are short lists, n² is fine)
    for (const c of cars) {
      const l = lanes[c.lane]!;
      let limit = c.u + c.speed * dt;
      if (!greenFor(l.ew, t)) {
        const stop = l.stops.find((s) => s >= c.u - 0.01);
        if (stop !== undefined && stop - c.u < APPROACH) limit = Math.min(limit, stop);
      }
      for (const o of cars) {
        if (o === c || o.lane !== c.lane) continue;
        let ahead = o.u - c.u;
        if (ahead <= 0) ahead += l.L;
        if (ahead < GAP + c.speed * dt + 0.5) limit = Math.min(limit, c.u + Math.max(0, ahead - GAP));
      }
      c.u = Math.max(c.u, limit);
      if (c.u > l.L) c.u -= l.L;
    }
  };

  useLayoutEffect(() => write());
  useFrame(({ clock }, delta) => {
    if (isStill()) return;
    step(clock.elapsedTime, Math.min(delta, 0.1));
    write();
  });

  if (!cars.length) return null;
  return (
    <instancedMesh
      key={cars.length}
      ref={mesh}
      args={[geo, SOLID_MAT, cars.length]}
      castShadow
      receiveShadow
      raycast={() => null}
      name="traffic"
    />
  );
}
