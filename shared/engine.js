// Tizim yadrosi: vaqt, simulyatsiya yoki haqiqiy qurilmalar, kuzatuvchi — hammasini bog'laydi.
// Server ham, telefondagi namuna ham shu yadrodan foydalanadi.
import { Simulation } from './simulation.js';
import { Tracker } from './tracker.js';
import { ReceiverLocator } from './receivers.js';
import { dayStart, dayKey, minuteOfDay, HOUR, MIN } from './time.js';

export const SPEEDS = [1, 10, 60, 300];

export class ClinicEngine {
  constructor(clinic, settings = {}, { now = () => Date.now() } = {}) {
    this.clinic = clinic;
    this.settings = settings;
    this.realNow = now;
    this.mode = settings.rejim === 'haqiqiy' ? 'haqiqiy' : 'simulyatsiya';
    this.tracker = new Tracker(clinic, {
      idleLimitMs: (settings.uzoq_harakatsizlik_daqiqa ?? 20) * MIN,
      signalLossMs: (settings.signal_yoqolishi_soniya ?? 60) * 1000,
    });
    this.speed = SPEEDS.includes(Number(settings.simulyatsiya_tezligi)) ? Number(settings.simulyatsiya_tezligi) : 1;
    this.demoDay = false;
    this.listeners = new Set();
    this.lastPublic = new Map();
    this.trackerDay = null;

    if (this.mode === 'simulyatsiya') {
      this.sim = new Simulation(clinic, {
        seed: settings.seed ?? 1,
        onObserve: (id, t, obs) => {
          this.#ensureDay(t);
          this.tracker.observe(id, t, obs);
        },
      });
      this.#startSimulation();
    } else {
      this.locator = new ReceiverLocator(clinic);
      this.t = this.realNow();
      this.#ensureDay(this.t);
    }
  }

  #ensureDay(t) {
    const d = dayStart(t);
    if (this.trackerDay !== d) {
      this.trackerDay = d;
      this.tracker.resetDay(d);
    }
  }

  // Ish vaqti bo'lmasa (kechasi), "namuna kun" soat 10:30 dan boshlanadi.
  // Kun boshidan hozirgacha bo'lgan qism tezkor o'tkaziladi, shunda jadvallar bo'sh turmaydi.
  #startSimulation() {
    const real = this.realNow();
    const m = minuteOfDay(real);
    let start = real;
    if (m < 7 * 60 + 30 || m > 20 * 60) {
      start = dayStart(real) + 10.5 * HOUR;
      this.demoDay = true;
    }
    const from = dayStart(start) + 6.5 * HOUR;
    this.sim.runTo(from);
    this.#ensureDay(from);
    this.sim.runTo(start);
    this.t = start;
    this.lastReal = real;
    this.tracker.advance(start);
  }

  now() {
    return this.t;
  }

  setSpeed(speed) {
    if (this.mode !== 'simulyatsiya' || !SPEEDS.includes(Number(speed))) return false;
    this.tick();
    this.speed = Number(speed);
    return true;
  }

  // Haqiqiy rejim: qabul qiluvchidan kelgan signal.
  ingestSignal(signal) {
    if (this.mode !== 'haqiqiy') return { ok: false, error: 'Tizim simulyatsiya rejimida' };
    return this.locator.ingest(signal, this.realNow());
  }

  // Vaqtni oldinga suradi. Server buni har soniyada chaqiradi.
  tick() {
    if (this.mode === 'simulyatsiya') {
      const real = this.realNow();
      const t = this.t + Math.max(0, real - this.lastReal) * this.speed;
      this.lastReal = real;
      this.sim.runTo(t);
      this.t = t;
    } else {
      const t = this.realNow();
      this.#ensureDay(t);
      for (const o of this.locator.resolve(t)) this.tracker.observe(o.staffId, t, o);
      // Smena tugaganidan 30 daqiqa keyin ham signal bo'lmasa, xodim ketgan hisoblanadi.
      for (const s of this.clinic.staff) {
        const st = this.tracker.state(s.id, t);
        if (st.present && st.status === 'signal_yoq' && minuteOfDay(t) > s.shiftEnd + 30) {
          this.tracker.observe(s.id, t, { roomId: null });
        }
      }
      this.t = t;
    }
    this.#ensureDay(this.t);
    this.tracker.advance(this.t);
    this.#emitChanges();
  }

  // Haqiqiy rejim: server qayta ishga tushganda bugungi tarixni bazadan tiklaydi.
  replay(rows) {
    if (this.mode !== 'haqiqiy') return;
    // Bazada faqat o'zgarishlar yozilgan, shuning uchun tiklash paytida signal uzilishi hisoblanmaydi.
    const loss = this.tracker.signalLossMs;
    this.tracker.signalLossMs = Infinity;
    for (const row of rows) {
      if (dayStart(row.vaqt) !== this.trackerDay) continue;
      if (row.holat === 'signal_yoq') continue;
      if (row.holat === 'binoda_emas') {
        this.tracker.observe(row.xodim, row.vaqt, { roomId: null });
        continue;
      }
      const roomId = row.xona
        || this.clinic.rooms.find((r) => r.floor === row.qavat && r.type === 'maxfiy')?.id;
      if (roomId) this.tracker.observe(row.xodim, row.vaqt, { roomId, moving: row.holat === 'yurmoqda' });
    }
    this.tracker.signalLossMs = loss;
    this.tracker.advance(this.realNow());
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  #emitChanges() {
    if (!this.listeners.size) return;
    for (const s of this.clinic.staff) {
      const st = this.tracker.state(s.id, this.t);
      const key = `${st.present}|${st.floor}|${st.room}|${st.private}|${st.status}`;
      if (this.lastPublic.get(s.id) === key) continue;
      this.lastPublic.set(s.id, key);
      for (const fn of this.listeners) fn(st, this.t);
    }
  }

  snapshot() {
    return {
      t: this.t,
      day: dayKey(this.t),
      mode: this.mode,
      speed: this.speed,
      demoDay: this.demoDay,
      staff: this.clinic.staff.map((s) => this.tracker.state(s.id, this.t)),
    };
  }

  today() {
    return {
      t: this.t,
      day: dayKey(this.t),
      rows: this.clinic.staff.map((s) => this.tracker.summary(s.id)),
    };
  }

  timeline(staffId) {
    return this.tracker.timeline(staffId);
  }
}
