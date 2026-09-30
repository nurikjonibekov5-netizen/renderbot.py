// Sozlamalar: sozlamalar.json, uning ustidan sozlamalar.local.json va muhit o'zgaruvchilari.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export function loadSettings(root, env = process.env) {
  const read = (f) => (existsSync(join(root, f)) ? JSON.parse(readFileSync(join(root, f), 'utf8')) : {});
  const s = { ...read('sozlamalar.json'), ...read('sozlamalar.local.json') };
  if (env.PORT) s.port = Number(env.PORT);
  if (env.KLINIKA_PAROL) s.parol = env.KLINIKA_PAROL;
  if (env.KLINIKA_REJIM) s.rejim = env.KLINIKA_REJIM;
  return s;
}

// Parol berilmagan bo'lsa, birinchi ishga tushishda tasodifiy parol yaratib, data/parol.txt ga yozadi.
export function resolvePassword(settings, dataDir) {
  if (settings.parol) return { password: String(settings.parol), generated: false };
  const file = join(dataDir, 'parol.txt');
  if (existsSync(file)) {
    const saved = readFileSync(file, 'utf8').trim();
    if (saved) return { password: saved, generated: false, file };
  }
  const password = randomBytes(6).toString('base64url');
  writeFileSync(file, `${password}\n`, { mode: 0o600 });
  return { password, generated: true, file };
}
