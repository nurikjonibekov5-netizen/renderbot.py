import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditor, getAppStore } from '../editor/store.ts';
import { CameraRig, CAMERA_DEFAULT, defaultCameraPosition } from './camera/CameraRig.tsx';
import { EditorGrid, Lights } from './environment/Environment.tsx';
import { EntityView } from './entities/EntityView.tsx';
import { Ground } from './placement/Ground.tsx';
import { ToolPreviews } from './placement/ToolPreviews.tsx';
import { isStill, pointerStore } from './interaction.ts';
import { assetReport } from './entities/Shapes.tsx';
import { computeCrossings } from './build/roads.ts';
import { Traffic } from './traffic/Traffic.tsx';
import { manifestById } from '../lib/assets.ts';
import type { SceneEntity } from '@scene/schema';

const EMPTY: never[] = [];

/** Roads only change when a road changes; keep the list stable otherwise so the network is not recomputed. */
function useRoads(entities: readonly SceneEntity[]): SceneEntity[] {
  const key = entities.filter((e) => e.type === 'road').map((e) => `${e.id}:${e.position}:${e.rotation}:${e.scale}:${JSON.stringify(e.metadata)}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => entities.filter((e) => e.type === 'road'), [key]);
}

function Entities({ traffic }: { traffic: boolean }) {
  const entities = useEditor((s) => s.doc.entities);
  const roads = useRoads(entities);
  const crossings = useMemo(() => computeCrossings(roads), [roads]);
  return (
    <>
      {entities.map((e) => <EntityView key={e.id} entity={e} crossings={e.type === 'road' ? crossings.get(e.id) ?? EMPTY : undefined} />)}
      {traffic && <Traffic roads={roads} />}
    </>
  );
}

/**
 * Debug/test bridge: lets e2e tests turn world points into screen pixels
 * and read renderer stats. Contains no secrets and no business data.
 */
function TestBridge({ onContextLost }: { onContextLost: (lost: boolean) => void }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  useEffect(() => {
    const api = {
      store: getAppStore(),
      scene,
      pointer: pointerStore,
      project(x: number, y: number, z: number) {
        camera.updateMatrixWorld();
        const v = new THREE.Vector3(x, y, z).project(camera);
        const r = gl.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
      camera() {
        const t = controls?.target ?? new THREE.Vector3();
        return {
          distance: camera.position.distanceTo(t),
          position: camera.position.toArray(),
          target: t.toArray(),
          zoom: camera.zoom,
        };
      },
      /** First thing under a screen point: an entity id, 'ground', or null. */
      pick(px: number, py: number) {
        const r = gl.domElement.getBoundingClientRect();
        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1), camera);
        for (const h of rc.intersectObjects(scene.children, true)) {
          let o: THREE.Object3D | null = h.object;
          while (o && !o.userData.entityId && o.name !== 'ground') o = o.parent;
          if (o) return o.name === 'ground' ? 'ground' : (o.userData.entityId as string);
        }
        return null;
      },
      /** Screenshot helper: put the camera at a given orbit around a target (degrees). */
      setView(target: [number, number, number], distance: number, polarDeg: number, azimuthDeg: number) {
        const po = THREE.MathUtils.degToRad(polarDeg);
        const az = THREE.MathUtils.degToRad(azimuthDeg);
        const t = new THREE.Vector3(...target);
        camera.position.set(t.x + distance * Math.sin(po) * Math.sin(az), t.y + distance * Math.cos(po), t.z + distance * Math.sin(po) * Math.cos(az));
        if (controls) (controls as unknown as { target: THREE.Vector3; update(): void }).target.copy(t);
        (controls as unknown as { update?: () => void } | null)?.update?.();
        invalidate();
      },
      ghost() {
        const g = scene.getObjectByName('ghost');
        return g ? { visible: g.visible, valid: Boolean(g.userData.valid), position: g.position.toArray() } : null;
      },
      assets() {
        return [...manifestById.values()].map((m) => ({ id: m.id, manifest: m.size, runtime: assetReport.get(m.id) ?? null, fixes: m.fixes, warnings: m.warnings }));
      },
      stats() {
        return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries };
      },
      invalidate,
    };
    (window as unknown as { __editor: typeof api }).__editor = api;
  }, [camera, gl, scene, invalidate, controls]);

  useEffect(() => {
    const el = gl.domElement;
    const lost = (ev: Event) => {
      ev.preventDefault();
      onContextLost(true);
    };
    const restored = () => onContextLost(false);
    el.addEventListener('webglcontextlost', lost);
    el.addEventListener('webglcontextrestored', restored);
    return () => {
      el.removeEventListener('webglcontextlost', lost);
      el.removeEventListener('webglcontextrestored', restored);
    };
  }, [gl, onContextLost]);
  return null;
}

/** Writes FPS / draw calls into a DOM element (no React state per frame). Only with ?debug. */
function PerfProbe() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    const loop = () => {
      frames += 1;
      const now = performance.now();
      if (now - last > 500) {
        const el = document.getElementById('perf-panel');
        if (el) {
          const i = gl.info;
          el.textContent = `FPS ${Math.round((frames * 1000) / (now - last))} · draw ${i.render.calls} · tri ${i.render.triangles} · geo ${i.memory.geometries} · tex ${i.memory.textures}`;
        }
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gl]);
  return null;
}

export interface SceneCanvasProps {
  ortho: boolean;
  debug: boolean;
  mobile: boolean;
  onContextLost: (lost: boolean) => void;
}

export function SceneCanvas({ ortho, debug, mobile, onContextLost }: SceneCanvasProps) {
  const position = defaultCameraPosition().toArray();
  const presenting = useEditor((s) => s.presenting);
  const still = isStill();
  // traffic is always shown; in ?still mode it is frozen so screenshots stay deterministic
  const traffic = true;
  return (
    <Canvas
      className="scene-canvas"
      shadows="percentage"
      flat
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={debug || !still || presenting ? 'always' : 'demand'}
      orthographic={ortho}
      camera={ortho
        ? { position, zoom: CAMERA_DEFAULT.orthoZoom, near: -1000, far: 3000 }
        : { position, fov: CAMERA_DEFAULT.fov, near: 0.5, far: 3000 }}
      gl={{ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* transparent background: the CSS sky gradient shows through (image 6 haze) */}
      <fog attach="fog" args={['#E6ECF4', 380, 1000]} />
      <Lights mobile={mobile} />
      <Ground />
      <EditorGrid />
      <Entities traffic={traffic} />
      <ToolPreviews />
      <CameraRig />
      <TestBridge onContextLost={onContextLost} />
      {debug && <PerfProbe />}
    </Canvas>
  );
}
