import { useEffect, useRef } from 'react';
import { MapControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MapControls as MapControlsImpl } from 'three-stdlib';
import { useEditor } from '../../editor/store.ts';
import { WORLD_HALF } from '../../lib/geometry.ts';

/** Default view (REFERENCE_ANALYSIS §4): ~35° elevation, 45° azimuth, narrow lens. */
export const CAMERA_DEFAULT = {
  fov: 28,
  target: new THREE.Vector3(2, 0, 0),
  distance: 230,
  polar: THREE.MathUtils.degToRad(55),
  azimuth: THREE.MathUtils.degToRad(45),
  orthoZoom: 4.2,
};
export const CAMERA_LIMITS = {
  minDistance: 15,
  maxDistance: 600,
  minPolar: THREE.MathUtils.degToRad(10),
  maxPolar: THREE.MathUtils.degToRad(80),
};

/** Portrait screens (phones) need the camera further away to show the same district width. */
export function defaultDistance(aspect = 16 / 10): number {
  return CAMERA_DEFAULT.distance * THREE.MathUtils.clamp(1.25 / aspect, 1, 2.2);
}

export function defaultCameraPosition(aspect?: number): THREE.Vector3 {
  const { target, polar, azimuth } = CAMERA_DEFAULT;
  const distance = defaultDistance(aspect);
  return new THREE.Vector3(
    target.x + distance * Math.sin(polar) * Math.sin(azimuth),
    target.y + distance * Math.cos(polar),
    target.z + distance * Math.sin(polar) * Math.cos(azimuth),
  );
}

/**
 * Video camera: left-drag pan on the ground, right-drag orbit, wheel/pinch zoom, damped.
 * The footprint tool takes the left button for drawing; the gizmo disables controls while dragging.
 */
export function CameraRig() {
  const controls = useRef<MapControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const getState = useThree((s) => s.get);
  const resetTick = useEditor((s) => s.cameraResetTick);
  const tool = useEditor((s) => s.tool);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const { size } = getState();
    camera.position.copy(defaultCameraPosition(size.width / Math.max(1, size.height)));
    c.target.copy(CAMERA_DEFAULT.target);
    if (camera instanceof THREE.OrthographicCamera) {
      camera.zoom = CAMERA_DEFAULT.orthoZoom;
      camera.updateProjectionMatrix();
    }
    c.update();
    invalidate();
  }, [resetTick, camera, invalidate, getState]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.mouseButtons = {
      LEFT: tool === 'footprint' ? (-1 as THREE.MOUSE) : THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    c.touches = { ONE: tool === 'footprint' ? (-1 as THREE.TOUCH) : THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  }, [tool]);

  /** Keep the orbit target on the ground and inside the world. */
  const clampTarget = () => {
    const c = controls.current;
    if (!c) return;
    const t = c.target;
    const cx = THREE.MathUtils.clamp(t.x, -WORLD_HALF, WORLD_HALF);
    const cz = THREE.MathUtils.clamp(t.z, -WORLD_HALF, WORLD_HALF);
    if (cx !== t.x || cz !== t.z || t.y !== 0) {
      const d = new THREE.Vector3(cx - t.x, -t.y, cz - t.z);
      t.add(d);
      camera.position.add(d);
    }
  };

  return (
    <MapControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      screenSpacePanning={false}
      minDistance={CAMERA_LIMITS.minDistance}
      maxDistance={CAMERA_LIMITS.maxDistance}
      minZoom={1.2}
      maxZoom={30}
      minPolarAngle={CAMERA_LIMITS.minPolar}
      maxPolarAngle={CAMERA_LIMITS.maxPolar}
      zoomSpeed={0.9}
      onChange={clampTarget}
    />
  );
}
