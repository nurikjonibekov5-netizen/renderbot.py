// Ma'lumot manbalari. Ikkalasining ko'rinishi bir xil, ekran qaysi biri ekanini bilmaydi.
//  - LiveSource: haqiqiy server (kompyuterda ishlaganda).
//  - DemoSource: server yo'q, simulyatsiya brauzerning o'zida ishlaydi (telefondagi namuna).
import { buildClinic, clinicToJson } from '../../shared/clinic.js';
import { ClinicEngine, SPEEDS } from '../../shared/engine.js';
import { autoLayout } from '../../shared/layout.js';
import roomsCsv from '../../data/xonalar.csv?raw';
// Namunada (internetga chiqadigan faylda) haqiqiy xodimlar o'rniga soxta ismlar ishlatiladi.
// Haqiqiy ro'yxat (data/xodimlar.csv) faqat parol bilan himoyalangan serverda o'qiladi.
import staffCsv from '../../data/namuna_ochiq_xodimlar.csv?raw';
import rolesCsv from '../../data/lavozimlar.csv?raw';
import demoRoomsCsv from '../../data/namuna_xonalar.csv?raw';
import demoStaffCsv from '../../data/namuna_xodimlar.csv?raw';
import atrofJson from '../../models/atrof/joylashuv.json';
import { atrofList } from '../../shared/atrof.js';

export class DemoSource {
  constructor() {
    this.kind = 'demo';
  }

  start({ onConfig, onSnapshot, onToday, onStatus }) {
    const clinic = buildClinic({ roomsCsv, staffCsv, rolesCsv, demoRoomsCsv, demoStaffCsv });
    this.engine = new ClinicEngine(clinic, { seed: 1 });
    onConfig({
      ...clinicToJson(clinic),
      layout: autoLayout(clinic),
      // Atrofdagi binolar sayt yonidagi models/atrof/ papkasidan yuklanadi (GitHub sahifasida bor).
      // Fayl kompyuterdan ochilganda ular yuklanmaydi va oddiy bloklar ko'rinadi.
      models: { atrof: atrofList(atrofJson, (f) => `models/atrof/${encodeURIComponent(f)}`) },
      mode: 'simulyatsiya',
      speeds: SPEEDS,
      demo: true,
    });
    onStatus('ulangan');
    const push = (withToday) => {
      onSnapshot(this.engine.snapshot());
      if (withToday) onToday(this.engine.today());
    };
    push(true);
    let n = 0;
    this.timer = setInterval(() => {
      this.engine.tick();
      n += 1;
      push(n % 3 === 0);
    }, 1000);
  }

  async timeline(id) {
    return { id, t: this.engine.now(), segments: this.engine.timeline(id) };
  }

  async setSpeed(speed) {
    this.engine.setSpeed(speed);
  }

  stop() {
    clearInterval(this.timer);
  }
}

export class AuthError extends Error {}

async function api(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  if (res.status === 401) throw new AuthError('Kirish kerak');
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).xato || `Xato ${res.status}`);
  return res.json();
}

export async function login(parol) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parol }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).xato || 'Kirib bo\'lmadi');
}

export async function logout() {
  await fetch('/api/logout', { method: 'POST' });
}

export class LiveSource {
  constructor() {
    this.kind = 'live';
    this.stopped = false;
  }

  async start({ onConfig, onSnapshot, onToday, onStatus, onAuthRequired }) {
    this.handlers = { onSnapshot, onToday, onStatus, onAuthRequired };
    try {
      onConfig(await api('/api/config'));
    } catch (err) {
      if (err instanceof AuthError) return onAuthRequired();
      onStatus('xato', String(err.message || err));
      this.retry = setTimeout(() => this.start({ onConfig, onSnapshot, onToday, onStatus, onAuthRequired }), 3000);
      return;
    }
    this.#connect();
  }

  #connect() {
    if (this.stopped) return;
    const { onSnapshot, onToday, onStatus, onAuthRequired } = this.handlers;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      onStatus('ulangan');
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'snapshot') onSnapshot(msg.data);
      else if (msg.type === 'today') onToday(msg.data);
    };
    ws.onclose = async () => {
      if (this.stopped) return;
      onStatus('uzildi');
      if (!opened) {
        // Sessiya tugagan bo'lishi mumkin.
        try {
          await api('/api/snapshot');
        } catch (err) {
          if (err instanceof AuthError) return onAuthRequired();
        }
      }
      this.retry = setTimeout(() => this.#connect(), 2000);
    };
  }

  timeline(id) {
    return api(`/api/tasma/${encodeURIComponent(id)}`);
  }

  setSpeed(tezlik) {
    return api('/api/tezlik', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tezlik }),
    });
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.ws?.close();
  }
}
