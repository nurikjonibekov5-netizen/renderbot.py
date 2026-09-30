// Brauzer testi: serverni ishga tushiradi, haqiqiy brauzerda (Chromium) ekranni ochib,
// kirish, qidiruv, kartochka, filtr, qavatlar, "Bugun" jadvali va Excel yuklashni tekshiradi.
// Ishga tushirish: npm run build && npm run test:e2e
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createApp } from '../../server/index.js';
import { floorGlb } from '../../scripts/namuna-glb.js';
import { writeFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHOTS = join(ROOT, 'tests', 'e2e', 'screenshots');
mkdirSync(SHOTS, { recursive: true });
const executablePath = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(['✓', name]);
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push(['✗', name, err]);
    console.log(`  ✗ ${name}\n    ${String(err.stack || err).split('\n').slice(0, 4).join('\n    ')}`);
  }
}

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { ctx, page, errors };
}

async function waitPeople(page, min = 3) {
  await page.waitForFunction((n) => [...document.querySelectorAll('.person-label')].filter((e) => e.style.display !== 'none').length >= n, min, { timeout: 15000 });
}

async function main() {
  if (!existsSync(join(ROOT, 'web', 'dist', 'index.html'))) throw new Error('Avval "npm run build" qiling');
  const app = createApp({
    root: ROOT,
    settings: { parol: 'test123', baza_fayli: ':memory:', namuna_malumotlar: true },
    log: () => {},
  });
  await new Promise((r) => app.server.listen(0, r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  console.log('\nKompyuter ekrani (server bilan):');
  const { page, errors } = await newPage(browser, { width: 1600, height: 950 });
  const view = () => page.evaluate(() => ({ ...window.__klinika.view }));
  const vis = () => page.evaluate(() => {
    const s = window.__klinika;
    return { ext: +s.exteriorVis.toFixed(2), floors: Object.fromEntries([...s.floors].map(([f, st]) => [f, +st.visTarget.toFixed(2)])) };
  });
  const settle = () => page.waitForFunction(() => {
    const s = window.__klinika;
    return !s.flight && Math.abs(s.exteriorVis - s.exteriorTarget) < 0.01 && [...s.floors.values()].every((st) => Math.abs(st.vis - st.visTarget) < 0.01);
  }, null, { timeout: 20000 });

  await step('Parolsiz kirish oynasi chiqadi, noto\'g\'ri parol rad etiladi', async () => {
    await page.goto(base);
    await page.waitForSelector('.login input');
    await page.fill('.login input', 'xato');
    await page.click('.login button');
    await page.waitForSelector('.login .error');
    await page.screenshot({ path: join(SHOTS, '01-kirish.png') });
  });

  await step('Boshlang\'ich ekran: binoning tashqi umumiy ko\'rinishi', async () => {
    await page.fill('.login input', 'test123');
    await page.click('.login button');
    await page.waitForSelector('.scene canvas');
    await page.waitForSelector('.scene-label.floor-chip');
    await settle();
    assert.equal((await view()).mode, 'overview');
    assert.equal(await page.textContent('.view-header h2'), 'Klinika binosi');
    const chips = await page.$$eval('.scene-label.floor-chip', (els) => els.map((e) => e.textContent));
    assert.equal(chips.length, 4);
    assert.ok(chips.every((c) => /\dF\d+ kishi/.test(c)), chips.join(','));
    const colors = await page.evaluate(() => {
      const c = document.querySelector('.scene canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const set = new Set();
      const px = new Uint8Array(4);
      for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) {
        gl.readPixels(Math.floor((c.width * i) / 20), Math.floor((c.height * j) / 20), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        set.add(px.slice(0, 3).join(','));
      }
      return set.size;
    });
    assert.ok(colors > 10, `3D rasm chizilmagan (${colors} xil rang)`);
    await page.screenshot({ path: join(SHOTS, '02-bino-tashqi.png') });
  });

  await step('Binoni (3-qavat qismini) bosganda o\'sha qavat ichiga kiriladi', async () => {
    const pt = await page.evaluate(() => {
      const s = window.__klinika;
      const band = s.exterior.bands.get(3);
      const mesh = band.children[0];
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      // Old fasad yuzasining o'rtasi (kameraga qaragan tomon).
      const p = mesh.localToWorld(mesh.position.clone().set((bb.min.x + bb.max.x) / 2 + (bb.max.x - bb.min.x) * 0.15, 0, bb.max.z));
      p.project(s.camera);
      const r = s.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
    });
    await page.mouse.move(pt.x, pt.y);
    await page.waitForTimeout(300);
    assert.match(await page.textContent('.hint'), /3-qavatga kirish uchun bosing/);
    await page.mouse.click(pt.x, pt.y);
    await settle();
    assert.deepEqual(await view(), { mode: 'floor', floor: 3 });
    assert.equal(await page.textContent('.view-header h2'), '3-qavat');
    const v = await vis();
    assert.equal(v.ext, 0);
    assert.deepEqual(v.floors, { 1: 0, 2: 0, 3: 1, 4: 0 });
    await page.screenshot({ path: join(SHOTS, '03-qavat-3.png') });
  });

  await step('O\'ngdagi tanlagich: 1F bosilsa faqat 1-qavat ko\'rinadi', async () => {
    await page.click('.fs-btn[aria-label="1-qavat"]');
    await settle();
    assert.deepEqual(await view(), { mode: 'floor', floor: 1 });
    assert.ok(await page.$('.fs-btn[aria-label="1-qavat"].on'));
    assert.deepEqual((await vis()).floors, { 1: 1, 2: 0, 3: 0, 4: 0 });
    const rooms = await page.$$eval('.scene-label.room', (els) => els.filter((e) => e.style.display !== 'none').map((e) => e.textContent));
    assert.ok(rooms.includes('Qabulxona'), rooms.join(','));
    assert.ok(!rooms.includes('Operatsion xona'), 'boshqa qavat xonasi ko\'rinmasligi kerak');
    await page.screenshot({ path: join(SHOTS, '04-qavat-1.png') });
  });

  await step('"Barchasi" va "Bino" tugmalari ishlaydi', async () => {
    await page.click('.fs-btn[aria-label="Barchasi"]');
    await settle();
    assert.equal((await view()).mode, 'all');
    assert.deepEqual((await vis()).floors, { 1: 1, 2: 1, 3: 1, 4: 1 });
    await page.screenshot({ path: join(SHOTS, '05-barchasi.png') });
    await page.click('.fs-btn[aria-label="Bino"]');
    await settle();
    assert.equal((await view()).mode, 'overview');
    assert.equal((await vis()).ext, 1);
  });

  await step('Qidiruv: "Dilnoza qayerda?" -> panel ochiladi, kamera uning qavatiga tushadi', async () => {
    await page.fill('.searchbar input', 'Dilnoza qayerda?');
    await page.waitForSelector('.suggest li');
    await page.press('.searchbar input', 'Enter');
    await page.waitForSelector('.emp-card h2');
    assert.equal(await page.textContent('.emp-card h2'), 'Dilnoza Karimova');
    await settle();
    const st = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()).then((s) => s.staff.find((x) => x.id === 'dilnoza-karimova')));
    assert.deepEqual(await view(), { mode: 'floor', floor: st.floor });
    const card = await page.textContent('.emp-card');
    for (const word of ['Joylashuv', 'Qavat', 'Xona', 'Smena', 'Bugungi faollik', 'Shu joyda']) assert.ok(card.includes(word), word);
    await page.waitForSelector('.emp-card .timeline, .emp-card p.muted');
    await page.screenshot({ path: join(SHOTS, '06-qidiruv-panel.png') });
  });

  await step('Odamchani bosganda panel o\'sha xodimga almashadi, yopish tugmasi ishlaydi', async () => {
    const other = page.locator('.person-tag:visible:not(.selected)').first();
    const short = (await other.locator('.nm').textContent()).split(' ')[0];
    await other.click();
    await page.waitForFunction((n) => document.querySelector('.emp-card h2')?.textContent.startsWith(n), short);
    assert.ok(await page.$('.person-tag.selected'));
    await page.click('.emp-card .hero-btn[aria-label="Yopish"]');
    await page.waitForSelector('.emp-card', { state: 'detached' });
  });

  await step('Odamchaning o\'zini (3D shaklini) bosish ham ishlaydi', async () => {
    const pt = await page.evaluate(() => {
      const s = window.__klinika;
      const p = [...s.people.values()].find((x) => x.ch.root.visible);
      const v = p.ch.root.position.clone();
      v.y += 0.9;
      v.project(s.camera);
      const r = s.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, name: p.staff.name };
    });
    await page.mouse.click(pt.x, pt.y);
    await page.waitForSelector('.emp-card h2');
    assert.equal(await page.textContent('.emp-card h2'), pt.name);
    await page.click('.emp-card .hero-btn[aria-label="Yopish"]');
  });

  await step('Lavozim filtri: faqat shifokorlar ko\'rinadi', async () => {
    await page.click('.fs-btn[aria-label="Barchasi"]');
    await settle();
    await page.click('.role-item:has-text("Shifokor")');
    await page.waitForFunction(() => [...window.__klinika.people.values()].filter((p) => p.ch.root.visible).every((p) => p.staff.role === 'Shifokor'), null, { timeout: 15000 });
    const shown = await page.evaluate(() => [...window.__klinika.people.values()].filter((p) => p.ch.root.visible).map((p) => p.staff.role));
    assert.ok(shown.length >= 1 && shown.every((r) => r === 'Shifokor'), shown.join(','));
    await page.screenshot({ path: join(SHOTS, '07-filtr.png') });
    await page.click('.side-title .link');
    await page.waitForFunction(() => document.querySelectorAll('.role-item.on').length === 0);
  });

  await step('Maxfiy zona: aniq xona nomi hech qayerda yo\'q', async () => {
    const snap = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()));
    assert.ok(!JSON.stringify(snap).includes('Hojatxona'));
    assert.ok(!JSON.stringify(snap).includes('Kiyinish'));
  });

  await step('"Xodimlar" bo\'limi: jadval faollik bo\'yicha saralangan', async () => {
    await page.click('.nav-item:has-text("Xodimlar")');
    await page.waitForSelector('.today tbody tr');
    const vals = await page.$$eval('.today tbody tr td:nth-child(4) b', (els) => els.map((e) => parseInt(e.textContent, 10)).filter((n) => !Number.isNaN(n)));
    assert.ok(vals.length >= 5, `qatorlar: ${vals.length}`);
    for (let i = 1; i < vals.length; i++) assert.ok(vals[i - 1] >= vals[i], vals.join(','));
    await page.screenshot({ path: join(SHOTS, '08-jadval.png') });
  });

  await step('"Faollik" bo\'limi: kunlik tasmalar chiziladi', async () => {
    await page.click('.nav-item:has-text("Faollik")');
    await page.waitForSelector('.tl-row .tl-seg');
    await page.screenshot({ path: join(SHOTS, '09-tasma.png') });
  });

  await step('Excel hisobot yuklanadi va ichida ma\'lumot bor', async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('.nav-item:has-text("Hisobot")')]);
    const file = join(SHOTS, download.suggestedFilename());
    await download.saveAs(file);
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const sheet = wb.getWorksheet('Bugun');
    assert.equal(sheet.getRow(1).getCell(1).value, 'Xodim');
    assert.equal(sheet.rowCount, app.clinic.staff.length + 1);
    assert.ok(wb.getWorksheet('Kunlik tasma').rowCount > 20);
    assert.ok(!JSON.stringify(wb.getWorksheet('Kunlik tasma').getSheetValues()).includes('Hojatxona'));
    await page.click('.today-head .icon-btn');
  });

  await step('Simulyatsiya tezligini o\'zgartirish ishlaydi', async () => {
    const t1 = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()).then((s) => s.t));
    await page.selectOption('.speed', '60');
    await page.waitForTimeout(2200);
    const t2 = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()).then((s) => s.t));
    assert.ok(t2 - t1 > 60_000, `vaqt ${Math.round((t2 - t1) / 1000)} s o'tdi`);
    await page.selectOption('.speed', '1');
  });

  await step('Brauzer konsolida xato yo\'q', async () => {
    assert.deepEqual(errors.filter((e) => !/401|Unauthorized/.test(e)), []);
  });

  await page.context().close();
  console.log('\nNamuna versiya (serversiz, telefon uchun ham):');
  const demoDir = join(ROOT, 'dist-demo');
  let demoServer;
  if (existsSync(join(demoDir, 'index.html'))) {
    demoServer = createServer((req, res) => {
      const p = new URL(req.url, 'http://x').pathname;
      const file = join(demoDir, p === '/' ? 'index.html' : p);
      if (!file.startsWith(demoDir) || !existsSync(file)) { res.writeHead(404); return res.end(); }
      const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
    });
    await new Promise((r) => demoServer.listen(0, r));
    const demoBase = `http://127.0.0.1:${demoServer.address().port}`;
    const m = await newPage(browser, { width: 1366, height: 768 });
    await step('Namuna parolsiz ochiladi (noutbuk ekrani)', async () => {
      await m.page.goto(demoBase);
      await m.page.waitForSelector('.scene-label.floor-chip');
      await m.page.waitForTimeout(1500);
      const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, 'gorizontal siljish bor');
      await m.page.screenshot({ path: join(SHOTS, '10-namuna-noutbuk.png') });
    });
    await step('Namunada qidiruv va panel', async () => {
      await m.page.fill('.searchbar input', 'aziz');
      await m.page.press('.searchbar input', 'Enter');
      await m.page.waitForSelector('.emp-card h2');
      await m.page.waitForTimeout(2500);
      await m.page.screenshot({ path: join(SHOTS, '11-namuna-panel.png') });
    });
    await m.ctx.close();
    const t = await newPage(browser, { width: 390, height: 844 });
    await step('Telefonda ham ochiladi (asosiy maqsad kompyuter)', async () => {
      await t.page.goto(demoBase);
      await t.page.waitForSelector('.scene-label.floor-chip');
      await t.page.waitForTimeout(1200);
      const overflow = await t.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, 'gorizontal siljish bor');
      await t.page.screenshot({ path: join(SHOTS, '12-telefon.png') });
    });
    await step('Namuna konsolida xato yo\'q', async () => assert.deepEqual([...m.errors, ...t.errors], []));
    await t.ctx.close();
  } else {
    console.log('  (dist-demo yo\'q, "npm run build:demo" qiling)');
  }

  console.log('\n3ds Max modeli (GLB) bilan:');
  const modelsDir = join(SHOTS, 'models');
  mkdirSync(modelsDir, { recursive: true });
  // 2-qavat santimetrda (3ds Max odatiy birligi), bitta xona ataylab tushirib qoldirilgan.
  writeFileSync(join(modelsDir, 'qavat_2.glb'), floorGlb(app.clinic, 2, { unit: 100, skip: ['ROOM_2_203_Post'], shiftX: 3 }));
  const app2 = createApp({
    root: ROOT,
    settings: { parol: 'test123', baza_fayli: ':memory:', modellar_papkasi: modelsDir },
    log: () => {},
  });
  await new Promise((r) => app2.server.listen(0, r));
  const base2 = `http://127.0.0.1:${app2.server.address().port}`;
  const g = await newPage(browser, { width: 1440, height: 900 });
  await step('GLB model yuklanadi, o\'lchov birligi aniqlanadi, xonalar topiladi', async () => {
    await g.page.goto(base2);
    await g.page.fill('.login input', 'test123');
    await g.page.click('.login button');
    await g.page.waitForFunction(() => /2-qavat 3ds Max faylidan/.test(document.querySelector('.side-foot')?.textContent || ''), null, { timeout: 40000 });
    await g.page.click('.fs-btn[aria-label="2-qavat"]');
    await g.page.waitForTimeout(2500);
    const rooms = await g.page.$$eval('.scene-label.room', (els) => els.filter((e) => e.style.display !== 'none').map((e) => e.textContent));
    assert.ok(rooms.includes('Operatsion xona'), rooms.join(','));
    const info = await g.page.evaluate(() => {
      const fl = window.__klinika.layout[2];
      return { w: fl.rooms.ROOM_2_205_Operatsion.w, stairs: fl.stairs };
    });
    assert.ok(info.w > 4 && info.w < 7, `xona kengligi ${info.w} m (santimetrdan metrga o'tmagan)`);
    await g.page.screenshot({ path: join(SHOTS, '20-glb-model.png') });
  });
  await step('Modelda yo\'q xona haqida ogohlantirish chiqadi', async () => {
    await g.page.click('.warnings summary');
    const text = await g.page.textContent('.warnings');
    assert.ok(text.includes('ROOM_2_203_Post'), text);
  });
  await step('GLB bilan konsolda xato yo\'q', async () => assert.deepEqual(g.errors.filter((e) => !/401|Unauthorized/.test(e)), []));
  await app2.close();

  await browser.close();
  await app.close();
  demoServer?.close();
  const failed = results.filter((r) => r[0] === '✗');
  console.log(`\nNatija: ${results.length - failed.length} ta o'tdi, ${failed.length} ta xato. Rasmlar: tests/e2e/screenshots/\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
