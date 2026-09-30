// Avtomatik bino chizmasi: 3ds Max modeli hali yo'q qavatlar uchun xonalarni
// koridorning ikki tomoniga tartib bilan joylashtiradi. O'lchamlar metrda.
// Zinapoya barcha qavatlarda bir xil joyda turadi (koridorning sharqiy uchida).

export const ROOM_W = 6;
export const ROOM_D = 5;
export const CORRIDOR_D = 3;
export const STAIRS_W = 4;

function codeOrder(a, b) {
  const na = Number(a.code);
  const nb = Number(b.code);
  const fa = Number.isFinite(na);
  const fb = Number.isFinite(nb);
  if (fa && fb) return na - nb;
  if (fa) return -1;
  if (fb) return 1;
  return a.code.localeCompare(b.code);
}

export function autoLayout(clinic) {
  const perFloor = new Map();
  for (const f of clinic.floors) {
    const rooms = clinic.rooms.filter((r) => r.floor === f);
    const corridor = rooms.find((r) => r.type === 'koridor') || null;
    const others = rooms.filter((r) => r !== corridor).sort(codeOrder);
    perFloor.set(f, { corridor, others });
  }
  const maxCols = Math.max(1, ...[...perFloor.values()].map((x) => Math.ceil(x.others.length / 2)));
  const length = maxCols * ROOM_W;
  const x0 = -length / 2 - STAIRS_W / 2;

  const floors = {};
  for (const [f, { corridor, others }] of perFloor) {
    const rooms = {};
    others.forEach((room, i) => {
      const col = Math.floor(i / 2);
      const north = i % 2 === 0;
      rooms[room.id] = {
        x: x0 + ROOM_W * (col + 0.5),
        z: (north ? -1 : 1) * (CORRIDOR_D / 2 + ROOM_D / 2),
        w: ROOM_W,
        d: ROOM_D,
        side: north ? -1 : 1,
      };
    });
    const corridorRect = { x: x0 + (length + STAIRS_W) / 2, z: 0, w: length + STAIRS_W, d: CORRIDOR_D, side: 0 };
    if (corridor) rooms[corridor.id] = corridorRect;
    floors[f] = {
      rooms,
      corridor: corridorRect,
      corridorRoomId: corridor?.id ?? null,
      stairs: { x: x0 + length + STAIRS_W / 2, z: 0 },
      privatePad: { x: x0 + length + STAIRS_W + 2, z: 0 },
      bounds: { minX: x0, maxX: x0 + length + STAIRS_W, minZ: -(CORRIDOR_D / 2 + ROOM_D), maxZ: CORRIDOR_D / 2 + ROOM_D },
    };
  }
  return { floors, source: 'auto' };
}

// Xona eshigi: xonadan koridorga chiqiladigan nuqta (koridor ichida).
// Koridor qaysi yo'nalishda cho'zilganidan qat'i nazar ishlaydi (3ds Max modellari uchun ham).
export function doorPoint(floorLayout, roomId) {
  const r = floorLayout.rooms[roomId];
  const c = floorLayout.corridor;
  if (!r) return { x: c.x, z: c.z };
  if (roomId === floorLayout.corridorRoomId) return { x: r.x, z: r.z };
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  if (c.w >= c.d) {
    const s = Math.sign(r.z - c.z) || 1;
    return { x: clamp(r.x, c.x - c.w / 2 + 0.5, c.x + c.w / 2 - 0.5), z: c.z + s * Math.max(0, c.d / 2 - 0.4) };
  }
  const s = Math.sign(r.x - c.x) || 1;
  return { x: c.x + s * Math.max(0, c.w / 2 - 0.4), z: clamp(r.z, c.z - c.d / 2 + 0.5, c.z + c.d / 2 - 0.5) };
}
