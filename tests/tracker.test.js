import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tracker, STATUS } from '../shared/tracker.js';
import { MIN } from '../shared/time.js';
import { clinic } from './helpers.js';

const T0 = Date.UTC(2026, 8, 30, 4, 0); // 09:00 Toshkent

function setup() {
  const c = clinic();
  const t = new Tracker(c, { idleLimitMs: 20 * MIN, signalLossMs: 60_000 });
  t.resetDay(T0 - 9 * 60 * MIN);
  return { c, t };
}

// Har 5 soniyada kuzatuv yuborib, vaqtni suradi.
function feed(t, id, from, minutes, obs) {
  for (let x = from; x <= from + minutes * MIN; x += 5000) t.observe(id, x, obs);
  return from + minutes * MIN;
}

test("holatlar: binoda emas, yurmoqda, turibdi, uzoq harakatsiz, signal yo'q", () => {
  const { t } = setup();
  const id = 'aziz-rahimov';
  assert.equal(t.state(id, T0).status, STATUS.OUT);
  let now = feed(t, id, T0, 2, { roomId: 'ROOM_2_205_Operatsion', moving: true });
  assert.equal(t.state(id, now).status, STATUS.MOVING);
  now = feed(t, id, now, 5, { roomId: 'ROOM_2_205_Operatsion', moving: false });
  assert.equal(t.state(id, now).status, STATUS.STANDING);
  now = feed(t, id, now, 20, { roomId: 'ROOM_2_205_Operatsion', moving: false });
  assert.equal(t.state(id, now).status, STATUS.IDLE);
  t.advance(now + 2 * MIN);
  assert.equal(t.state(id, now + 2 * MIN).status, STATUS.LOST);
  t.observe(id, now + 3 * MIN, { roomId: null });
  assert.equal(t.state(id, now + 3 * MIN).status, STATUS.OUT);
});

test("maxfiy zonada faqat qavat ko'rinadi", () => {
  const { t } = setup();
  const id = 'dilnoza-karimova';
  const now = feed(t, id, T0, 3, { roomId: 'ROOM_2_WC1_Hojatxona', moving: false });
  const st = t.state(id, now);
  assert.equal(st.room, null);
  assert.equal(st.floor, 2);
  assert.equal(st.private, true);
  for (const seg of t.timeline(id)) assert.equal(seg.room, null);
  assert.ok(!JSON.stringify(t.timeline(id)).includes('WC1'));
});

test("faollik lavozim normasiga qarab hisoblanadi", () => {
  const { t } = setup();
  // Shifokor: 20% harakat (norma 20%), hammasi kabinetda -> 100%.
  let now = T0;
  for (let i = 0; i < 6; i++) {
    now = feed(t, 'aziz-rahimov', now, 2, { roomId: 'ROOM_2_205_Operatsion', moving: true });
    now = feed(t, 'aziz-rahimov', now, 8, { roomId: 'ROOM_2_205_Operatsion', moving: false });
  }
  const doc = t.summary('aziz-rahimov');
  assert.ok(doc.activity >= 95, `shifokor ${doc.activity}`);
  assert.ok(Math.abs(doc.movingMs / doc.presentMs - 0.2) < 0.02);

  // Sanitarka: xuddi shunday 20% harakat, lekin normasi 70% -> past foiz.
  now = T0;
  for (let i = 0; i < 6; i++) {
    now = feed(t, 'gulnora-toshpulatova', now, 2, { roomId: 'ROOM_1_CORR_Koridor', moving: true });
    now = feed(t, 'gulnora-toshpulatova', now, 8, { roomId: 'ROOM_1_CORR_Koridor', moving: false });
  }
  const san = t.summary('gulnora-toshpulatova');
  assert.ok(san.activity < 70, `sanitarka ${san.activity}`);

  // Dam olish xonasida o'tirgan hamshira -> juda past.
  now = feed(t, 'dilnoza-karimova', T0, 60, { roomId: 'ROOM_4_402_DamOlish', moving: false });
  const n = t.summary('dilnoza-karimova');
  assert.equal(n.activity, 0);
  assert.ok(n.restMs > 59 * MIN);
  assert.equal(n.idleCount, 1);
});

test("kunlik tasma xona va harakat o'zgarishlarini yozadi", () => {
  const { t } = setup();
  const id = 'dilnoza-karimova';
  let now = feed(t, id, T0, 10, { roomId: 'ROOM_2_204_Palata', moving: false });
  now = feed(t, id, now, 1, { roomId: 'ROOM_2_CORR_Koridor', moving: true });
  now = feed(t, id, now, 10, { roomId: 'ROOM_2_201_Palata', moving: true });
  const tl = t.timeline(id);
  assert.deepEqual(tl.map((s) => s.room), ['ROOM_2_204_Palata', 'ROOM_2_CORR_Koridor', 'ROOM_2_201_Palata']);
  for (let i = 1; i < tl.length; i++) assert.equal(tl[i].s, tl[i - 1].e);
  assert.equal(t.summary(id).roomsVisited, 2);
});
