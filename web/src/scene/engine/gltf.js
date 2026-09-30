// 3ds Max'dan eksport qilingan GLB qavat modelini yuklaydi va undagi ROOM_... obyektlardan
// xonalar o'rnini oladi. Model bo'lmagan qavatlar avtomatik chiziladi (interior.js).
import * as THREE from 'three';
import { parseRoomId } from '../../../../shared/clinic.js';
import { label, ownMaterials } from './util.js';
import { WALL_H } from './interior.js';

// O'lchov birligini taxmin qiladi: bitta qavat 8–300 metr bo'lishi kerak.
// Tartib: metr, santimetr, millimetr, dyuym. Sozlamalarda "model_masshtabi" berilsa, o'sha olinadi.
export function guessScale(size, override) {
  if (override > 0) return override;
  const max = Math.max(size.x, size.z);
  for (const k of [1, 0.01, 0.001, 0.0254]) {
    if (max * k >= 8 && max * k <= 300) return k;
  }
  return 1;
}

export async function loadModelFloor(loader, url, floor, clinic, { scale: scaleOverride = 0 } = {}) {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  let box = new THREE.Box3().setFromObject(model);
  const scale = guessScale(box.getSize(new THREE.Vector3()), scaleOverride);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (o.isMesh) {
      o.receiveShadow = true;
      o.castShadow = true;
    }
  });

  const rooms = {};
  const found = new Set();
  const wrong = [];
  let stairsObj = null;
  model.traverse((o) => {
    if (/^(ZINA|STAIRS)_\d+/i.test(o.name)) stairsObj = o;
    const parsed = parseRoomId(o.name);
    if (!parsed || found.has(o.name)) return;
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
        const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((mat) => {
          const x = mat.clone();
          x.transparent = true;
          x.opacity = Math.min(x.opacity ?? 1, 0.28);
          x.depthWrite = false;
          return x;
        });
        m.material = mats.length === 1 ? mats[0] : mats;
        m.castShadow = false;
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
  let stairs;
  if (stairsObj) {
    const sc = new THREE.Box3().setFromObject(stairsObj).getCenter(new THREE.Vector3());
    stairs = { x: sc.x, z: sc.z };
  } else if (corridor.w >= corridor.d) stairs = { x: corridor.x + corridor.w / 2 - 1, z: corridor.z };
  else stairs = { x: corridor.x, z: corridor.z + corridor.d / 2 - 1 };
  for (const id of missing) rooms[id] = { ...corridor, w: 1.5, d: 1.5, missing: true };

  const group = new THREE.Group();
  group.name = `model_floor_${floor}`;
  group.add(model);
  for (const r of floorRooms) {
    const rr = rooms[r.id];
    if (!rr || rr.missing || r.type === 'koridor') continue;
    const l = label(r.type === 'maxfiy' ? '🔒 Maxfiy zona' : r.label, `room ${r.type === 'maxfiy' ? 'private' : ''}`);
    l.position.set(rr.x, Math.min(rr.top ?? WALL_H, 3) + 0.25, rr.z - rr.d / 2 + 0.35);
    l.userData.roomLabel = true;
    group.add(l);
  }
  const privatePad = { x: bounds.maxX + 2, z: (bounds.minZ + bounds.maxZ) / 2 };
  const pl = label('🔒 maxfiy zona', 'room private');
  pl.position.set(privatePad.x, 0.35, privatePad.z + 1.5);
  pl.userData.roomLabel = true;
  group.add(pl);
  const title = label(`${floor}F`, 'floor-title');
  title.position.set(bounds.minX - 1.8, 0.4, bounds.maxZ);
  title.userData.floorTitle = true;
  group.add(title);
  ownMaterials(group);

  return {
    group,
    layout: { rooms, corridor, corridorRoomId: corridorRoom?.id ?? null, stairs, privatePad, bounds },
    info: { floor, scale, missing, extra, wrongFloor: wrong, roomsFound: found.size },
  };
}
