import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditor, getAppStore } from '../editor/store.ts';
import { CameraRig, CAMERA_DEFAULT, defaultCameraPosition } from './camera/CameraRig.tsx';
import { EditorGrid, Lights } from './environment/Environment.tsx';
import { EntityView } from './entities/EntityView.tsx';
import { Ground } from './placement/Ground.tsx';
import { ToolPreviews } from './placement/ToolPreviews.tsx';
import { pointerStore } from './interaction.ts';

function Entities() {
  const entities = useEditor((s) => s.doc.entities);
  return (
    <>
      {entities.map((e) => <EntityView key={e.id} entity={e} />)}
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
      ghost() {
        const g = scene.getObjectByName('ghost');
        return g ? { visible: g.visible, valid: Boolean(g.userData.valid), position: g.position.toArray() } : null;
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
  return (
    <Canvas
      className="scene-canvas"
      shadows
      flat
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={debug ? 'always' : 'demand'}
      orthographic={ortho}
      camera={ortho
        ? { position, zoom: CAMERA_DEFAULT.orthoZoom, near: -1000, far: 3000 }
        : { position, fov: CAMERA_DEFAULT.fov, near: 0.5, far: 3000 }}
      gl={{ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <color attach="background" args={['#EEF2F6']} />
      <fog attach="fog" args={['#EEF2F6', 380, 900]} />
      <Lights mobile={mobile} />
      <Ground />
      <EditorGrid />
      <Entities />
      <ToolPreviews />
      <CameraRig />
      <TestBridge onContextLost={onContextLost} />
      {debug && <PerfProbe />}
    </Canvas>
  );
}
