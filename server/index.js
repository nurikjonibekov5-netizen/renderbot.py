// Server: ekranga real vaqtda ma'lumot beradi, tarixni bazaga yozadi,
// kelajakda xonalardagi qabul qiluvchilardan signal qabul qiladi.
import { createServer } from 'node:http';
import { existsSync, statSync, readdirSync, createReadStream, mkdirSync } from 'node:fs';
import { join, extname, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { loadClinicFromDisk } from '../shared/load-node.js';
import { clinicToJson } from '../shared/clinic.js';
import { ClinicEngine, SPEEDS } from '../shared/engine.js';
import { autoLayout } from '../shared/layout.js';
import { dayStart, dayKey, DAY, HOUR } from '../shared/time.js';
import { loadSettings, resolvePassword } from './settings.js';
import { HistoryDb } from './db.js';
import { Auth, safeEqual } from './auth.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const MODEL_RE = /^qavat_(\d+)\.glb$/i;

// models/ papkasidagi qavat_1.glb, qavat_2.glb ... fayllarini topadi.
export function listModels(dir) {
  if (!existsSync(dir)) return {};
  const out = {};
  for (const f of readdirSync(dir)) {
    const m = MODEL_RE.exec(f);
    if (m) out[Number(m[1])] = `/models/${encodeURIComponent(f)}?v=${Math.round(statSync(join(dir, f)).mtimeMs)}`;
  }
  return out;
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'content-type': isJson ? MIME['.json'] : 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Juda katta so\'rov'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve({});
      try { resolve(JSON.parse(text)); } catch { reject(new Error('JSON noto\'g\'ri')); }
    });
    req.on('error', reject);
  });
}

function serveFile(res, baseDir, relPath, { immutable = false } = {}) {
  const full = normalize(join(baseDir, relPath));
  if (!full.startsWith(normalize(baseDir) + sep) && full !== normalize(baseDir)) return false;
  if (!existsSync(full) || !statSync(full).isFile()) return false;
  res.writeHead(200, {
    'content-type': MIME[extname(full).toLowerCase()] || 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(full).pipe(res);
  return true;
}

export function createApp({
  root = ROOT,
  settings = loadSettings(root),
  now = () => Date.now(),
  log = console.log,
  tickMs = 1000,
} = {}) {
  const dataDir = join(root, 'data');
  const modelsDir = join(root, 'models');
  const webDir = join(root, 'web', 'dist');
  mkdirSync(dataDir, { recursive: true });

  const clinic = loadClinicFromDisk(dataDir, { demo: settings.namuna_malumotlar !== false });
  const engine = new ClinicEngine(clinic, settings, { now });
  const db = new HistoryDb(settings.baza_fayli || join(dataDir, 'tarix.db'));
  const { password, generated, file: passwordFile } = resolvePassword(settings, dataDir);
  const auth = new Auth(password);
  const deviceKey = settings.qabul_qiluvchi_kaliti ? String(settings.qabul_qiluvchi_kaliti) : '';
  const keepDays = Number(settings.tarix_saqlash_kunlari) || 90;
  const layout = autoLayout(clinic);

  if (engine.mode === 'haqiqiy') engine.replay(db.allLocationsSince(dayStart(now())));
  engine.onChange((state, t) => db.recordLocation(state, t));
  db.cleanup(now(), keepDays);

  const config = () => ({
    ...clinicToJson(clinic),
    layout,
    models: listModels(modelsDir),
    mode: engine.mode,
    speeds: engine.mode === 'simulyatsiya' ? SPEEDS : [],
    modelScale: Number(settings.model_masshtabi) || 0,
  });

  const clients = new Set();
  const broadcast = (msg) => {
    const text = JSON.stringify(msg);
    for (const ws of clients) if (ws.readyState === 1) ws.send(text);
  };

  let ticks = 0;
  let lastCleanup = now();
  const timer = setInterval(() => {
    try {
      engine.tick();
      ticks += 1;
      broadcast({ type: 'snapshot', data: engine.snapshot() });
      if (ticks % 5 === 0) broadcast({ type: 'today', data: engine.today() });
      if (ticks % 300 === 0) db.saveDaily(dayKey(engine.now()), engine.today().rows);
      if (now() - lastCleanup > 6 * HOUR) {
        lastCleanup = now();
        db.cleanup(now(), keepDays);
      }
    } catch (err) {
      log(`Xato (tick): ${err.stack || err}`);
    }
  }, tickMs);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = decodeURIComponent(url.pathname);
      const secure = req.headers['x-forwarded-proto'] === 'https';

      if (path.startsWith('/api/')) {
        // Qabul qiluvchi qurilmalar parol bilan emas, maxsus kalit bilan ulanadi.
        if (path === '/api/signal' && req.method === 'POST') {
          const key = req.headers['x-kalit'] || url.searchParams.get('kalit') || '';
          if (!deviceKey || !safeEqual(key, deviceKey)) return send(res, 403, { xato: 'Kalit noto\'g\'ri yoki sozlanmagan' });
          const body = await readBody(req);
          const list = Array.isArray(body) ? body : [body];
          const results = list.map((s) => engine.ingestSignal(s));
          return send(res, 200, { natija: results });
        }
        if (path === '/api/login' && req.method === 'POST') {
          const body = await readBody(req);
          const token = auth.login(body.parol);
          if (!token) {
            await new Promise((r) => setTimeout(r, 800));
            return send(res, 401, { xato: 'Parol noto\'g\'ri' });
          }
          return send(res, 200, { ok: true }, { 'set-cookie': auth.cookie(token, secure) });
        }
        if (path === '/api/logout' && req.method === 'POST') {
          auth.logout(req);
          return send(res, 200, { ok: true }, { 'set-cookie': auth.clearCookie() });
        }
        if (!auth.check(req)) return send(res, 401, { xato: 'Kirish kerak' });

        if (path === '/api/config') return send(res, 200, config());
        if (path === '/api/snapshot') return send(res, 200, engine.snapshot());
        if (path === '/api/bugun') return send(res, 200, engine.today());
        if (path.startsWith('/api/tasma/')) {
          const id = path.slice('/api/tasma/'.length);
          if (!clinic.staff.some((s) => s.id === id)) return send(res, 404, { xato: 'Xodim topilmadi' });
          return send(res, 200, { id, t: engine.now(), segments: engine.timeline(id) });
        }
        if (path === '/api/tezlik' && req.method === 'POST') {
          const body = await readBody(req);
          if (!engine.setSpeed(body.tezlik)) return send(res, 400, { xato: 'Bu tezlik mumkin emas' });
          broadcast({ type: 'snapshot', data: engine.snapshot() });
          return send(res, 200, { ok: true, tezlik: engine.speed });
        }
        if (path === '/api/kunlik') {
          const to = url.searchParams.get('gacha') || dayKey(engine.now());
          const from = url.searchParams.get('dan') || dayKey(engine.now() - 30 * DAY);
          return send(res, 200, { rows: db.dailyHistory(from, to) });
        }
        return send(res, 404, { xato: 'Topilmadi' });
      }

      if (path.startsWith('/models/')) {
        if (!auth.check(req)) return send(res, 401, 'Kirish kerak');
        if (serveFile(res, modelsDir, path.slice('/models/'.length))) return;
        return send(res, 404, 'Model topilmadi');
      }

      if (path.startsWith('/assets/') && serveFile(res, webDir, path.slice(1), { immutable: true })) return;
      if (path !== '/' && serveFile(res, webDir, path.slice(1))) return;
      if (serveFile(res, webDir, 'index.html')) return;
      return send(res, 503, 'Ekran qismi hali yig\'ilmagan. Avval "npm run build" buyrug\'ini ishga tushiring.');
    } catch (err) {
      log(`Xato (so'rov): ${err.stack || err}`);
      if (!res.headersSent) send(res, 400, { xato: String(err.message || err) });
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/ws' || !auth.check(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      clients.add(ws);
      ws.on('close', () => clients.delete(ws));
      ws.on('error', () => clients.delete(ws));
      ws.send(JSON.stringify({ type: 'snapshot', data: engine.snapshot() }));
      ws.send(JSON.stringify({ type: 'today', data: engine.today() }));
    });
  });

  return {
    server,
    engine,
    clinic,
    db,
    password,
    generated,
    passwordFile,
    close() {
      clearInterval(timer);
      for (const ws of clients) ws.terminate();
      wss.close();
      try { db.saveDaily(dayKey(engine.now()), engine.today().rows); } catch { /* baza yopilgan */ }
      db.close();
      return new Promise((r) => server.close(() => r()));
    },
  };
}

function main() {
  const settings = loadSettings(ROOT);
  const app = createApp({ settings });
  const port = Number(settings.port) || 8080;
  app.server.listen(port, () => {
    const lines = [
      '',
      '  Klinika 3D nazorati ishga tushdi',
      `  Brauzerda oching:  http://localhost:${port}`,
      `  Rejim:             ${app.engine.mode}${app.engine.demoDay ? ' (namuna kun, 10:30 dan)' : ''}`,
      `  Xodimlar:          ${app.clinic.staff.length}, xonalar: ${app.clinic.rooms.length}`,
      app.generated
        ? `  Parol (yangi):     ${app.password}   (data/parol.txt faylida saqlandi)`
        : `  Parol:             ${app.passwordFile ? 'data/parol.txt faylida' : 'sozlamalar.json faylida'}`,
    ];
    if (app.clinic.warnings.length) {
      lines.push('', '  Ro\'yxatlarda ogohlantirishlar:');
      for (const w of app.clinic.warnings) lines.push(`   - ${w}`);
    }
    console.log(lines.join('\n') + '\n');
  });
  const stop = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) main();
