import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReceiverLocator } from '../shared/receivers.js';
import { ClinicEngine } from '../shared/engine.js';
import { clinic } from './helpers.js';

test("eng kuchli qabul qiluvchi xonasi tanlanadi, kichik tebranishga sakramaydi", () => {
  const loc = new ReceiverLocator(clinic());
  const t = 1_000_000;
  loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_2_204_Palata', rssi: -60, harakat: true }, t);
  loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_2_205_Operatsion', rssi: -75 }, t);
  assert.deepEqual(loc.resolve(t), [{ staffId: 'dilnoza-karimova', roomId: 'ROOM_2_204_Palata', moving: true }]);
  // Qo'shni xona 2 dB kuchliroq — almashmaydi (devor orqali sakrash).
  loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_2_205_Operatsion', rssi: -45 }, t + 1000);
  loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_2_204_Palata', rssi: -60 }, t + 1000);
  assert.equal(loc.resolve(t + 1000)[0].roomId, 'ROOM_2_204_Palata');
  // 12 soniyadan keyin eski signallar eskiradi.
  loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_2_205_Operatsion', rssi: -50 }, t + 12_000);
  assert.equal(loc.resolve(t + 12_000)[0].roomId, 'ROOM_2_205_Operatsion');
});

test("noto'g'ri signallar rad etiladi", () => {
  const loc = new ReceiverLocator(clinic());
  assert.equal(loc.ingest({ nishon: 'yoq', xona: 'ROOM_2_204_Palata', rssi: -60 }, 0).ok, false);
  assert.equal(loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_X', rssi: -60 }, 0).ok, false);
  assert.equal(loc.ingest({ nishon: 'dilnoza-karimova', xona: 'ROOM_2_204_Palata', rssi: 'kuchli' }, 0).ok, false);
});

test("haqiqiy rejimda signal -> joylashuv -> holat", () => {
  let now = Date.UTC(2026, 8, 30, 5, 0);
  const e = new ClinicEngine(clinic(), { rejim: 'haqiqiy' }, { now: () => now });
  assert.equal(e.ingestSignal({ nishon: 'aziz-rahimov', xona: 'ROOM_2_205_Operatsion', rssi: -55, harakat: false }).ok, true);
  e.tick();
  const st = e.snapshot().staff.find((s) => s.id === 'aziz-rahimov');
  assert.equal(st.room, 'ROOM_2_205_Operatsion');
  assert.equal(st.status, 'turibdi');
  now += 2 * 60_000;
  e.tick();
  assert.equal(e.snapshot().staff.find((s) => s.id === 'aziz-rahimov').status, 'signal_yoq');
});
