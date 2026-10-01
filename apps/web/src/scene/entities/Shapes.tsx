import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneEntity } from '@scene/schema';
import { buildingMeta, isGlb, localBounds, lotMeta, roadMeta } from '../../lib/geometry.ts';
import { assetUrl, manifestById, MANIFEST } from '../../lib/assets.ts';
import { GLOW_MAT, SOLID_MAT, type BuiltShape } from '../build/builder.ts';
import { buildingShape } from '../build/buildings.ts';
import {
  boxTree, car, chimney, coneTree, hedge, lamp, lotShape, pineTree, pipeBridgeShape, railShape, roundTree, snowBush, trafficLight,
} from '../build/props.ts';
import { roadShape, type Crossing } from '../build/roads.ts';
import { ContactShadow } from '../build/contact.tsx';

interface ShapeProps {
  entity: SceneEntity;
  /** Override material for every mesh (ghost preview). */
  override?: THREE.Material;
  /** Road junctions (computed from the whole network). */
  crossings?: readonly Crossing[];
  /** Live preview of the floor count while the height handle is dragged. */
  previewFloors?: number;
}

type V3 = [number, number, number];

function Built({ shape, override, cast = true }: { shape: BuiltShape; override?: THREE.Material; cast?: boolean }) {
  return (
    <>
      {shape.solid && (
        <mesh geometry={shape.solid} material={override ?? SOLID_MAT} castShadow={cast && !override} receiveShadow={!override} />
      )}
      {shape.glow && <mesh geometry={shape.glow} material={override ?? GLOW_MAT} />}
    </>
  );
}

/** Runtime bounding-box report per GLB asset (Gate 2 check; read by e2e tests). */
export const assetReport = new Map<string, { minY: number; size: V3; meshes: number; lights: number }>();

function GlbModel({ entity, override }: ShapeProps) {
  const entry = manifestById.get(entity.assetId!)!;
  const { scene } = useGLTF(assetUrl(entry.file));
  const object = useMemo(() => {
    const clone = scene.clone(true);
    const lights: THREE.Object3D[] = [];
    let meshes = 0;
    clone.traverse((o) => {
      if ((o as THREE.Light).isLight) lights.push(o);
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes += 1;
      mesh.castShadow = !override;
      mesh.receiveShadow = !override;
      if (override) mesh.material = override;
    });
    // Defensive: embedded lights are stripped by the pipeline, but never let one into the scene.
    for (const l of lights) l.removeFromParent();
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    if (!override) {
      const s = box.getSize(new THREE.Vector3());
      assetReport.set(entry.id, { minY: box.min.y, size: [s.x, s.y, s.z], meshes, lights: lights.length });
    }
    return clone;
  }, [scene, override, entry.id]);
  return <primitive object={object} />;
}

for (const m of MANIFEST) useGLTF.preload(assetUrl(m.file));

const placeholderMat = new THREE.MeshStandardMaterial({ color: '#D9DEE4', transparent: true, opacity: 0.6 });
const brokenMat = new THREE.MeshStandardMaterial({ color: '#E5484D', transparent: true, opacity: 0.55 });

function BoundsBox({ entity, material }: { entity: SceneEntity; material: THREE.Material }) {
  const b = localBounds(entity);
  return (
    <mesh position={b.center} material={material}>
      <boxGeometry args={b.size} />
    </mesh>
  );
}

/** A broken asset shows a red placeholder instead of blanking the scene (master prompt §24). */
class AssetBoundary extends Component<{ entity: SceneEntity; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: Error) {
    console.warn(`[asset] ${this.props.entity.assetId} failed to load:`, err.message);
  }
  render() {
    if (this.state.failed) return <BoundsBox entity={this.props.entity} material={brokenMat} />;
    return this.props.children;
  }
}

/** Visual for one entity in local space. Unknown types render a neutral box instead of crashing. */
export function EntityShape({ entity, override, crossings, previewFloors }: ShapeProps) {
  if (isGlb(entity)) {
    if (!manifestById.has(entity.assetId!)) return <BoundsBox entity={entity} material={brokenMat} />;
    const size = manifestById.get(entity.assetId!)!.size;
    return (
      <AssetBoundary entity={entity}>
        {!override && <ContactShadow width={size[0]} depth={size[2]} pad={3.5} />}
        <Suspense fallback={<BoundsBox entity={entity} material={override ?? placeholderMat} />}>
          <GlbModel entity={entity} override={override} />
        </Suspense>
      </AssetBoundary>
    );
  }
  switch (entity.type) {
    case 'building': {
      const m = buildingMeta(entity);
      if (previewFloors) m.floors = previewFloors;
      return (
        <>
          {!override && <ContactShadow width={m.width} depth={m.depth} pad={3.5} />}
          <Built shape={buildingShape(override ? 'ghost' : entity.id, m)} override={override} />
        </>
      );
    }
    case 'road': {
      const { length, width } = roadMeta(entity);
      return <Built shape={roadShape(length, width, override ? [] : crossings ?? [])} override={override} cast={false} />;
    }
    case 'lot':
      return <Built shape={lotShape(override ? 'ghost' : entity.id, lotMeta(entity))} override={override} cast={false} />;
    case 'vehicle':
      return (
        <>
          {!override && <ContactShadow width={4} depth={1.6} pad={0.6} strength={0.8} />}
          <Built shape={car(Number(entity.metadata?.color) || 0)} override={override} />
        </>
      );
    case 'tree':
      return (
        <>
          {!override && <ContactShadow width={1.2} depth={1.2} pad={1.2} strength={0.7} />}
          <TreeShape entity={entity} override={override} />
        </>
      );
    default:
      switch (entity.assetId) {
        case 'prim:hedge': return <Built shape={hedge()} override={override} />;
        case 'prim:lamp': return <Built shape={lamp()} override={override} />;
        case 'prim:traffic-light': return <Built shape={trafficLight()} override={override} />;
        case 'prim:snow-bush': return <Built shape={snowBush()} override={override} />;
        case 'prim:chimney':
          return (
            <>
              {!override && <ContactShadow width={8} depth={8} pad={3} />}
              <Built shape={chimney()} override={override} />
            </>
          );
        case 'prim:rail':
          return <Built shape={railShape(entity.id, Number(entity.metadata?.length) || 100, Number(entity.metadata?.tracks) || 3)} override={override} />;
        case 'prim:pipe-bridge':
          return <Built shape={pipeBridgeShape(Number(entity.metadata?.length) || 40)} override={override} />;
        default:
          return <BoundsBox entity={entity} material={override ?? placeholderMat} />;
      }
  }
}

function TreeShape({ entity, override }: { entity: SceneEntity; override?: THREE.Material }) {
  switch (entity.assetId) {
    case 'prim:tree-round': return <Built shape={roundTree()} override={override} />;
    case 'prim:tree-pine': return <Built shape={pineTree()} override={override} />;
    case 'prim:tree-box': return <Built shape={boxTree()} override={override} />;
    default: return <Built shape={coneTree()} override={override} />;
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
