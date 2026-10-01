import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneEntity } from '@scene/schema';
import { buildingMeta, roadMeta } from '../../lib/geometry.ts';
import { GEO, MAT } from '../environment/palette.ts';

interface ShapeProps {
  entity: SceneEntity;
  /** Override material for every mesh (ghost preview). */
  override?: THREE.Material;
}

type V3 = [number, number, number];

function Part({ size, at, mat, override, geo = GEO.box }: {
  size: V3; at: V3; mat: THREE.Material; override?: THREE.Material; geo?: THREE.BufferGeometry;
}) {
  return (
    <mesh
      geometry={geo}
      material={override ?? mat}
      position={at}
      scale={size}
      castShadow={!override}
      receiveShadow={!override}
    />
  );
}

function BuildingShape({ entity, override }: ShapeProps) {
  const m = buildingMeta(entity);
  const body = m.floors * m.storeyHeight;
  const bodyMat = m.style === 'white' ? MAT.white : m.style === 'glass' ? MAT.glass : MAT.brick;
  const bandMat = m.style === 'glass' ? MAT.trim : MAT.glass;
  const bands = [];
  for (let i = 0; i < m.floors; i += 1) {
    const ground = i === 0;
    const h = ground ? Math.min(2.2, m.storeyHeight - 0.6) : Math.min(1.1, m.storeyHeight - 1);
    const y = i * m.storeyHeight + (ground ? 0.4 + h / 2 : 1.2 + h / 2);
    bands.push(<Part key={i} size={[m.width + 0.12, h, m.depth + 0.12]} at={[0, y, 0]} mat={bandMat} override={override} />);
  }
  return (
    <>
      <Part size={[m.width, body, m.depth]} at={[0, body / 2, 0]} mat={bodyMat} override={override} />
      {bands}
      <Part size={[m.width + 0.3, 0.6, m.depth + 0.3]} at={[0, body + 0.3, 0]} mat={MAT.roof} override={override} />
    </>
  );
}

const DASH = 3;
const DASH_GAP = 3;

function RoadShape({ entity, override }: ShapeProps) {
  const { length, width } = roadMeta(entity);
  const dashes = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(1, Math.floor(length / (DASH + DASH_GAP)));
  useLayoutEffect(() => {
    const mesh = dashes.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const start = -((count - 1) * (DASH + DASH_GAP)) / 2;
    for (let i = 0; i < count; i += 1) {
      m.compose(new THREE.Vector3(start + i * (DASH + DASH_GAP), 0.045, 0), new THREE.Quaternion(), new THREE.Vector3(DASH, 0.01, 0.22));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count]);
  if (override) return <Part size={[length, 0.06, width]} at={[0, 0.03, 0]} mat={override} override={override} />;
  const edge = width / 2 - 0.45;
  return (
    <>
      <Part size={[length, 0.04, width]} at={[0, 0.02, 0]} mat={MAT.asphalt} />
      <Part size={[length, 0.01, 0.18]} at={[0, 0.045, edge]} mat={MAT.roadLine} />
      <Part size={[length, 0.01, 0.18]} at={[0, 0.045, -edge]} mat={MAT.roadLine} />
      <instancedMesh ref={dashes} args={[GEO.box, MAT.roadLine, count]} receiveShadow />
    </>
  );
}

function ConeTree({ override }: { override?: THREE.Material }) {
  return (
    <>
      <Part geo={GEO.cylinder} size={[0.25, 1.2, 0.25]} at={[0, 0.6, 0]} mat={MAT.trunk} override={override} />
      <Part geo={GEO.cone} size={[1.6, 3, 1.6]} at={[0, 2.5, 0]} mat={MAT.snow} override={override} />
      <Part geo={GEO.cone} size={[1.2, 2.4, 1.2]} at={[0, 4, 0]} mat={MAT.snow} override={override} />
      <Part geo={GEO.cone} size={[0.8, 1.8, 0.8]} at={[0, 5.4, 0]} mat={MAT.snow} override={override} />
    </>
  );
}

function RoundTree({ override }: { override?: THREE.Material }) {
  return (
    <>
      <Part geo={GEO.cylinder} size={[0.25, 2, 0.25]} at={[0, 1, 0]} mat={MAT.trunk} override={override} />
      <Part geo={GEO.ico} size={[1.6, 1.9, 1.6]} at={[0, 3.6, 0]} mat={MAT.snow} override={override} />
    </>
  );
}

function Lamp({ override }: { override?: THREE.Material }) {
  return (
    <>
      <Part geo={GEO.cylinder} size={[0.08, 5.2, 0.08]} at={[0, 2.6, 0]} mat={MAT.metal} override={override} />
      <Part size={[0.9, 0.1, 0.12]} at={[0.4, 5.15, 0]} mat={MAT.metal} override={override} />
      <Part size={[0.45, 0.14, 0.3]} at={[0.8, 5.05, 0]} mat={MAT.lampGlow} override={override} />
    </>
  );
}

/** Visual for one entity in local space. Unknown types render a neutral box instead of crashing. */
export function EntityShape({ entity, override }: ShapeProps) {
  switch (entity.type) {
    case 'building':
      return <BuildingShape entity={entity} override={override} />;
    case 'road':
      return <RoadShape entity={entity} override={override} />;
    case 'tree':
      return entity.assetId === 'prim:tree-round' ? <RoundTree override={override} /> : <ConeTree override={override} />;
    default:
      if (entity.assetId === 'prim:hedge') return <Part size={[4, 1.2, 1.2]} at={[0, 0.6, 0]} mat={MAT.hedge} override={override} />;
      if (entity.assetId === 'prim:lamp') return <Lamp override={override} />;
      return <Part size={[1, 1, 1]} at={[0, 0.5, 0]} mat={MAT.trim} override={override} />;
  }
}

/** Twelve edges of a box, as segment pairs for drei <Line segments>. */
export function useBoxEdges(size: V3, center: V3, pad = 0.15): THREE.Vector3[] {
  const [sx, sy, sz] = size;
  const [cx, cy, cz] = center;
  return useMemo(() => {
    const hx = sx / 2 + pad;
    const hy = sy / 2 + pad;
    const hz = sz / 2 + pad;
    const c = [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
      [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz],
    ].map(([x, y, z]) => new THREE.Vector3(cx + x!, Math.max(0.05, cy + y!), cz + z!));
    const idx = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
    return idx.map((i) => c[i]!);
  }, [sx, sy, sz, cx, cy, cz, pad]);
}
