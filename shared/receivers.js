// Haqiqiy qurilmalar uchun: xonalardagi qabul qiluvchilar (ESP32) yuborgan signallardan
// xodim qaysi xonada ekanini aniqlaydi. Eng kuchli eshitgan qabul qiluvchi yutadi.
// Devor orqali "sakrashlar"ning oldini olish uchun signallar o'rtachalanadi va
// yangi xona eskisidan sezilarli (HYSTERESIS_DB) kuchli bo'lsagina almashtiriladi.

export const WINDOW_MS = 10_000;
export const HYSTERESIS_DB = 4;

export class ReceiverLocator {
  constructor(clinic) {
    this.clinic = clinic;
    this.byBadge = new Map(clinic.staff.map((s) => [String(s.badge), s.id]));
    this.readings = new Map(); // xodim -> [{ t, room, rssi }]
    this.current = new Map(); // xodim -> xona
    this.motion = new Map(); // xodim -> { t, moving }
  }

  // Bitta signal: { nishon, xona, rssi, harakat }. Noto'g'ri signal bo'lsa, sabab qaytadi.
  ingest(signal, t) {
    const staffId = this.byBadge.get(String(signal?.nishon ?? ''));
    if (!staffId) return { ok: false, error: `Noma'lum nishon: ${signal?.nishon}` };
    const room = String(signal.xona ?? '');
    if (!this.clinic.roomById.has(room)) return { ok: false, error: `Noma'lum xona: ${room}` };
    const rssi = Number(signal.rssi);
    if (!Number.isFinite(rssi)) return { ok: false, error: 'rssi raqam bo\'lishi kerak' };
    const list = this.readings.get(staffId) || [];
    list.push({ t, room, rssi });
    this.readings.set(staffId, list);
    if (signal.harakat != null) this.motion.set(staffId, { t, moving: Boolean(signal.harakat) });
    return { ok: true, staffId };
  }

  // Har xodim uchun hozirgi xonani hisoblaydi. Signal kelmagan xodimlar qaytmaydi.
  resolve(t) {
    const out = [];
    for (const [staffId, list] of this.readings) {
      const fresh = list.filter((x) => t - x.t <= WINDOW_MS);
      this.readings.set(staffId, fresh);
      if (!fresh.length) continue;
      const sums = new Map();
      for (const x of fresh) {
        const s = sums.get(x.room) || { sum: 0, n: 0 };
        s.sum += x.rssi;
        s.n += 1;
        sums.set(x.room, s);
      }
      let best = null;
      for (const [room, s] of sums) {
        const avg = s.sum / s.n;
        if (!best || avg > best.avg) best = { room, avg };
      }
      const cur = this.current.get(staffId);
      const curAvg = cur && sums.has(cur) ? sums.get(cur).sum / sums.get(cur).n : null;
      let room = best.room;
      if (curAvg != null && best.room !== cur && best.avg - curAvg < HYSTERESIS_DB) room = cur;
      this.current.set(staffId, room);
      const mo = this.motion.get(staffId);
      out.push({ staffId, roomId: room, moving: Boolean(mo && t - mo.t <= WINDOW_MS && mo.moving) });
    }
    return out;
  }
}
