// Qavatning ichki ko'rinishi (3-rasm ruhida): yupqa pol plitasi, shisha devorlar,
// har xona turiga mos oddiy mebel shakllari. 3ds Max modeli kelganda o'rnini model egallaydi.
import * as THREE from 'three';
import { hashString, rng } from '../../../../shared/time.js';
import { PALETTE } from './palette.js';
import { box, mat, label, ownMaterials } from './util.js';

export const WALL_H = 2.3;
const DOOR_W = 1.4;
const SLAB_T = 0.35;

function wall(group, x1, z1, x2, z2, mats) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.05) return;
  const rot = -Math.atan2(z2 - z1, x2 - x1);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, 0.06), mats.glass);
  pane.position.set((x1 + x2) / 2, WALL_H / 2, (z1 + z2) / 2);
  pane.rotation.y = rot;
  pane.renderOrder = 2;
  group.add(pane);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.06, 0.06, 0.1), mats.cap);
  cap.position.set((x1 + x2) / 2, WALL_H, (z1 + z2) / 2);
  cap.rotation.y = rot;
  cap.castShadow = true;
  group.add(cap);
  const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.1), mats.cap);
  base.position.set((x1 + x2) / 2, 0.06, (z1 + z2) / 2);
  base.rotation.y = rot;
  group.add(base);
}

function roomWalls(group, r, doorSide, mats) {
  const x0 = r.x - r.w / 2;
  const x1 = r.x + r.w / 2;
  const z0 = r.z - r.d / 2;
  const z1 = r.z + r.d / 2;
  const edges = { north: [x0, z0, x1, z0], south: [x0, z1, x1, z1], west: [x0, z0, x0, z1], east: [x1, z0, x1, z1] };
  for (const [side, [ax, az, bx, bz]] of Object.entries(edges)) {
    if (side !== doorSide) {
      wall(group, ax, az, bx, bz, mats);
      continue;
    }
    const horizontal = az === bz;
    const len = horizontal ? bx - ax : bz - az;
    const mid = len * 0.3;
    const half = Math.min(DOOR_W, len * 0.5) / 2;
    if (horizontal) {
      wall(group, ax, az, ax + mid - half, az, mats);
      wall(group, ax + mid + half, az, bx, bz, mats);
    } else {
      wall(group, ax, az, ax, az + mid - half, mats);
      wall(group, ax, az + mid + half, bx, bz, mats);
    }
  }
}

// ---- Mebel: juda sodda bloklar, faqat xona vazifasini his qildirish uchun ----
const F = () => mat(PALETTE.furniture, { roughness: 0.7 });
const FM = () => mat(PALETTE.furnitureMid, { roughness: 0.7 });
const FD = () => mat(PALETTE.furnitureDark, { roughness: 0.6 });

function bed(g, x, z, rot = 0) {
  const b = new THREE.Group();
  b.add(box(0.95, 0.45, 2.0, F(), 0, 0.3, 0));
  b.add(box(0.9, 0.12, 1.9, mat(0xffffff), 0, 0.58, 0));
  b.add(box(0.7, 0.14, 0.4, mat(PALETTE.cushion), 0, 0.7, -0.72));
  b.add(box(0.95, 0.7, 0.08, FM(), 0, 0.5, -1.0));
  b.position.set(x, 0, z);
  b.rotation.y = rot;
  g.add(b);
}
function desk(g, x, z, w = 1.5, rot = 0) {
  const d = new THREE.Group();
  d.add(box(w, 0.06, 0.75, mat(PALETTE.wood), 0, 0.75, 0));
  d.add(box(0.06, 0.72, 0.7, FM(), -w / 2 + 0.05, 0.36, 0));
  d.add(box(0.06, 0.72, 0.7, FM(), w / 2 - 0.05, 0.36, 0));
  d.add(box(0.5, 0.33, 0.04, FD(), 0, 1.0, -0.2));
  const chair = new THREE.Group();
  chair.add(box(0.5, 0.08, 0.5, mat(PALETTE.cushion), 0, 0.48, 0));
  chair.add(box(0.5, 0.5, 0.08, mat(PALETTE.cushion), 0, 0.75, 0.22));
  chair.position.set(0, 0, 0.7);
  d.add(chair);
  d.position.set(x, 0, z);
  d.rotation.y = rot;
  g.add(d);
}
function cabinet(g, x, z, w = 1.2, h = 1.8, rot = 0) {
  const c = box(w, h, 0.45, FM(), x, h / 2, z);
  c.rotation.y = rot;
  g.add(c);
}
function sofa(g, x, z, rot = 0) {
  const s = new THREE.Group();
  s.add(box(2.1, 0.42, 0.85, mat(PALETTE.furnitureMid), 0, 0.21, 0));
  s.add(box(2.1, 0.5, 0.2, mat(PALETTE.furnitureMid), 0, 0.6, -0.33));
  s.add(box(0.9, 0.12, 0.6, mat(PALETTE.cushion), -0.5, 0.48, 0.05));
  s.add(box(0.9, 0.12, 0.6, mat(PALETTE.cushion), 0.5, 0.48, 0.05));
  s.position.set(x, 0, z);
  s.rotation.y = rot;
  g.add(s);
}
function plant(g, x, z) {
  g.add(box(0.4, 0.4, 0.4, FM(), x, 0.2, z));
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mat(PALETTE.plant, { flatShading: true }));
  leaf.position.set(x, 0.75, z);
  leaf.castShadow = true;
  g.add(leaf);
}
function table(g, x, z, w = 1.2, d = 0.8) {
  g.add(box(w, 0.06, d, mat(PALETTE.wood), x, 0.72, z));
  g.add(box(0.1, 0.7, 0.1, FM(), x, 0.35, z));
}

export function furnish(group, room, r) {
  const kind = room.kind.toLowerCase();
  const rand = rng(hashString(room.id));
  const { x, z, w, d } = r;
  if (kind.startsWith('palata')) {
    const n = w > 5 ? 2 : 1;
    for (let i = 0; i < n; i++) bed(group, x - w / 2 + (w / (n + 1)) * (i + 1), z - d / 2 + 1.25);
    cabinet(group, x + w / 2 - 0.4, z + d / 2 - 0.5, 0.7, 0.9, Math.PI / 2);
    plant(group, x - w / 2 + 0.5, z + d / 2 - 0.6);
  } else if (kind.startsWith('kabinet')) {
    desk(group, x, z - d / 2 + 1.2, 1.6);
    cabinet(group, x - w / 2 + 0.35, z, 1.4, 1.8, Math.PI / 2);
    bed(group, x + w / 2 - 0.8, z + 0.3, 0);
    plant(group, x + w / 2 - 0.5, z - d / 2 + 0.5);
  } else if (kind.startsWith('operatsion')) {
    const t = new THREE.Group();
    t.add(box(0.8, 0.9, 2.1, mat(PALETTE.steel, { roughness: 0.4 }), 0, 0.45, 0));
    t.add(box(0.85, 0.08, 2.15, mat(PALETTE.cushion), 0, 0.94, 0));
    t.position.set(x, 0, z);
    group.add(t);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.18, 20), mat(0xffffff, { emissive: 0xfff4d6, emissiveIntensity: 0.6 }));
    lamp.position.set(x, 2.05, z);
    group.add(lamp);
    group.add(box(0.05, 0.3, 0.05, FD(), x, 2.2, z));
    group.add(box(0.6, 1.1, 0.5, FD(), x + w / 2 - 0.6, 0.55, z - d / 2 + 0.6));
    group.add(box(0.8, 0.9, 0.5, F(), x - w / 2 + 0.6, 0.45, z - d / 2 + 0.6));
  } else if (kind.startsWith('laboratoriya')) {
    group.add(box(w - 0.8, 0.9, 0.7, F(), x, 0.45, z - d / 2 + 0.55));
    group.add(box(0.7, 0.9, d - 1.8, F(), x - w / 2 + 0.55, 0.45, z + 0.3));
    for (let i = 0; i < 4; i++) group.add(box(0.28, 0.35 + rand() * 0.2, 0.28, mat(i % 2 ? PALETTE.cushion : PALETTE.steel), x - w / 2 + 1.2 + i * 0.9, 1.05, z - d / 2 + 0.55));
    table(group, x + 0.6, z + 0.4, 1.6, 0.9);
  } else if (kind.startsWith('oshxona')) {
    group.add(box(w - 0.8, 0.95, 0.7, F(), x, 0.475, z - d / 2 + 0.55));
    group.add(box(1.2, 0.08, 0.6, FD(), x - 0.8, 0.99, z - d / 2 + 0.55));
    group.add(box(1.8, 0.95, 0.9, F(), x, 0.475, z + 0.3));
    cabinet(group, x + w / 2 - 0.35, z + 0.3, 1.2, 1.9, Math.PI / 2);
  } else if (kind.startsWith('damolish')) {
    sofa(group, x - 0.6, z - d / 2 + 0.9);
    table(group, x - 0.6, z + 0.2, 1.0, 0.6);
    plant(group, x + w / 2 - 0.6, z - d / 2 + 0.6);
    plant(group, x + w / 2 - 0.6, z + d / 2 - 0.6);
  } else if (kind.startsWith('qabulxona')) {
    group.add(box(2.6, 1.05, 0.7, mat(0xffffff), x, 0.525, z - 0.4));
    group.add(box(2.7, 0.06, 0.8, mat(PALETTE.accent, { roughness: 0.4 }), x, 1.08, z - 0.4));
    for (let i = 0; i < 4; i++) group.add(box(0.5, 0.45, 0.5, mat(PALETTE.cushion), x - 1.5 + i * 0.75, 0.225, z + d / 2 - 0.7));
    plant(group, x - w / 2 + 0.6, z + d / 2 - 0.6);
  } else if (kind.startsWith('protsedura')) {
    bed(group, x - 0.6, z, Math.PI / 2);
    cabinet(group, x + w / 2 - 0.35, z, 1.8, 1.8, Math.PI / 2);
    group.add(box(0.6, 0.9, 0.5, mat(PALETTE.steel), x + 0.9, 0.45, z - d / 2 + 0.6));
  } else if (kind.startsWith('post')) {
    group.add(box(w - 1.4, 1.05, 0.6, mat(0xffffff), x, 0.525, z + d / 2 - 0.9));
    group.add(box(w - 1.3, 0.05, 0.7, mat(PALETTE.accent, { roughness: 0.4 }), x, 1.07, z + d / 2 - 0.9));
    desk(group, x, z - 0.6, 1.4);
    cabinet(group, x - w / 2 + 0.35, z - 0.4, 1.6, 1.8, Math.PI / 2);
  } else if (kind.startsWith('ombor')) {
    for (let i = 0; i < 3; i++) cabinet(group, x - w / 2 + 1 + i * 1.6, z - d / 2 + 0.45, 1.3, 2.0);
    group.add(box(0.8, 0.6, 0.8, mat(PALETTE.wood), x + 0.8, 0.3, z + 0.6));
  } else if (room.type === 'koridor') {
    plant(group, x - w / 2 + 0.6, z);
    for (let i = 0; i < 2; i++) group.add(box(1.6, 0.42, 0.45, mat(PALETTE.cushion), x - w / 4 + i * (w / 2), 0.21, z - d / 2 + 0.35));
  }
}

// Avtomatik qavat. floorLayout - shared/layout.js natijasi.
export function buildInteriorFloor(fl, floor, roomById, { furniture = true } = {}) {
  const group = new THREE.Group();
  group.name = `interior_${floor}`;
  const mats = {
    glass: new THREE.MeshStandardMaterial({ color: PALETTE.wallGlass, transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false }),
    cap: mat(PALETTE.wallCap, { roughness: 0.5 }),
  };
  const b = fl.bounds;
  const sw = b.maxX - b.minX + 1.2;
  const sd = b.maxZ - b.minZ + 1.2;
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  const slab = box(sw, SLAB_T, sd, mat(PALETTE.slab, { roughness: 0.95 }), cx, -SLAB_T / 2, cz, { cast: true });
  group.add(slab);
  group.add(box(sw + 0.02, 0.05, sd + 0.02, mat(PALETTE.slabSide), cx, -SLAB_T + 0.02, cz, { cast: false }));

  const c = fl.corridor;
  for (const [id, r] of Object.entries(fl.rooms)) {
    const room = roomById.get(id);
    const tile = box(r.w - 0.08, 0.03, r.d - 0.08, mat(PALETTE.rooms[room?.type] ?? PALETTE.rooms.ish, { roughness: 0.95 }), r.x, 0.015, r.z, { cast: false });
    tile.userData.roomId = id;
    group.add(tile);
    if (id === fl.corridorRoomId) {
      if (furniture && room) furnish(group, room, r);
      continue;
    }
    let doorSide;
    if (c.w >= c.d) doorSide = r.z < c.z ? 'south' : 'north';
    else doorSide = r.x < c.x ? 'east' : 'west';
    roomWalls(group, r, doorSide, mats);
    if (room?.type === 'maxfiy') {
      // Maxfiy zona: xira oyna, ichi ko'rinmaydi.
      group.add(box(r.w - 0.2, 2.2, r.d - 0.2, new THREE.MeshStandardMaterial({ color: 0xe9ebee, transparent: true, opacity: 0.75, roughness: 1 }), r.x, 1.1, r.z, { cast: false }));
    } else if (furniture && room) furnish(group, room, r);
    const text = room?.type === 'maxfiy' ? '🔒 Maxfiy zona' : room?.label ?? id;
    const l = label(text, `room ${room?.type === 'maxfiy' ? 'private' : ''}`);
    l.position.set(r.x, WALL_H + 0.25, r.z - r.d / 2 + 0.35);
    l.userData.roomLabel = true;
    group.add(l);
  }
  if (!fl.corridorRoomId) group.add(box(c.w, 0.03, c.d, mat(PALETTE.rooms.koridor), c.x, 0.015, c.z, { cast: false }));

  // Zinapoya.
  for (let i = 0; i < 7; i++) {
    group.add(box(0.42, 0.14 + i * 0.16, 2.2, mat(PALETTE.furnitureMid), fl.stairs.x - 1.3 + i * 0.42, (0.14 + i * 0.16) / 2, fl.stairs.z));
  }
  const st = label('Zinapoya', 'room muted');
  st.position.set(fl.stairs.x, 1.7, fl.stairs.z);
  st.userData.roomLabel = true;
  group.add(st);

  // Maxfiy zonadagilar shu maydonchada turadi (aniq xona ko'rsatilmaydi).
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.06, 36), mat(0xe3e6ea, { roughness: 1 }));
  pad.position.set(fl.privatePad.x, 0.03, fl.privatePad.z);
  pad.receiveShadow = true;
  group.add(pad);
  const pl = label('🔒 maxfiy zona', 'room private');
  pl.position.set(fl.privatePad.x, 0.35, fl.privatePad.z + 1.5);
  pl.userData.roomLabel = true;
  group.add(pl);

  const title = label(`${floor}F`, 'floor-title');
  title.position.set(b.minX - 1.8, 0.4, b.maxZ);
  title.userData.floorTitle = true;
  group.add(title);

  ownMaterials(group);
  return group;
}
