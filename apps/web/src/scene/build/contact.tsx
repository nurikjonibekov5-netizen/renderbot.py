import * as THREE from 'three';

/**
 * Soft "ambient occlusion" on the ground under buildings, trees and cars — the darkened
 * contact that makes the reference renders read as solid miniatures. A baked gradient
 * texture on one plane per object: cheap on phones and it never touches shadow maps
 * (a post-processing pass removed the scene's shadows, see DECISIONS D-17).
 */
function makeTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // rounded-box distance: 0 inside the inner box, 1 at the edge of the plane
      const u = Math.abs((x + 0.5) / size - 0.5) * 2;
      const v = Math.abs((y + 0.5) / size - 0.5) * 2;
      const inner = 0.62;
      const dx = Math.max(0, u - inner) / (1 - inner);
      const dy = Math.max(0, v - inner) / (1 - inner);
      const d = Math.min(1, Math.hypot(dx, dy));
      const a = (1 - d) ** 2.2;
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let tex: THREE.Texture | null = null;
const mats = new Map<number, THREE.MeshBasicMaterial>();
const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** Shared material per strength level (a handful of levels, never one per object). */
function material(strength: number): THREE.MeshBasicMaterial {
  let m = mats.get(strength);
  if (!m) {
    tex ??= makeTexture();
    m = new THREE.MeshBasicMaterial({
      map: tex, color: '#33405A', transparent: true, opacity: 0.32 * strength, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    mats.set(strength, m);
  }
  return m;
}

const noRaycast = () => null;

/** `pad` = how far the darkening spreads beyond the footprint (m). */
export function ContactShadow({ width, depth, pad = 3, y = 0.06, strength = 1 }: {
  width: number; depth: number; pad?: number; y?: number; strength?: number;
}) {
  return (
    <mesh
      geometry={plane}
      material={material(strength)}
      position={[0, y, 0]}
      scale={[width + pad * 2, 1, depth + pad * 2]}
      raycast={noRaycast}
      renderOrder={1}
    />
  );
}
