import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const matCache = new Map();
// Bir xil rangdagi oddiy materiallar bitta nusxada saqlanadi (xotira tejaladi).
export function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }));
  return matCache.get(key);
}

export function box(w, h, d, material, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.userData.cast = cast;
  m.receiveShadow = receive;
  return m;
}

export function label(text, cls = '') {
  const el = document.createElement('div');
  el.className = `scene-label ${cls}`;
  el.textContent = text;
  return new CSS2DObject(el);
}

// Guruhni asta-sekin ko'rsatish/yashirish (0 - ko'rinmas, 1 - to'liq).
// Guruh o'z materiallariga ega bo'lishi kerak (boshqalar bilan bo'lishmagan).
export function setGroupOpacity(group, k) {
  group.visible = k > 0.01;
  if (!group.userData.fadeList) {
    const list = [];
    group.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (list.includes(m)) continue;
        // Asl qiymatlar materialning o'zida bir marta saqlanadi: ro'yxat qayta tuzilsa ham yo'qolmaydi.
        if (!m.userData.fadeBase) m.userData.fadeBase = { opacity: m.opacity ?? 1, depthWrite: m.depthWrite, transparent: m.transparent };
        list.push(m);
      }
    });
    group.userData.fadeList = list;
  }
  for (const m of group.userData.fadeList) {
    const b = m.userData.fadeBase;
    m.opacity = b.opacity * k;
    const fading = k < 0.999;
    m.transparent = b.transparent || fading;
    m.depthWrite = fading ? false : b.depthWrite;
  }
  group.traverse((o) => {
    if (o.isCSS2DObject) {
      o.element.style.opacity = String(k);
      o.userData.fadeHidden = k < 0.05;
      o.visible = !o.userData.fadeHidden && !o.userData.hidden;
    }
  });
}

// Guruhdagi barcha materiallarni shu guruhga xos nusxaga almashtiradi (alohida xiralashtirish uchun).
export function ownMaterials(group) {
  const clones = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const one = (m) => {
      if (!clones.has(m)) clones.set(m, m.clone());
      return clones.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  });
}

export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

// Guruhni sahnadan butunlay olib tashlaydi: 3D shakllar va sahifadagi yozuvlar (CSS2D) bilan birga.
export function removeGroup(group) {
  group.parent?.remove(group);
  group.traverse((o) => {
    if (o.isCSS2DObject) o.element.remove();
    if (o.isMesh) o.geometry?.dispose();
  });
}
