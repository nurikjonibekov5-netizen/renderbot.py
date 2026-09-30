// Xodim odamchalari (4-rasm uslubida): kubiklardan yasalgan yoqimli o'yinchoq odamchalar.
// Kiyim rangi lavozimni bildiradi, bosh kiyimi lavozimga qarab farq qiladi.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { STATUS_COLORS } from './palette.js';

const SKIN = [0xf2cfae, 0xe9bf98, 0xdcae88, 0xf5d9bf];
const HAIR = [0x2b2320, 0x4a3426, 0x1f1b1a, 0x6b4a33];

function darker(hex, k = 0.72) {
  return new THREE.Color(hex).multiplyScalar(k);
}

function part(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.75, transparent: true }));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// Lavozimga xos bosh kiyim / soch.
function headwear(role, head, hair, accent) {
  const hat = new THREE.Group();
  const r = role.toLowerCase();
  if (r.startsWith('hamshira')) {
    hat.add(part(0.46, 0.14, 0.46, hair, 0, 0.2, 0.02));
    hat.add(part(0.36, 0.14, 0.26, 0xffffff, 0, 0.32, 0.04));
    hat.add(part(0.08, 0.08, 0.02, 0xe24c4f, 0, 0.33, 0.18));
  } else if (r.startsWith('oshpaz')) {
    hat.add(part(0.46, 0.08, 0.46, hair, 0, 0.2, 0.02));
    hat.add(part(0.44, 0.34, 0.44, 0xffffff, 0, 0.4, 0));
  } else if (r.startsWith('sanitarka')) {
    hat.add(part(0.48, 0.2, 0.48, new THREE.Color(accent).lerp(new THREE.Color(0xffffff), 0.45), 0, 0.19, 0.0));
    hat.add(part(0.2, 0.16, 0.14, new THREE.Color(accent).lerp(new THREE.Color(0xffffff), 0.45), 0, 0.02, -0.28));
  } else if (r.startsWith('shifokor')) {
    hat.add(part(0.46, 0.12, 0.46, hair, 0, 0.2, -0.01));
    hat.add(part(0.46, 0.22, 0.1, hair, 0, 0.06, -0.2));
  } else if (r.startsWith('laborant')) {
    hat.add(part(0.46, 0.12, 0.46, hair, 0, 0.2, 0));
    hat.add(part(0.44, 0.08, 0.04, 0x9fd3cd, 0, 0.04, 0.23));
  } else {
    hat.add(part(0.46, 0.14, 0.46, hair, 0, 0.2, 0));
  }
  head.add(hat);
}

// Odamcha: balandligi ~1.35 m (katta boshli o'yinchoq nisbatlari).
export function createCharacter(staff, roleColor, seed) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = SKIN[seed % SKIN.length];
  const hair = HAIR[(seed >> 3) % HAIR.length];
  const coat = new THREE.Color(roleColor);
  const isDoctor = staff.role.toLowerCase().startsWith('shifokor');
  const torsoColor = isDoctor ? 0xf7f8fa : coat;
  const pants = isDoctor ? coat : darker(roleColor, 0.62);

  const legL = part(0.17, 0.4, 0.2, pants, -0.11, 0.2, 0);
  const legR = part(0.17, 0.4, 0.2, pants, 0.11, 0.2, 0);
  for (const leg of [legL, legR]) leg.geometry.translate(0, -0.2, 0), (leg.position.y = 0.4);
  const shoeL = part(0.18, 0.08, 0.24, 0x2a2f36, 0, -0.36, 0.02);
  const shoeR = shoeL.clone();
  legL.add(shoeL);
  legR.add(shoeR);
  const torso = part(0.52, 0.46, 0.3, torsoColor, 0, 0.63, 0);
  // Shifokor: oq xalat, ichida lavozim rangidagi kiyim ko'rinadi.
  if (isDoctor) torso.add(part(0.16, 0.3, 0.02, coat, 0, 0.06, 0.16));
  else torso.add(part(0.52, 0.06, 0.31, darker(roleColor, 0.85), 0, -0.2, 0));
  const armL = part(0.14, 0.42, 0.18, isDoctor ? 0xeef0f2 : darker(roleColor, 0.9), -0.33, 0.84, 0);
  const armR = part(0.14, 0.42, 0.18, isDoctor ? 0xeef0f2 : darker(roleColor, 0.9), 0.33, 0.84, 0);
  for (const arm of [armL, armR]) {
    arm.geometry.translate(0, -0.19, 0);
    arm.add(part(0.13, 0.1, 0.15, skin, 0, -0.43, 0));
  }
  const head = part(0.44, 0.4, 0.42, skin, 0, 1.08, 0);
  // Ko'zlar (4-rasmdagidek oq fonli qora nuqta).
  for (const dx of [-0.1, 0.1]) {
    const eyeW = part(0.1, 0.11, 0.02, 0xffffff, dx, 0.02, 0.215);
    eyeW.castShadow = false;
    eyeW.add(part(0.045, 0.06, 0.01, 0x1c1f24, dx > 0 ? -0.01 : 0.01, 0, 0.011));
    head.add(eyeW);
  }
  headwear(staff.role, head, hair, roleColor);
  body.add(legL, legR, torso, armL, armR, head);

  // Soya va holat halqasi.
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x1f2a36, transparent: true, opacity: 0.16, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.56, 32), new THREE.MeshBasicMaterial({ color: STATUS_COLORS.turibdi, transparent: true, opacity: 0.95, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);
  const selRing = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.8, 40), new THREE.MeshBasicMaterial({ color: 0x0f8a86, transparent: true, opacity: 0.9, depthWrite: false }));
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.025;
  selRing.visible = false;
  root.add(selRing);

  // Bosish uchun ko'rinmas kattaroq hajm (kichik odamchani ham oson bosish uchun).
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.8;
  root.add(hit);
  root.traverse((o) => { if (o.isMesh) o.userData.staffId = staff.id; });

  const el = document.createElement('div');
  el.className = 'person-tag';
  el.innerHTML = '<span class="dot"></span><span class="nm"></span>';
  const [first, last] = staff.name.split(/\s+/);
  el.querySelector('.nm').textContent = last ? `${first} ${last[0]}.` : first;
  el.style.setProperty('--role', roleColor);
  const tag = new CSS2DObject(el);
  tag.position.y = 1.72;
  root.add(tag);

  const materials = [];
  body.traverse((o) => { if (o.isMesh) materials.push(o.material); });
  root.scale.setScalar(1.15);
  return {
    root, body, legL, legR, armL, armR, head, ring, selRing, shadow, tag, el, materials,
    setStatus(status) {
      ring.material.color.set(STATUS_COLORS[status] || STATUS_COLORS.turibdi);
      const lost = status === 'signal_yoq';
      for (const m of materials) m.opacity = lost ? 0.38 : 1;
      el.classList.toggle('lost', lost);
      el.classList.toggle('idle', status === 'uzoq_harakatsiz');
      el.style.setProperty('--status', STATUS_COLORS[status] || STATUS_COLORS.turibdi);
    },
    setSelected(on) {
      selRing.visible = on;
      el.classList.toggle('selected', on);
    },
    // Yurish animatsiyasi: oyoq-qo'l tebranadi, tana biroz sakraydi.
    animate(t, walking, phase) {
      const s = walking ? Math.sin(t * 10 + phase) * 0.6 : 0;
      legL.rotation.x = s;
      legR.rotation.x = -s;
      armL.rotation.x = -s * 0.8;
      armR.rotation.x = s * 0.8;
      body.position.y = walking ? Math.abs(Math.sin(t * 10 + phase)) * 0.05 : Math.sin(t * 1.6 + phase) * 0.008;
      const pulse = 1 + 0.18 * (0.5 + 0.5 * Math.sin(t * 5));
      selRing.scale.set(pulse, pulse, pulse);
    },
  };
}
