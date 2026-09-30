// Vaqt yordamchilari. Klinika Toshkent vaqtida ishlaydi (GMT+5, yozgi vaqt yo'q).
export const TZ_OFFSET_MS = 5 * 3600 * 1000;
export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

// Kun boshi (Toshkent vaqti bilan 00:00) millisekundlarda.
export function dayStart(t) {
  return Math.floor((t + TZ_OFFSET_MS) / DAY) * DAY - TZ_OFFSET_MS;
}

// Kun boshidan beri o'tgan daqiqalar.
export function minuteOfDay(t) {
  return (t - dayStart(t)) / MIN;
}

export function dayKey(t) {
  return new Date(dayStart(t) + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatClock(t) {
  const m = Math.floor(minuteOfDay(t));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatMinutes(min) {
  const m = Math.floor(min);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// "1 soat 5 daqiqa" ko'rinishida.
export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} soat ${m} daqiqa`;
  if (h) return `${h} soat`;
  return `${m} daqiqa`;
}

// Takrorlanadigan tasodifiy sonlar (bir xil urug' -> bir xil natija).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
