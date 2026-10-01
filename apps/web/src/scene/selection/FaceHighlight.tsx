import * as THREE from 'three';
import type { BuildingMeta, FaceKey } from '@scene/schema';
import { PALETTE } from '../environment/palette.ts';

const faceMat = new THREE.MeshBasicMaterial({
  color: PALETTE.accent, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
});
const noRaycast = () => null;

/** Which facade side a local-space point is on. */
export function faceAt(local: THREE.Vector3, m: BuildingMeta): FaceKey {
  const dx = Math.abs(local.x) - m.width / 2;
  const dz = Math.abs(local.z) - m.depth / 2;
  if (dx > dz) return local.x > 0 ? 'e' : 'w';
  return local.z > 0 ? 's' : 'n';
}

/** Orange glow over the hovered facade side or the ground floor (video 11–13 s and 22–25 s). */
export function FaceHighlight({ m, face }: { m: BuildingMeta; face: FaceKey | 'ground' }) {
  const H = m.floors * m.storeyHeight;
  if (face === 'ground') {
    return (
      <mesh position={[0, m.storeyHeight / 2, 0]} material={faceMat} raycast={noRaycast} renderOrder={5}>
        <boxGeometry args={[m.width + 0.9, m.storeyHeight, m.depth + 0.9]} />
      </mesh>
    );
  }
  const alongX = face === 'n' || face === 's';
  const sign = face === 's' || face === 'e' ? 1 : -1;
  const pos: [number, number, number] = alongX ? [0, H / 2, sign * (m.depth / 2 + 0.45)] : [sign * (m.width / 2 + 0.45), H / 2, 0];
  const size: [number, number, number] = alongX ? [m.width + 0.6, H + 0.4, 0.2] : [0.2, H + 0.4, m.depth + 0.6];
  return (
    <mesh position={pos} material={faceMat} raycast={noRaycast} renderOrder={5}>
      <boxGeometry args={size} />
    </mesh>
  );
}
