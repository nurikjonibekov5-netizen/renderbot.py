import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ClinicEngine } from '../shared/engine.js';
import { dayStart, HOUR, MIN, minuteOfDay } from '../shared/time.js';
import { clinic } from './helpers.js';

const DAY = dayStart(Date.UTC(2026, 8, 30, 12));

function runDay(untilHour = 18, seed = 1) {
  const c = clinic();
  let now = DAY + untilHour * HOUR;
  const e = new ClinicEngine(c, { seed }, { now: () => now });
  return { c, e, advance: (ms) => { now += ms; e.tick(); } };
}

test("simulyatsiya takrorlanadi (bir xil urug' -> bir xil natija)", () => {
  const a = runDay(15).e.today();
  const b = runDay(15).e.today();
  assert.deepEqual(a, b);
});

test("har lavozim o'ziga xos ishlaydi", () => {
  const { c, e } = runDay(18);
  const rows = e.today().rows;
  const avg = (role, f) => {
    const list = rows.filter((r) => c.staff.find((s) => s.id === r.id).role === role);
    return list.reduce((sum, r) => sum + f(r), 0) / list.length;
  };
  const moveRatio = (r) => r.movingMs / r.presentMs;
  assert.ok(avg('Sanitarka', moveRatio) > avg('Hamshira', moveRatio));
  assert.ok(avg('Hamshira', moveRatio) > avg('Shifokor', moveRatio));
  assert.ok(avg('Sanitarka', (r) => r.roomsVisited) > avg('Laborant', (r) => r.roomsVisited));
  for (const r of rows) {
    assert.ok(r.presentMs > 3 * HOUR, `${r.id} binoda bo'lgan`);
    assert.ok(r.activity >= 40 && r.activity <= 100, `${r.id} faollik ${r.activity}`);
    assert.ok(r.restMs > 10 * MIN, `${r.id} tushlik qilgan`);
  }
});

test("smenadan tashqarida hech kim binoda emas", () => {
  const { c, e } = runDay(18);
  for (const st of e.snapshot().staff) {
    const s = c.staff.find((x) => x.id === st.id);
    if (minuteOfDay(e.now()) > s.shiftEnd + 25) assert.equal(st.present, false, s.name);
  }
  // Ertalab 06:40 da hech kim yo'q.
  const c2 = clinic();
  let now = DAY + 6 * HOUR + 40 * MIN;
  const early = new ClinicEngine(c2, {}, { now: () => now });
  assert.equal(early.demoDay, true);
});

test("ekranga yuboriladigan ma'lumotda maxfiy xona nomi hech qachon yo'q", () => {
  const { c, e, advance } = runDay(9);
  const privateIds = c.rooms.filter((r) => r.type === 'maxfiy').map((r) => r.id);
  let seenPrivate = false;
  for (let i = 0; i < 600; i++) {
    advance(30_000);
    const json = JSON.stringify(e.snapshot());
    for (const id of privateIds) assert.ok(!json.includes(id));
    if (e.snapshot().staff.some((s) => s.private)) seenPrivate = true;
  }
  assert.ok(seenPrivate, 'kimdir maxfiy zonaga kirgan');
  for (const s of c.staff) assert.ok(!privateIds.some((id) => JSON.stringify(e.timeline(s.id)).includes(id)));
});

test("tezlikni o'zgartirish vaqtni tezlatadi", () => {
  const { e, advance } = runDay(11);
  const t0 = e.now();
  e.setSpeed(60);
  advance(60_000);
  assert.equal(e.now() - t0, 60 * MIN);
  assert.equal(e.setSpeed(7), false);
});

test("xodim xonadan xonaga koridor orqali o'tadi", () => {
  const { c, e } = runDay(17);
  for (const s of c.staff) {
    const tl = e.timeline(s.id).filter((x) => x.room);
    for (let i = 1; i < tl.length; i++) {
      const a = c.roomById.get(tl[i - 1].room);
      const b = c.roomById.get(tl[i].room);
      if (a.id === b.id) continue;
      assert.ok(a.type === 'koridor' || b.type === 'koridor', `${s.name}: ${a.id} -> ${b.id}`);
    }
  }
});

test("kunlik qator (grafiklar uchun) hozirgi holat bilan mos", () => {
  const { e } = runDay(12);
  const series = e.today().series;
  assert.ok(series.length >= 10);
  const last = series[series.length - 1];
  assert.equal(last.t, e.now());
  const present = e.snapshot().staff.filter((s) => s.present).length;
  assert.ok(Math.abs(last.present - present) <= 1, `${last.present} / ${present}`);
  assert.equal(series[0].present, 0);
  for (let i = 1; i < series.length; i++) assert.ok(series[i].t > series[i - 1].t);
});

test("so'nggi voqealar: tartiblangan, maxfiy xona nomisiz", () => {
  const { c, e } = runDay(14);
  const ev = e.recentEvents(50);
  assert.ok(ev.length > 10);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i - 1].t >= ev[i].t);
  const priv = c.rooms.filter((r) => r.type === 'maxfiy');
  const json = JSON.stringify(ev);
  for (const r of priv) assert.ok(!json.includes(r.id) && !json.includes(`${r.label}ga`), r.id);
});
