// Sinov uchun GLB model yasaydi: 3ds Max eksportiga o'xshab, har xona ROOM_... nomli alohida obyekt.
// Foydalanish:  node scripts/namuna-glb.js <qavat> <chiqish.glb> [--santimetr] [--tashla ROOM_...]
// Bu faqat sinov uchun. Haqiqiy model 3ds Max'da yasaladi (models/README.md ga qarang).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClinicFromDisk } from '../shared/load-node.js';
import { autoLayout } from '../shared/layout.js';

const COLORS = { ish: [0.85, 0.9, 0.95], koridor: [0.95, 0.92, 0.85], maxfiy: [0.8, 0.8, 0.82], dam_olish: [0.85, 0.95, 0.87] };

function box(cx, cy, cz, sx, sy, sz) {
  const [hx, hy, hz] = [sx / 2, sy / 2, sz / 2];
  const faces = [
    [[1, 0, 0], [[hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [hx, -hy, hz]]],
    [[-1, 0, 0], [[-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-hx, -hy, -hz]]],
    [[0, 1, 0], [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]]],
    [[0, -1, 0], [[-hx, -hy, hz], [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz]]],
    [[0, 0, 1], [[hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [-hx, -hy, hz]]],
    [[0, 0, -1], [[-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [hx, -hy, -hz]]],
  ];
  const pos = [];
  const nrm = [];
  const idx = [];
  faces.forEach(([n, vs], f) => {
    for (const v of vs) {
      pos.push(v[0] + cx, v[1] + cy, v[2] + cz);
      nrm.push(...n);
    }
    const o = f * 4;
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  return { pos, nrm, idx };
}

export function buildGlb(objects) {
  const bin = [];
  let offset = 0;
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];
  const materials = [];
  const matIndex = new Map();
  const push = (typed, target) => {
    const bytes = Buffer.from(typed.buffer);
    const pad = (4 - (bytes.length % 4)) % 4;
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    bin.push(bytes, Buffer.alloc(pad));
    offset += bytes.length + pad;
    return bufferViews.length - 1;
  };
  for (const o of objects) {
    const key = o.color.join(',');
    if (!matIndex.has(key)) {
      matIndex.set(key, materials.length);
      materials.push({ pbrMetallicRoughness: { baseColorFactor: [...o.color, 1], metallicFactor: 0, roughnessFactor: 0.9 } });
    }
    const pos = new Float32Array(o.geo.pos);
    const min = [0, 1, 2].map((a) => Math.min(...o.geo.pos.filter((_, i) => i % 3 === a)));
    const max = [0, 1, 2].map((a) => Math.max(...o.geo.pos.filter((_, i) => i % 3 === a)));
    accessors.push({ bufferView: push(pos, 34962), componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max });
    const pa = accessors.length - 1;
    accessors.push({ bufferView: push(new Float32Array(o.geo.nrm), 34962), componentType: 5126, count: pos.length / 3, type: 'VEC3' });
    const na = accessors.length - 1;
    const idx = new Uint16Array(o.geo.idx);
    accessors.push({ bufferView: push(idx, 34963), componentType: 5123, count: idx.length, type: 'SCALAR' });
    const ia = accessors.length - 1;
    meshes.push({ name: o.name, primitives: [{ attributes: { POSITION: pa, NORMAL: na }, indices: ia, material: matIndex.get(key) }] });
    nodes.push({ name: o.name, mesh: meshes.length - 1 });
  }
  const binBuf = Buffer.concat(bin);
  const json = {
    asset: { version: '2.0', generator: 'klinika namuna-glb' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuf.length }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  const total = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const chunk = (buf, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(buf.length, 0);
    h.writeUInt32LE(type, 4);
    return Buffer.concat([h, buf]);
  };
  return Buffer.concat([header, chunk(jsonBuf, 0x4e4f534a), chunk(binBuf, 0x004e4942)]);
}

// Qavatni avtomatik chizmadan olib, GLB ko'rinishida yozadi (xonalar biroz boshqacha joylashgan).
export function floorGlb(clinic, floor, { unit = 1, skip = [], shiftX = 0 } = {}) {
  const fl = autoLayout(clinic).floors[floor];
  const objects = [];
  for (const [id, r] of Object.entries(fl.rooms)) {
    if (skip.includes(id)) continue;
    const room = clinic.roomById.get(id);
    const h = room.type === 'koridor' ? 0.1 : 2.8;
    const u = unit;
    objects.push({ name: id, color: COLORS[room.type] ?? COLORS.ish, geo: box((r.x + shiftX) * u, (h / 2) * u, r.z * u, (r.w - 0.3) * u, h * u, (r.d - 0.3) * u) });
  }
  objects.push({ name: `ZINA_${floor}`, color: [0.6, 0.65, 0.7], geo: box((fl.stairs.x + shiftX) * unit, 0.5 * unit, fl.stairs.z * unit, 3 * unit, 1 * unit, 2.4 * unit) });
  return buildGlb(objects);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [floorArg, out, ...rest] = process.argv.slice(2);
  if (!floorArg || !out) {
    console.log('Foydalanish: node scripts/namuna-glb.js <qavat> <chiqish.glb> [--santimetr] [--tashla ROOM_...]');
    process.exit(1);
  }
  const skip = [];
  for (let i = 0; i < rest.length; i++) if (rest[i] === '--tashla') skip.push(rest[++i]);
  const clinic = loadClinicFromDisk(join(dirname(fileURLToPath(import.meta.url)), '..', 'data'));
  writeFileSync(out, floorGlb(clinic, Number(floorArg), { unit: rest.includes('--santimetr') ? 100 : 1, skip }));
  console.log(`Yozildi: ${out}`);
}
