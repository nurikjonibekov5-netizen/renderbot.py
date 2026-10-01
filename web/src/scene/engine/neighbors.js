// Klinika atrofidagi binolar (3D Jutsu / 3ds Max GLB modellari).
// Har bir model yuzlab mayda bo'lakdan iborat bo'lishi mumkin, shuning uchun yuklashda
// bir xil materialdagi bo'laklar bittaga birlashtiriladi: ko'rinish o'zgarmaydi, sahna yengil ishlaydi.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.length !== 1) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    const key = mats[0].uuid;
    if (!groups.has(key)) groups.set(key, { material: mats[0], list: [] });
    groups.get(key).list.push(g);
  });
  const out = new THREE.Group();
  for (const { material, list } of groups.values()) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const m = material.clone();
    m.map = null;
    const mesh = new THREE.Mesh(merged, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    out.add(mesh);
    for (const g of list) g.dispose();
  }
  return out;
}

// Ro'yxatdagi binolarni yuklaydi. Yuklanmagani (masalan, fayl kompyuterdan ochilganda) tashlab ketiladi.
export async function loadNeighbors(list) {
  const loader = new GLTFLoader();
  const results = await Promise.all(list.map(async (b) => {
    try {
      const gltf = await loader.loadAsync(b.url);
      const building = mergeByMaterial(gltf.scene);
      const box0 = new THREE.Box3().setFromObject(building);
      building.position.y = -box0.min.y;
      const holder = new THREE.Group();
      holder.name = `atrof:${b.name}`;
      holder.add(building);
      holder.position.set(b.x, 0, b.z);
      holder.rotation.y = b.rot;
      holder.updateMatrixWorld(true);
      return { ok: true, name: b.name, object: holder, box: new THREE.Box3().setFromObject(holder) };
    } catch (err) {
      return { ok: false, name: b.name, error: String(err?.message || err) };
    }
  }));
  return results;
}
