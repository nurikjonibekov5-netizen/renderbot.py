import { formatClock, formatDuration, minuteOfDay } from '../../shared/time.js';
import { STATUS_LABELS } from '../../shared/tracker.js';

export { formatClock, formatDuration, minuteOfDay, STATUS_LABELS };

export function locationText(st, roomById) {
  if (!st || !st.present) return 'Binoda emas';
  if (st.private) return `${st.floor}-qavat · maxfiy zona`;
  const room = roomById.get(st.room);
  return `${st.floor}-qavat · ${room?.label ?? st.room}`;
}

export function pct(n) {
  return n == null ? '—' : `${n}%`;
}

export function hoursMinutes(ms) {
  const m = Math.round((ms || 0) / 60000);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

export function activityLevel(a) {
  if (a == null) return 'none';
  if (a >= 75) return 'good';
  if (a >= 50) return 'mid';
  return 'low';
}

// Qidiruv: "Dilnoza qayerda?" -> "dilnoza".
export function normalizeQuery(q) {
  return String(q)
    .toLowerCase()
    .replace(/['’ʻʼ`]/g, '')
    .replace(/\b(qayerda|qani)\b/g, ' ')
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchStaff(staff, query) {
  const q = normalizeQuery(query);
  if (!q) return [];
  const words = q.split(' ');
  const norm = (s) => s.toLowerCase().replace(/['’ʻʼ`]/g, '');
  return staff
    .map((s) => {
      const name = norm(s.name);
      const role = norm(s.role);
      const nameHit = words.every((w) => name.split(' ').some((part) => part.startsWith(w)) || name.includes(w));
      const roleHit = words.every((w) => role.startsWith(w));
      const score = nameHit ? (name.startsWith(q) ? 3 : 2) : roleHit ? 1 : 0;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name))
    .map((x) => x.s);
}
