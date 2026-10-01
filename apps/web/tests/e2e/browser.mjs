// Shared helpers: local preview server + preinstalled Chromium with software WebGL (no browser download).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

export const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const PORT = Number(process.env.E2E_PORT || 4180);
export const BASE = `http://127.0.0.1:${PORT}/`;

export async function startServer() {
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return proc;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  proc.kill();
  throw new Error('preview server did not start');
}

export function launch() {
  return chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
}
