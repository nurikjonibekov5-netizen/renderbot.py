import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOORS_MAX, type SceneEntity } from '@scene/schema';
import { getAppStore } from '../../editor/store.ts';
import { buildingMeta } from '../../lib/geometry.ts';
import { PALETTE } from '../environment/palette.ts';
import { noteGizmoDragEnd } from '../interaction.ts';

const handleMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, depthTest: false, transparent: true });
const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.9, depthTest: false });

/**
 * Orange height handle at the roof corner (video 16–18 s): drag up/down to add or remove whole storeys.
 * The building previews live; one undo step is committed on release.
 */
export function HeightHandle({ entity, group, onPreview }: {
  entity: SceneEntity;
  group: THREE.Object3D;
  onPreview: (floors: number | null) => void;
}) {
  const m = buildingMeta(entity);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const invalidate = useThree((s) => s.invalidate);
  const [drag, setDrag] = useState<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const floors = drag ?? m.floors;
  const y = floors * m.storeyHeight + 1.4;
  const hx = m.width / 2 + 0.2;
  const hz = m.depth / 2 + 0.2;

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (controls) controls.enabled = false;
    const anchor = group.localToWorld(new THREE.Vector3(hx, 0, hz));
    const scaleY = Math.abs(group.scale.y) || 1;
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();
    let current = m.floors;
    setDrag(current);
    const move = (ev: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
      const n = camera.getWorldDirection(new THREE.Vector3()).setY(0);
      if (n.lengthSq() < 1e-6) n.set(0, 0, -1);
      plane.setFromNormalAndCoplanarPoint(n.normalize(), anchor);
      if (!ray.ray.intersectPlane(plane, hit)) return;
      const next = THREE.MathUtils.clamp(Math.round((hit.y - anchor.y) / scaleY / m.storeyHeight), 1, FLOORS_MAX);
      if (next !== current) {
        current = next;
        setDrag(next);
        onPreview(next);
        invalidate();
      }
    };
    const up = () => {
      cleanup.current?.();
      noteGizmoDragEnd();
      if (current !== m.floors) {
        getAppStore().getState().updateEntity(entity.id, (x) => ({ ...x, metadata: { ...x.metadata, floors: current } }), 'Qavatlar');
      }
      setDrag(null);
      onPreview(null);
    };
    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (controls) controls.enabled = true;
      cleanup.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <group name="height-handle">
      <mesh
        position={[hx, y, hz]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[0.9, 1.3, 0.9]}
        material={handleMat}
        renderOrder={10}
        onPointerDown={onDown}
        onPointerOver={() => { document.body.style.cursor = 'ns-resize'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
        userData={{ handle: 'height' }}
      >
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh position={[hx, y / 2, hz]} material={ringMat} renderOrder={9} raycast={() => null}>
        <boxGeometry args={[0.12, y, 0.12]} />
      </mesh>
      {drag !== null && (
        <Html position={[hx, y + 2, hz]} center className="floor-label" zIndexRange={[20, 0]}>
          {drag} qavat
        </Html>
      )}
    </group>
  );
}
