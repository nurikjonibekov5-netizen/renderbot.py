// Klinika tuzilishi: xonalar, xodimlar va lavozimlar ro'yxatini CSV fayllardan yig'adi.
import { parseCsv } from './csv.js';

const ROOM_RE = /^ROOM_(\d+)_([A-Za-z0-9]+)_(.+)$/;

export const ROOM_TYPES = {
  ish: 'ish',
  koridor: 'koridor',
  maxfiy: 'maxfiy',
  'dam olish': 'dam_olish',
  dam_olish: 'dam_olish',
};

const DEFAULT_ROLE = { color: '#7a8594', norm: 0.3, zones: [] };

// "ROOM_2_205_Operatsion" -> { floor: 2, code: "205", kind: "Operatsion" }
export function parseRoomId(id) {
  const m = ROOM_RE.exec(String(id).trim());
  if (!m) return null;
  return { floor: Number(m[1]), code: m[2], kind: m[3] };
}

export function parseTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

const TRANSLIT = { "'": '', '’': '', 'ʻ': '', 'ʼ': '', '`': '' };

export function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’ʻʼ`]/g, (c) => TRANSLIT[c])
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'xodim';
}

function parseRoles(csv, warnings) {
  const roles = {};
  for (const r of parseCsv(csv)) {
    const name = r.lavozim;
    if (!name) continue;
    const norm = Number(String(r.harakat_normasi).replace('%', '').replace(',', '.'));
    if (!Number.isFinite(norm) || norm <= 0 || norm > 100) {
      warnings.push(`Lavozim "${name}": harakat normasi noto'g'ri ("${r.harakat_normasi}"), 30% olindi.`);
    }
    roles[name] = {
      name,
      color: /^#[0-9a-f]{6}$/i.test(r.rang) ? r.rang : DEFAULT_ROLE.color,
      norm: Number.isFinite(norm) && norm > 0 && norm <= 100 ? norm / 100 : DEFAULT_ROLE.norm,
      zones: String(r.ish_zonalari || '').split(/[;|]/).map((z) => z.trim()).filter(Boolean),
    };
  }
  return roles;
}

function parseRooms(csv, demo, rooms, warnings) {
  for (const r of parseCsv(csv)) {
    const id = r.obyekt_nomi;
    if (!id) continue;
    const parsed = parseRoomId(id);
    if (!parsed) {
      warnings.push(`Xona nomi qoidaga mos emas: "${id}" (kerak: ROOM_<qavat>_<raqam>_<Nomi>).`);
      continue;
    }
    if (rooms.has(id)) {
      if (!demo) warnings.push(`Xona ikki marta yozilgan: "${id}".`);
      continue;
    }
    const type = ROOM_TYPES[String(r.turi || 'ish').trim().toLowerCase()];
    if (!type) warnings.push(`Xona "${id}": turi noma'lum ("${r.turi}"), "ish" deb olindi.`);
    rooms.set(id, {
      id,
      floor: parsed.floor,
      code: parsed.code,
      kind: parsed.kind,
      label: r.ekrandagi_nom || parsed.kind,
      type: type || 'ish',
      demo,
    });
  }
}

function parseStaff(csv, demo, ctx) {
  const { staff, rooms, roles, warnings, usedIds } = ctx;
  for (const r of parseCsv(csv)) {
    const name = r.ism_familiya;
    if (!name) continue;
    let id = slugify(name);
    for (let n = 2; usedIds.has(id); n++) id = `${slugify(name)}-${n}`;
    usedIds.add(id);
    const role = r.lavozim || 'Noma\'lum';
    if (!roles[role]) {
      warnings.push(`Xodim "${name}": "${role}" lavozimi lavozimlar ro'yxatida yo'q, standart norma olindi.`);
      roles[role] = { name: role, ...DEFAULT_ROLE };
    }
    let homeRoom = r.asosiy_xona;
    if (!rooms.has(homeRoom)) {
      warnings.push(`Xodim "${name}": asosiy xona "${homeRoom}" xonalar ro'yxatida topilmadi.`);
      homeRoom = null;
    }
    const floor = Number(r.asosiy_qavat) || (homeRoom ? rooms.get(homeRoom).floor : 1);
    let shiftStart = parseTime(r.smena_boshi);
    let shiftEnd = parseTime(r.smena_oxiri);
    if (shiftStart == null || shiftEnd == null || shiftEnd <= shiftStart) {
      warnings.push(`Xodim "${name}": smena vaqti noto'g'ri, 08:00–17:00 olindi.`);
      shiftStart = 8 * 60;
      shiftEnd = 17 * 60;
    }
    staff.push({
      id,
      name,
      role,
      floor,
      homeRoom,
      shiftStart,
      shiftEnd,
      badge: r.nishon_id || id,
      demo,
    });
  }
}

// Barcha ro'yxatlardan bitta klinika obyektini yig'adi.
export function buildClinic({ roomsCsv, staffCsv, rolesCsv, demoRoomsCsv = '', demoStaffCsv = '' }) {
  const warnings = [];
  const roles = parseRoles(rolesCsv, warnings);
  const rooms = new Map();
  parseRooms(roomsCsv, false, rooms, warnings);
  if (demoRoomsCsv) parseRooms(demoRoomsCsv, true, rooms, warnings);
  const staff = [];
  const ctx = { staff, rooms, roles, warnings, usedIds: new Set() };
  parseStaff(staffCsv, false, ctx);
  if (demoStaffCsv) parseStaff(demoStaffCsv, true, ctx);

  const floors = [...new Set([...rooms.values()].map((r) => r.floor))].sort((a, b) => a - b);
  return { rooms: [...rooms.values()], roomById: rooms, staff, roles, floors, warnings };
}

// Xona shu lavozim uchun ish zonasimi?
export function isWorkZone(role, room) {
  if (!role || !room) return false;
  if (room.type === 'maxfiy' || room.type === 'dam_olish') return false;
  if (role.zones.includes('*')) return true;
  const kind = room.kind.toLowerCase();
  return role.zones.some((z) => kind.startsWith(z.toLowerCase()));
}

// Klinikani JSON ko'rinishiga (ekranga yuborish uchun) o'giradi.
export function clinicToJson(clinic) {
  return {
    rooms: clinic.rooms,
    staff: clinic.staff.map(({ badge, ...s }) => s),
    roles: clinic.roles,
    floors: clinic.floors,
    warnings: clinic.warnings,
  };
}
