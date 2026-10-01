// Namunaviy versiyani bitta HTML faylga yig'adi: internet va server kerak emas,
// faylni ikki marta bosib brauzerda (Chrome, Edge) ochish kifoya.
// Foydalanish: npm run build:fayl  ->  Klinika_3D_namuna.html
//
// Fayl ochilmay qolsa, bo'sh oq sahifa o'rniga sababi yoziladi:
//  - Claude ilovasi ichida (dastur ishlamaydigan oynada) "Chrome yoki Edge'da oching" yozuvi ko'rinadi;
//  - brauzer 3D (WebGL) ni qo'llamasa yoki xato chiqsa, xato matni ko'rsatiladi.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = 'dist-demo/assets/';
const files = readdirSync(dir);
const js = files.find((f) => /^index-.*\.js$/.test(f));
const css = files.find((f) => f.endsWith('.css'));
const code = readFileSync(dir + js, 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(dir + css, 'utf8');

// Yozuv sahifaning eng boshida turadi: katta kod yuklanmasa ham ko'rinadi.
const boot = `
<div id="boot-msg" style="font:16px/1.5 system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:12vh auto;padding:28px 30px;border-radius:18px;background:#fff;color:#15202b;box-shadow:0 10px 40px rgba(0,0,0,.12);border:1px solid #e7ebef">
  <div style="width:46px;height:46px;border-radius:13px;background:#0f8a86;color:#fff;font:700 28px/46px Arial;text-align:center;margin-bottom:14px">+</div>
  <h1 style="margin:0 0 8px;font-size:22px">Klinika 3D nazorati</h1>
  <p id="boot-text" style="margin:0 0 10px">Yuklanmoqda…</p>
  <p style="margin:0;color:#5f6b78;font-size:14px">Agar bu yozuv bir necha soniyadan keyin ham o'zgarmasa, faylni <b>Google Chrome</b> yoki <b>Microsoft Edge</b> brauzerida oching: faylni sichqonchaning o'ng tugmasi bilan bosing → <b>Открыть с помощью / Open with</b> → Chrome yoki Edge. Claude ilovasining ichida bu fayl ishlamaydi.</p>
  <pre id="boot-err" style="display:none;white-space:pre-wrap;background:#fff4f4;color:#b42318;border-radius:10px;padding:10px 12px;font-size:12px;margin:14px 0 0"></pre>
</div>`;

const guard = `
<script>
(function () {
  var shown = false;
  var m = document.getElementById('boot-msg');
  var t = document.getElementById('boot-text');
  var e = document.getElementById('boot-err');
  function fail(title, detail) {
    if (shown) return;
    shown = true;
    if (t) t.innerHTML = '<b style="color:#b42318">' + title + '</b>';
    if (e) { e.style.display = 'block'; e.textContent = (detail || '') + '\\n\\nBrauzer: ' + navigator.userAgent; }
    // Xabar ilova ichidan chiqarib olinadi va ilova yashiriladi (ilova uni o'chirib yubormasligi uchun).
    var root = document.getElementById('root');
    if (root) root.style.display = 'none';
    if (m) document.body.appendChild(m);
  }
  window.__bootFail = fail;
  window.addEventListener('error', function (ev) {
    if (document.querySelector('.app-layout')) return;
    fail('Sahifa ochilmadi: xato chiqdi.', ev.message || String(ev.error || ''));
  });
  window.addEventListener('unhandledrejection', function (ev) {
    if (document.querySelector('.app-layout')) return;
    fail('Sahifa ochilmadi: xato chiqdi.', String(ev.reason && (ev.reason.message || ev.reason)));
  });
  try {
    var c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) {
      fail('Bu brauzer yoki kompyuter 3D tasvirni (WebGL) qo\\'llamaydi.', 'Chrome yoki Edge\\'ni yangilang. Chrome sozlamalarida "Use graphics acceleration when available" (apparat tezlatish) yoqilgan bo\\'lsin.');
    }
  } catch (err) { /* tekshiruvning o'zi ishlamasa, davom etamiz */ }
  setTimeout(function () {
    if (!document.querySelector('.app-layout') && !shown) {
      fail('Sahifa 20 soniyada ochilmadi.', 'Brauzer eski bo\\'lishi mumkin. Chrome yoki Edge\\'ning eng yangi versiyasini o\\'rnating.');
    }
  }, 20000);
})();
</script>`;

const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klinika 3D nazorati</title>
</head>
<body style="margin:0;background:#f4f6f8">
<div id="root">${boot}</div>
${guard}
<style>${style}</style>
<script type="module">${code}</script>
</body>
</html>
`;
writeFileSync('Klinika_3D_namuna.html', html);
console.log(`Yozildi: Klinika_3D_namuna.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
