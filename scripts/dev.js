// Dasturchilar uchun: server va ekranni birga ishga tushiradi (o'zgarishlar darhol ko'rinadi).
import { spawn } from 'node:child_process';

const run = (cmd, args) => spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
const server = run('node', ['--disable-warning=ExperimentalWarning', '--watch-path=server', '--watch-path=shared', 'server/index.js']);
const web = run('npx', ['vite']);
const stop = () => {
  server.kill();
  web.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
