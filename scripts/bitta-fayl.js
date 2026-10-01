// Namunaviy versiyani bitta HTML faylga yig'adi: internet va server kerak emas,
// faylni ikki marta bosib brauzerda (Chrome, Edge) ochish kifoya.
// Foydalanish: npm run build:fayl  ->  Klinika_3D_namuna.html
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = 'dist-demo/assets/';
const files = readdirSync(dir);
const js = files.find((f) => /^index-.*\.js$/.test(f));
const css = files.find((f) => f.endsWith('.css'));
const code = readFileSync(dir + js, 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(dir + css, 'utf8');
const html = `<!doctype html><html lang="uz"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Klinika 3D nazorati</title><style>${style}</style></head><body><div id="root"></div><script type="module">${code}</script></body></html>`;
writeFileSync('Klinika_3D_namuna.html', html);
console.log(`Yozildi: Klinika_3D_namuna.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
