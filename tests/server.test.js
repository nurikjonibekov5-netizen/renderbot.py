import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createApp } from '../server/index.js';
import { ROOT } from './helpers.js';

let app;
let base;
let cookie;

before(async () => {
  app = createApp({
    root: ROOT,
    settings: { parol: 'sinov-parol', baza_fayli: ':memory:', qabul_qiluvchi_kaliti: 'k1', namuna_malumotlar: true },
    log: () => {},
    tickMs: 50,
  });
  await new Promise((r) => app.server.listen(0, r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});

after(() => app.close());

test("parolsiz hech narsa ko'rinmaydi", async () => {
  assert.equal((await fetch(`${base}/api/config`)).status, 401);
  assert.equal((await fetch(`${base}/api/snapshot`)).status, 401);
  assert.equal((await fetch(`${base}/models/qavat_1.glb`)).status, 401);
  const bad = await fetch(`${base}/api/login`, { method: 'POST', body: JSON.stringify({ parol: 'xato' }) });
  assert.equal(bad.status, 401);
});

test("parol bilan kirish va ma'lumot olish", async () => {
  const res = await fetch(`${base}/api/login`, { method: 'POST', body: JSON.stringify({ parol: 'sinov-parol' }) });
  assert.equal(res.status, 200);
  cookie = res.headers.get('set-cookie').split(';')[0];
  const cfg = await (await fetch(`${base}/api/config`, { headers: { cookie } })).json();
  assert.equal(cfg.staff.length, app.clinic.staff.length);
  assert.ok(cfg.layout.floors[1]);
  assert.equal(cfg.mode, 'simulyatsiya');
  assert.equal(cfg.staff[0].badge, undefined);
  const snap = await (await fetch(`${base}/api/snapshot`, { headers: { cookie } })).json();
  assert.equal(snap.staff.length, cfg.staff.length);
  const tl = await (await fetch(`${base}/api/tasma/dilnoza-karimova`, { headers: { cookie } })).json();
  assert.ok(Array.isArray(tl.segments));
  assert.equal((await fetch(`${base}/api/tasma/yoq`, { headers: { cookie } })).status, 404);
});

test("real vaqt kanali (WebSocket) snapshot yuboradi", async () => {
  const ws = new WebSocket(`${base.replace('http', 'ws')}/ws`, { headers: { cookie } });
  const types = new Set();
  await new Promise((resolve, reject) => {
    ws.on('message', (m) => {
      types.add(JSON.parse(m).type);
      if (types.has('snapshot') && types.has('today')) resolve();
    });
    ws.on('error', reject);
  });
  ws.close();
  const noAuth = new WebSocket(`${base.replace('http', 'ws')}/ws`);
  await new Promise((resolve) => noAuth.on('error', resolve));
});

test("tezlikni o'zgartirish", async () => {
  const ok = await fetch(`${base}/api/tezlik`, { method: 'POST', headers: { cookie }, body: JSON.stringify({ tezlik: 60 }) });
  assert.equal(ok.status, 200);
  const bad = await fetch(`${base}/api/tezlik`, { method: 'POST', headers: { cookie }, body: JSON.stringify({ tezlik: 3 }) });
  assert.equal(bad.status, 400);
});

test("qabul qiluvchi kalitsiz signal yubora olmaydi", async () => {
  const r = await fetch(`${base}/api/signal`, { method: 'POST', body: '{}' });
  assert.equal(r.status, 403);
  const r2 = await fetch(`${base}/api/signal`, { method: 'POST', headers: { 'x-kalit': 'k1' }, body: JSON.stringify({ nishon: 'x' }) });
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).natija[0].ok, false);
});

test("fayl yo'lidan tashqariga chiqib bo'lmaydi", async () => {
  const r = await fetch(`${base}/models/..%2F..%2Fsozlamalar.json`, { headers: { cookie } });
  assert.equal(r.status, 404);
});

test("joylashuv o'zgarishlari bazaga yoziladi, maxfiy xona nomisiz", async () => {
  await new Promise((r) => setTimeout(r, 400));
  const rows = app.db.allLocationsSince(0);
  assert.ok(rows.length > 0);
  const priv = app.clinic.rooms.filter((r) => r.type === 'maxfiy').map((r) => r.id);
  for (const row of rows) assert.ok(!priv.includes(row.xona));
});
