// Bino: 3ds Max modeli (GLB) bo'lsa o'shani yuklaydi, bo'lmasa xonalar ro'yxatidan o'zi chizadi.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { parseRoomId } from '../../../shared/clinic.js';

export const WALL_H = 1.2;
const DOOR_W = 1.4;

const ROOM_COLORS = {
  ish: 0xe8eef5,
  koridor: 0xf4efe4,
  maxfiy: 0xd9dcdf,
  dam_olish: 0xe2f1e5,
};

const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9d3dd, roughness: 0.85 });
const slabMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.9 });
const stairMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.8 });
const padMat = new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.9, transparent: true, opacity: 0.8 });

export function roomLabel(text, cls = '') {
  const el = document.createElement('div');
  el.className = `room-label ${cls}`;
  el.textContent = text;
  return new CSS2DObject(el);
}

function wall(group, x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.05) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(len, WALL_H, 0.12), wallMat);
  m.position.set((x1 + x2) / 2, WALL_H / 2, (z1 + z2) / 2);
  m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  m.castShadow = false;
  m.receiveShadow = true;
  group.add(m);
}

// Devor, eshik o'rni koridor tomonda qoldiriladi.
function roomWalls(group, r, doorSide) {
  const x0 = r.x - r.w / 2;
  const x1 = r.x + r.w / 2;
  const z0 = r.z - r.d / 2;
  const z1 = r.z + r.d / 2;
  const edges = {
    north: [x0, z0, x1, z0],
    south: [x0, z1, x1, z1],
    west: [x0, z0, x0, z1],
    east: [x1, z0, x1, z1],
  };
  for (const [side, [ax, az, bx, bz]] of Object.entries(edges)) {
    if (side !== doorSide) {
      wall(group, ax, az, bx, bz);
      continue;
    }
    const horizontal = az === bz;
    const len = horizontal ? bx - ax : bz - az;
    const mid = len / 2;
    const half = Math.min(DOOR_W, len * 0.6) / 2;
    if (horizontal) {
      wall(group, ax, az, ax + mid - half, az);
      wall(group, ax + mid + half, az, bx, bz);
    } else {
      wall(group, ax, az, ax, az + mid - half);
      wall(group, ax, az + mid + half, bx, bz);
    }
  }
}

function stairs(group, p) {
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12 + i * 0.12, 2.2), stairMat);
    step.position.set(p.x - 1.1 + i * 0.45, (0.12 + i * 0.12) / 2, p.z);
    group.add(step);
  }
  const label = roomLabel('Zinapoya', 'muted');
  label.position.set(p.x, 1.3, p.z);
  group.add(label);
}

function privatePad(group, p, floor) {
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.08, 32), padMat);
  pad.position.set(p.x, 0.04, p.z);
  group.add(pad);
  const label = roomLabel('🔒 maxfiy zona', 'private');
  label.position.set(p.x, 0.4, p.z + 1.5);
  group.add(label);
}

// Avtomatik chizilgan qavat.
export function buildAutoFloor(floorLayout, floor, roomsById) {
  const group = new THREE.Group();
  group.name = `auto_floor_${floor}`;
  const b = floorLayout.bounds;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(b.maxX - b.minX + 1, 0.2, b.maxZ - b.minZ + 1), slabMat);
  slab.position.set((b.minX + b.maxX) / 2, -0.11, (b.minZ + b.maxZ) / 2);
  slab.receiveShadow = true;
  group.add(slab);

  const c = floorLayout.corridor;
  for (const [id, r] of Object.entries(floorLayout.rooms)) {
    const room = roomsById.get(id);
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(r.w - 0.06, 0.04, r.d - 0.06),
      new THREE.MeshStandardMaterial({ color: ROOM_COLORS[room?.type] ?? ROOM_COLORS.ish, roughness: 0.95 }),
    );
    tile.position.set(r.x, 0.02, r.z);
    tile.receiveShadow = true;
    tile.userData.roomId = id;
    group.add(tile);
    if (id === floorLayout.corridorRoomId) continue;
    let doorSide = 'north';
    if (c.w >= c.d) doorSide = r.z < c.z ? 'south' : 'north';
    else doorSide = r.x < c.x ? 'east' : 'west';
    roomWalls(group, r, doorSide);
    const text = room?.type === 'maxfiy' ? '🔒 Maxfiy zona' : room?.label ?? id;
    const label = roomLabel(text, room?.type === 'maxfiy' ? 'private' : '');
    label.position.set(r.x, WALL_H + 0.25, r.z);
    label.userData.roomLabel = true;
    group.add(label);
  }
  if (!floorLayout.corridorRoomId) {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(c.w, 0.04, c.d),
      new THREE.MeshStandardMaterial({ color: ROOM_COLORS.koridor, roughness: 0.95 }),
    );
    tile.position.set(c.x, 0.02, c.z);
    group.add(tile);
  }
  stairs(group, floorLayout.stairs);
  privatePad(group, floorLayout.privatePad, floor);
  const title = roomLabel(`${floor}-qavat`, 'floor-title');
  title.position.set(b.minX - 1.5, 0.5, 0);
  group.add(title);
  return group;
}

// 3ds Max'dan kelgan o'lchov birligini taxmin qiladi: bitta qavat 8–300 metr bo'lishi kerak.
// Tartib: metr, santimetr, millimetr, dyuym. Sozlamalarda "model_masshtabi" berilsa, o'sha olinadi.
export function guessScale(size, override) {
  if (override > 0) return override;
  const max = Math.max(size.x, size.z);
  for (const k of [1, 0.01, 0.001, 0.0254]) {
    if (max * k >= 8 && max * k <= 300) return k;
  }
  return 1;
}

// GLB modelni yuklaydi va undagi ROOM_... obyektlardan xona o'rinlarini oladi.
export async function loadModelFloor(loader, url, floor, clinic, { scale: scaleOverride = 0 } = {}) {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = guessScale(size, scaleOverride);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (o.isMesh) {
      o.receiveShadow = true;
      o.castShadow = false;
    }
  });

  const rooms = {};
  const found = new Set();
  const wrong = [];
  let stairsObj = null;
  model.traverse((o) => {
    if (/^(ZINA|STAIRS)_\d+/i.test(o.name)) stairsObj = o;
    const parsed = parseRoomId(o.name);
    if (!parsed) return;
    if (found.has(o.name)) return;
    found.add(o.name);
    if (parsed.floor !== floor) wrong.push(o.name);
    const b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    const s = b.getSize(new THREE.Vector3());
    rooms[o.name] = { x: c.x, z: c.z, w: Math.max(s.x, 0.5), d: Math.max(s.z, 0.5), top: b.max.y };
    // Xona yaxlit "quti" bo'lsa, ichidagi odamchalar ko'rinishi uchun yarim shaffof qilinadi.
    if (s.y > 0.5) {
      o.traverse((m) => {
        if (!m.isMesh) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        m.material = mats.map((mat) => {
          const x = mat.clone();
          x.transparent = true;
          x.opacity = Math.min(x.opacity ?? 1, 0.28);
          x.depthWrite = false;
          return x;
        });
        if (m.material.length === 1) m.material = m.material[0];
        m.renderOrder = 1;
      });
    }
  });

  const floorRooms = clinic.rooms.filter((r) => r.floor === floor);
  const missing = floorRooms.filter((r) => !rooms[r.id]).map((r) => r.id);
  const extra = [...found].filter((id) => !clinic.roomById.has(id));
  const corridorRoom = floorRooms.find((r) => r.type === 'koridor' && rooms[r.id]);
  const all = new THREE.Box3().setFromObject(model);
  const bounds = { minX: all.min.x, maxX: all.max.x, minZ: all.min.z, maxZ: all.max.z };
  const corridor = corridorRoom
    ? rooms[corridorRoom.id]
    : { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2, w: 2, d: 2 };
  let stairsPoint;
  if (stairsObj) {
    const sc = new THREE.Box3().setFromObject(stairsObj).getCenter(new THREE.Vector3());
    stairsPoint = { x: sc.x, z: sc.z };
  } else if (corridor.w >= corridor.d) stairsPoint = { x: corridor.x + corridor.w / 2 - 1, z: corridor.z };
  else stairsPoint = { x: corridor.x, z: corridor.z + corridor.d / 2 - 1 };

  // Modelda topilmagan xonalar koridor o'rtasiga qo'yiladi (ogohlantirish bilan).
  for (const id of missing) rooms[id] = { ...corridor, w: 1.5, d: 1.5, missing: true };

  const group = new THREE.Group();
  group.name = `model_floor_${floor}`;
  group.add(model);
  for (const r of floorRooms) {
    const rr = rooms[r.id];
    if (!rr || rr.missing || r.type === 'koridor') continue;
    const text = r.type === 'maxfiy' ? '🔒 Maxfiy zona' : r.label;
    const label = roomLabel(text, r.type === 'maxfiy' ? 'private' : '');
    label.position.set(rr.x, Math.min(rr.top ?? WALL_H, 3) + 0.25, rr.z);
    label.userData.roomLabel = true;
    group.add(label);
  }
  const privatePadPoint = { x: bounds.maxX + 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  privatePad(group, privatePadPoint, floor);
  const title = roomLabel(`${floor}-qavat`, 'floor-title');
  title.position.set(bounds.minX - 1.5, 0.5, (bounds.minZ + bounds.maxZ) / 2);
  group.add(title);

  return {
    group,
    layout: {
      rooms,
      corridor,
      corridorRoomId: corridorRoom?.id ?? null,
      stairs: stairsPoint,
      privatePad: privatePadPoint,
      bounds,
    },
    info: { floor, scale, missing, extra, wrongFloor: wrong, roomsFound: found.size },
  };
}
