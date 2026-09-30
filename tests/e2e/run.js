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
  const { page, errors } = await newPage(browser, { width: 1440, height: 900 });

  await step('Parolsiz kirish oynasi chiqadi, noto\'g\'ri parol rad etiladi', async () => {
    await page.goto(base);
    await page.waitForSelector('.login input');
    await page.fill('.login input', 'xato');
    await page.click('.login button');
    await page.waitForSelector('.login .error');
    await page.screenshot({ path: join(SHOTS, '01-kirish.png') });
  });

  await step('To\'g\'ri parol bilan 3D bino va odamchalar chiqadi', async () => {
    await page.fill('.login input', 'test123');
    await page.click('.login button');
    await page.waitForSelector('.scene canvas');
    await waitPeople(page, 3);
    await page.waitForTimeout(1500);
    const floors = await page.$$eval('.room-label.floor-title', (els) => els.map((e) => e.textContent));
    assert.deepEqual(floors.sort(), ['1-qavat', '2-qavat', '3-qavat', '4-qavat']);
    await page.screenshot({ path: join(SHOTS, '02-bino.png') });
    const pixels = await page.evaluate(() => {
      const c = document.querySelector('.scene canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      const colors = new Set();
      const px = new Uint8Array(4);
      for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) {
        gl.readPixels(Math.floor((c.width * i) / 20), Math.floor((c.height * j) / 20), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        colors.add(px.slice(0, 3).join(','));
      }
      return colors.size;
    });
    assert.ok(pixels > 5, `3D rasm chizilmagan (${pixels} xil rang)`);
  });

  await step('Qidiruv: "Dilnoza qayerda?" -> kartochka ochiladi', async () => {
    await page.fill('.search input', 'Dilnoza qayerda?');
    await page.waitForSelector('.suggest li');
    await page.press('.search input', 'Enter');
    await page.waitForSelector('.card h2');
    assert.equal(await page.textContent('.card h2'), 'Dilnoza Karimova');
    const facts = await page.textContent('.card .facts');
    assert.ok(/Joylashuv/.test(facts));
    await page.waitForSelector('.card .timeline, .card p.muted');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SHOTS, '03-qidiruv-kartochka.png') });
  });

  await step('Odamchani bosganda uning kartochkasi ochiladi', async () => {
    await page.click('.card .icon-btn');
    await page.waitForSelector('.card', { state: 'detached' });
    const label = page.locator('.person-label:visible').first();
    const name = await label.locator('.nm').textContent();
    await label.click();
    await page.waitForSelector('.card h2');
    const full = await page.textContent('.card h2');
    assert.ok(full.startsWith(name.replace(/ .\.$/, '').split(' ')[0]), `${name} / ${full}`);
    await page.click('.card .icon-btn');
  });

  await step('Lavozim filtri: faqat laborantlar ko\'rinadi', async () => {
    await page.click('.chip:has-text("Laborant")');
    await page.waitForTimeout(300);
    const visible = await page.$$eval('.person-label', (els) => els.filter((e) => e.style.display !== 'none').map((e) => e.style.getPropertyValue('--role')));
    assert.ok(visible.length <= 2, `ko'rinayotganlar: ${visible.length}`);
    assert.ok(visible.every((c) => c.trim() === '#8a63d2'));
    await page.screenshot({ path: join(SHOTS, '04-filtr.png') });
    await page.click('.side-head .link');
  });

  await step('Qavat tanlash: faqat 2-qavat ko\'rinadi', async () => {
    await page.click('.floor-switch button:has-text("2")');
    await page.waitForTimeout(1200);
    const titles = await page.$$eval('.room-label.floor-title', (els) => els.filter((e) => e.style.display !== 'none').map((e) => e.textContent));
    assert.deepEqual(titles, ['2-qavat']);
    const rooms = await page.$$eval('.room-label:not(.floor-title)', (els) => els.filter((e) => e.style.display !== 'none' && !e.classList.contains('compact')).map((e) => e.textContent));
    assert.ok(rooms.includes('Operatsion xona'), rooms.join(','));
    await page.screenshot({ path: join(SHOTS, '05-qavat-2.png') });
    await page.click('.floor-switch button:has-text("Hammasi")');
  });

  await step('Maxfiy zona: aniq xona nomi hech qayerda yo\'q', async () => {
    const snap = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()));
    assert.ok(!JSON.stringify(snap).includes('Hojatxona'));
    assert.ok(!JSON.stringify(snap).includes('Kiyinish'));
  });

  await step('"Bugun" jadvali faollik bo\'yicha saralangan', async () => {
    await page.click('.top-actions button:has-text("Bugun")');
    await page.waitForSelector('.today tbody tr');
    const vals = await page.$$eval('.today tbody tr td:nth-child(4) b', (els) => els.map((e) => parseInt(e.textContent, 10)).filter((n) => !Number.isNaN(n)));
    assert.ok(vals.length >= 5, `qatorlar: ${vals.length}`);
    for (let i = 1; i < vals.length; i++) assert.ok(vals[i - 1] >= vals[i], vals.join(','));
    await page.screenshot({ path: join(SHOTS, '06-bugun.png') });
  });

  await step('Kunlik tasma barcha xodimlar uchun chiziladi', async () => {
    await page.click('.tabs button:has-text("Kunlik tasma")');
    await page.waitForSelector('.tl-row .tl-seg');
    await page.screenshot({ path: join(SHOTS, '07-tasma.png') });
  });

  await step('Excel hisobot yuklanadi va ichida ma\'lumot bor', async () => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('.today-head button:has-text("Excel")')]);
    const file = join(SHOTS, download.suggestedFilename());
    await download.saveAs(file);
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const sheet = wb.getWorksheet('Bugun');
    assert.equal(sheet.getRow(1).getCell(1).value, 'Xodim');
    assert.equal(sheet.rowCount, app.clinic.staff.length + 1);
    assert.ok(wb.getWorksheet('Kunlik tasma').rowCount > 20);
    const all = JSON.stringify(wb.getWorksheet('Kunlik tasma').getSheetValues());
    assert.ok(!all.includes('Hojatxona'));
  });

  await step('Simulyatsiya tezligini o\'zgartirish ishlaydi', async () => {
    const t1 = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()).then((s) => s.t));
    await page.selectOption('.top-actions select', '60');
    await page.waitForTimeout(2200);
    const t2 = await page.evaluate(() => fetch('/api/snapshot').then((r) => r.json()).then((s) => s.t));
    assert.ok(t2 - t1 > 60_000, `vaqt ${Math.round((t2 - t1) / 1000)} s o'tdi`);
    await page.selectOption('.top-actions select', '1');
  });

  await step('Brauzer konsolida xato yo\'q', async () => {
    assert.deepEqual(errors.filter((e) => !/401|Unauthorized/.test(e)), []);
  });

  console.log('\nTelefon ekrani (namuna versiya, serversiz):');
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
    const m = await newPage(browser, { width: 390, height: 844 });
    await step('Telefonda namuna parolsiz ochiladi, odamchalar yuradi', async () => {
      await m.page.goto(demoBase);
      await waitPeople(m.page, 3);
      await m.page.waitForTimeout(1500);
      const overflow = await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, 'gorizontal siljish bor');
      await m.page.screenshot({ path: join(SHOTS, '10-telefon-bino.png') });
    });
    await step('Telefonda qidiruv va kartochka', async () => {
      await m.page.fill('.search input', 'aziz');
      await m.page.press('.search input', 'Enter');
      await m.page.waitForSelector('.card h2');
      await m.page.waitForTimeout(1200);
      await m.page.screenshot({ path: join(SHOTS, '11-telefon-kartochka.png') });
      await m.page.click('.card .icon-btn');
    });
    await step('Telefonda filtr menyusi va "Bugun" jadvali', async () => {
      await m.page.click('.topbar .only-mobile');
      await m.page.waitForTimeout(400);
      await m.page.screenshot({ path: join(SHOTS, '12-telefon-menyu.png') });
      await m.page.click('.sidebar .only-mobile');
      await m.page.click('.top-actions button:has-text("Bugun")');
      await m.page.waitForSelector('.today tbody tr');
      await m.page.screenshot({ path: join(SHOTS, '13-telefon-bugun.png') });
    });
    await step('Telefon konsolida xato yo\'q', async () => assert.deepEqual(m.errors, []));
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
    await g.page.waitForFunction(() => /2-qavat 3ds Max faylidan/.test(document.querySelector('.model-note')?.textContent || ''), null, { timeout: 15000 });
    await g.page.click('.floor-switch button:has-text("2")');
    await g.page.waitForTimeout(1500);
    const rooms = await g.page.$$eval('.room-label', (els) => els.filter((e) => e.style.display !== 'none').map((e) => e.textContent));
    assert.ok(rooms.includes('Operatsion xona'), rooms.join(','));
    const info = await g.page.evaluate(() => {
      const fl = window.__klinika.layout.floors[2];
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
