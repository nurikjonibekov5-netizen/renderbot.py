// Bino atrofidagi hudud: maydon, yo'llar, avtoturargoh, daraxtlar, xira qo'shni binolar.
// Faqat atmosfera uchun: ma'lumotga bog'liq emas.
import * as THREE from 'three';
import { rng } from '../../../../shared/time.js';
import { PALETTE } from './palette.js';
import { box, mat, ownMaterials } from './util.js';

function tree(group, x, z, r, s = 1) {
  const trunk = box(0.18 * s, 1.1 * s, 0.18 * s, mat(PALETTE.treeTrunk), x, 0.55 * s, z);
  group.add(trunk);
  const kind = r();
  if (kind < 0.55) {
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * s, 1), mat(PALETTE.tree, { flatShading: true }));
    crown.position.set(x, 1.7 * s, z);
    crown.castShadow = true;
    group.add(crown);
    if (r() < 0.5) {
      const c2 = crown.clone();
      c2.scale.setScalar(0.7);
      c2.position.set(x + 0.55 * s, 1.35 * s, z + 0.2 * s);
      group.add(c2);
    }
  } else {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7 * s, 2.4 * s, 6), mat(PALETTE.tree, { flatShading: true }));
    cone.position.set(x, 2.0 * s, z);
    cone.castShadow = true;
    group.add(cone);
  }
}

function car(group, x, z, rot, color) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.55, 3.9, mat(color, { roughness: 0.5 }), 0, 0.42, 0));
  g.add(box(1.55, 0.45, 2.0, mat(0x2d3640, { roughness: 0.3 }), 0, 0.9, -0.2));
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  group.add(g);
}

export function buildSite(b) {
  const group = new THREE.Group();
  group.name = 'site';
  const r = rng(7);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), mat(PALETTE.ground, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(cx, -0.02, cz);
  ground.receiveShadow = true;
  group.add(ground);

  // Klinika maydoni (yorug' tosh qoplama) va maysazorlar.
  const plaza = box(w + 16, 0.08, d + 20, mat(PALETTE.plaza, { roughness: 0.95 }), cx, 0.02, cz + 2, { cast: false });
  group.add(plaza);
  group.add(box(7, 0.1, d + 8, mat(PALETTE.lawn), b.minX - 5.5, 0.05, cz, { cast: false }));

  // Yo'llar: old tomonda va o'ng tomonda, oq punktir chiziqlar bilan.
  const frontZ = b.maxZ + 16;
  const sideX = b.maxX + 20;
  group.add(box(400, 0.04, 8, mat(PALETTE.road, { roughness: 1 }), cx, 0.01, frontZ, { cast: false }));
  group.add(box(8, 0.045, 400, mat(PALETTE.road, { roughness: 1 }), sideX, 0.012, cz, { cast: false }));
  for (let x = -190; x < 190; x += 6) {
    if (Math.abs(cx + x - sideX) < 6) continue;
    group.add(box(2.6, 0.02, 0.18, mat(PALETTE.roadLine), cx + x, 0.05, frontZ, { cast: false, receive: false }));
  }
  for (let z = -190; z < 190; z += 6) {
    if (Math.abs(cz + z - frontZ) < 6) continue;
    group.add(box(0.18, 0.02, 2.6, mat(PALETTE.roadLine), sideX, 0.05, cz + z, { cast: false, receive: false }));
  }

  // Avtoturargoh (o'ng tomonda).
  const lotX = b.maxX + 9;
  group.add(box(12, 0.06, d + 6, mat(0xe2e5e9, { roughness: 1 }), lotX, 0.03, cz, { cast: false }));
  const carColors = [0xffffff, 0xd6dbe0, 0x2f3b48, 0xb9c6d2, 0xe9e2d3, 0x0f8a86, 0xc9504f];
  for (let i = 0; i < Math.floor((d + 4) / 2.8); i++) {
    const z = b.minZ - 1 + i * 2.8;
    group.add(box(0.08, 0.02, 2.4, mat(PALETTE.roadLine), lotX - 3, 0.07, z + 1.4, { cast: false, receive: false }));
    if (r() < 0.7) car(group, lotX - 3, z, Math.PI / 2, carColors[Math.floor(r() * carColors.length)]);
    if (r() < 0.55) car(group, lotX + 3, z, -Math.PI / 2, carColors[Math.floor(r() * carColors.length)]);
  }

  // Daraxtlar: yo'l bo'ylab va maydon chetida.
  for (let x = b.minX - 30; x < b.maxX + 30; x += 7) {
    if (Math.abs(x - sideX) < 7) continue;
    tree(group, x + r() * 1.5, frontZ - 6.5, r, 0.9 + r() * 0.3);
  }
  for (let z = b.minZ - 25; z < b.maxZ + 30; z += 7) tree(group, sideX + 7.5, z + r() * 2, r, 0.9 + r() * 0.3);
  for (let i = 0; i < 6; i++) tree(group, b.minX - 4 - r() * 3, b.minZ + (i / 5) * d, r, 0.8 + r() * 0.3);

  // Xira qo'shni binolar: shahar hissi uchun, tuman ichida yo'qolib boradi.
  const nb = mat(PALETTE.neighbor, { roughness: 0.95 });
  const spots = [];
  // Faqat orqa va yon tomonlarda: kamera oldidagi qutichalar binoni to'sib, katta soya tashlardi.
  for (let i = -3; i <= 3; i++) spots.push([cx + i * 30, b.minZ - 44 - r() * 10]);
  for (let i = -2; i <= 0; i++) {
    spots.push([b.minX - 48 - r() * 8, cz + i * 26]);
    spots.push([sideX + 34 + r() * 8, cz + i * 28]);
  }
  // Har qo'shni bino alohida guruhda: haqiqiy model shu joyga qo'yilsa, oddiy quticha yashiriladi.
  const neighbors = new THREE.Group();
  neighbors.name = 'neighbors';
  for (const [x, z] of spots) {
    const bw = 12 + r() * 12;
    const bd = 10 + r() * 10;
    const bh = 4 + r() * 9;
    const nbg = new THREE.Group();
    nbg.add(box(bw, bh, bd, nb, x, bh / 2, z));
    nbg.add(box(bw + 0.3, 0.3, bd + 0.3, mat(0xe6e8eb), x, bh + 0.15, z, { cast: false }));
    nbg.userData.rect = new THREE.Box3(new THREE.Vector3(x - bw / 2, 0, z - bd / 2), new THREE.Vector3(x + bw / 2, bh, z + bd / 2));
    neighbors.add(nbg);
  }
  group.add(neighbors);
  group.userData.neighbors = neighbors;
  ownMaterials(group);
  return group;
}
