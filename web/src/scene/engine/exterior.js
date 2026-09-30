// Binoning tashqi ko'rinishi (2-rasm ruhida): oq fasad, deraza qatorlari, tom, kirish soyaboni.
// Har qavat alohida "bant" - sichqoncha bilan ustiga kelinganda ajralib turadi va bosiladi.
import * as THREE from 'three';
import { rng } from '../../../../shared/time.js';
import { PALETTE } from './palette.js';
import { box, mat, label, ownMaterials } from './util.js';

export const STOREY = 3.6;

export function buildExterior({ bounds, floors, stairs }) {
  const group = new THREE.Group();
  group.name = 'exterior';
  const r = rng(11);
  const pad = 0.5;
  const minX = bounds.minX - pad;
  const maxX = bounds.maxX + pad;
  const minZ = bounds.minZ - pad;
  const maxZ = bounds.maxZ + pad;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const bands = new Map();
  const chips = new Map();

  const winGeo = new THREE.BoxGeometry(1, 1, 1);
  const windows = [];
  floors.forEach((f, i) => {
    const y0 = i * STOREY;
    const band = new THREE.Group();
    band.name = `storey_${f}`;
    const facadeMat = new THREE.MeshStandardMaterial({ color: PALETTE.facade, roughness: 0.9, emissive: PALETTE.accent, emissiveIntensity: 0 });
    const body = box(w, STOREY - 0.35, d, facadeMat, cx, y0 + 0.35 + (STOREY - 0.35) / 2, cz);
    body.userData.floor = f;
    band.add(body);
    const slab = box(w + 0.35, 0.35, d + 0.35, mat(PALETTE.slabBand), cx, y0 + 0.175, cz);
    slab.userData.floor = f;
    band.add(slab);
    band.userData.facadeMat = facadeMat;
    group.add(band);
    bands.set(f, band);

    // Derazalar: uzun tomonlarda va yon tomonlarda.
    const wy = y0 + 0.35 + 1.55;
    const step = 1.7;
    for (let x = minX + 1.2; x <= maxX - 1.2; x += step) {
      windows.push([x, wy, maxZ + 0.02, 1.15, 1.7, 0.08]);
      windows.push([x, wy, minZ - 0.02, 1.15, 1.7, 0.08]);
    }
    for (let z = minZ + 1.2; z <= maxZ - 1.2; z += step) {
      windows.push([maxX + 0.02, wy, z, 0.08, 1.7, 1.15]);
      windows.push([minX - 0.02, wy, z, 0.08, 1.7, 1.15]);
    }

    // Qavat nomi va xodimlar soni ko'rsatiladigan "chip" (o'ng tomonda).
    const chip = label(`${f}F`, 'floor-chip');
    chip.position.set(maxX + 1.2, y0 + STOREY * 0.55, maxZ - 0.5);
    chip.userData.floor = f;
    group.add(chip);
    chips.set(f, chip);
  });

  const inst = new THREE.InstancedMesh(winGeo, new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1 }), windows.length);
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  windows.forEach(([x, y, z, sx, sy, sz], i) => {
    m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, c.set(r() < 0.22 ? PALETTE.glassWarm : PALETTE.glass));
  });
  inst.castShadow = false;
  inst.receiveShadow = true;
  group.add(inst);

  const top = floors.length * STOREY;
  // Tom: parapet, tom qoplamasi, texnik bloklar.
  group.add(box(w + 0.35, 0.5, d + 0.35, mat(PALETTE.facade), cx, top + 0.25, cz));
  group.add(box(w - 0.6, 0.12, d - 0.6, mat(PALETTE.roof, { roughness: 1 }), cx, top + 0.5, cz, { cast: false }));
  for (let i = 0; i < 4; i++) {
    const hx = minX + 3 + r() * (w - 6);
    const hz = minZ + 2 + r() * (d - 4);
    group.add(box(1.6 + r(), 0.9, 1.2 + r(), mat(PALETTE.roofDeck), hx, top + 1.0, hz));
  }

  // Zinapoya minorasi: fasaddan chiqib turgan feruza oynali blok.
  const tx = stairs?.x ?? maxX - 2;
  const tower = box(3.2, top + 2.2, 3.2, mat(PALETTE.facadeShade), tx, (top + 2.2) / 2, minZ - 1.2);
  group.add(tower);
  group.add(box(0.9, top - 1, 0.1, mat(PALETTE.accent, { roughness: 0.3 }), tx, top / 2 + 0.3, minZ - 2.85, { cast: false }));

  // Kirish: soyabon, ustunlar, qizil xoch belgisi.
  const ex = cx - w * 0.2;
  group.add(box(7, 0.3, 3.2, mat(PALETTE.facade), ex, 3.1, maxZ + 1.6));
  for (const dx of [-3.2, 3.2]) group.add(box(0.2, 3.0, 0.2, mat(PALETTE.facadeShade), ex + dx, 1.5, maxZ + 3));
  group.add(box(4.2, 2.4, 0.1, mat(PALETTE.glass, { roughness: 0.2 }), ex, 1.4, maxZ + 0.06, { cast: false }));
  const crossMat = mat(PALETTE.cross, { roughness: 0.5, emissive: PALETTE.cross, emissiveIntensity: 0.25 });
  const crossY = top - STOREY / 2;
  group.add(box(2.2, 0.7, 0.14, crossMat, cx + w * 0.28, crossY, maxZ + 0.12, { cast: false }));
  group.add(box(0.7, 2.2, 0.14, crossMat, cx + w * 0.28, crossY, maxZ + 0.12, { cast: false }));
  const sign = label('KLINIKA', 'building-sign');
  sign.position.set(ex, 3.8, maxZ + 3.2);
  group.add(sign);

  ownMaterials(group);
  for (const band of bands.values()) {
    band.traverse((o) => { if (o.isMesh && o.userData.floor) band.userData.facadeMat = o.material; });
  }
  return { group, bands, chips, box: new THREE.Box3(new THREE.Vector3(minX - 3, 0, minZ - 3), new THREE.Vector3(maxX + 3, top + 2, maxZ + 4)) };
}

// Sichqoncha ustiga kelgan qavatni ajratib ko'rsatadi.
export function highlightStorey(bands, floor) {
  for (const [f, band] of bands) {
    const on = f === floor;
    band.traverse((o) => {
      if (o.isMesh && o.userData.floor && o.material.emissive) o.material.emissiveIntensity = on ? 0.18 : 0;
    });
  }
}
