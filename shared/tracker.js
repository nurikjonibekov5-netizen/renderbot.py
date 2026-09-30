// Kuzatuvchi: kim qaysi xonada ekanini yozib boradi va kunlik faollikni hisoblaydi.
// Ma'lumot qayerdan kelishi muhim emas: simulyatsiyadan ham, haqiqiy nishonlardan ham
// bir xil "kuzatuv" ko'rinishida keladi: observe(xodim, vaqt, { roomId, moving }).
import { isWorkZone } from './clinic.js';
import { MIN } from './time.js';

export const STATUS = {
  OUT: 'binoda_emas',
  MOVING: 'yurmoqda',
  STANDING: 'turibdi',
  IDLE: 'uzoq_harakatsiz',
  LOST: 'signal_yoq',
};

export const STATUS_LABELS = {
  binoda_emas: 'Binoda emas',
  yurmoqda: 'Yurmoqda',
  turibdi: 'Turibdi',
  uzoq_harakatsiz: 'Uzoq vaqt harakatsiz',
  signal_yoq: 'Signal yo\'q',
};

// Harakat va ish zonasi ulushi. Faollik = 60% harakat + 40% ish zonasi.
export const ACTIVITY_WEIGHTS = { moving: 0.6, workZone: 0.4 };
const STEPS_PER_MOVING_SECOND = 1.6;
const METERS_PER_STEP = 0.65;

function emptyAcc() {
  return { present: 0, moving: 0, work: 0, rest: 0, private: 0, idleLong: 0, idleCount: 0 };
}

export class Tracker {
  constructor(clinic, { idleLimitMs = 20 * MIN, signalLossMs = 60 * 1000 } = {}) {
    this.clinic = clinic;
    this.idleLimitMs = idleLimitMs;
    this.signalLossMs = signalLossMs;
    this.people = new Map();
    this.dayStartT = null;
    for (const s of clinic.staff) this.people.set(s.id, this.#fresh(s));
  }

  #fresh(staff) {
    return {
      staff,
      present: false,
      lost: false,
      roomId: null,
      moving: false,
      lastT: null,
      lastSeen: null,
      roomSince: null,
      stillSince: null,
      idleCounted: false,
      acc: emptyAcc(),
      rooms: new Set(),
      extraSteps: null,
      firstIn: null,
      lastOut: null,
      segments: [],
    };
  }

  // Yangi kun: hisoblagichlarni nolga qaytaradi, joriy joylashuvni saqlaydi.
  resetDay(t) {
    this.dayStartT = t;
    for (const [id, p] of this.people) {
      const next = this.#fresh(p.staff);
      if (p.present && !p.lost) {
        Object.assign(next, { present: true, roomId: p.roomId, moving: p.moving, lastSeen: p.lastSeen });
        next.lastT = t;
        next.roomSince = t;
        next.stillSince = p.moving ? null : t;
        next.firstIn = t;
        next.rooms.add(p.roomId);
        this.#openSegment(next, t);
      }
      this.people.set(id, next);
    }
  }

  // Bitta kuzatuv. roomId = null bo'lsa, xodim binodan chiqqan.
  observe(staffId, t, { roomId, moving = false, steps = null }) {
    const p = this.people.get(staffId);
    if (!p) return;
    this.#integrate(p, t);
    if (steps != null) p.extraSteps = (p.extraSteps ?? 0) + steps;
    if (roomId == null) {
      if (p.present) {
        p.present = false;
        p.lost = false;
        p.lastOut = t;
        this.#closeSegment(p, t);
      }
      p.lastT = t;
      return;
    }
    const room = this.clinic.roomById.get(roomId);
    if (!room) return;
    const wasLost = p.lost;
    const changedRoom = !p.present || p.roomId !== roomId;
    const changedMotion = p.moving !== moving;
    if (!p.present) {
      p.present = true;
      if (p.firstIn == null) p.firstIn = t;
    }
    p.lost = false;
    p.lastSeen = t;
    p.lastT = t;
    if (changedRoom) {
      p.roomId = roomId;
      p.roomSince = t;
      p.rooms.add(roomId);
    }
    if (moving) {
      p.stillSince = null;
      p.idleCounted = false;
    } else if (p.stillSince == null) {
      p.stillSince = t;
    }
    p.moving = moving;
    if (changedRoom || changedMotion || wasLost) {
      this.#closeSegment(p, t);
      this.#openSegment(p, t);
    }
  }

  // Barcha xodimlar uchun hisobni t vaqtgacha yetkazadi (signal yo'qolganini ham aniqlaydi).
  advance(t) {
    for (const p of this.people.values()) this.#integrate(p, t);
  }

  #integrate(p, t) {
    if (p.lastT == null) { p.lastT = t; return; }
    if (t <= p.lastT) return;
    if (p.present && !p.lost && t - p.lastSeen > this.signalLossMs) {
      const lostAt = Math.max(p.lastT, p.lastSeen + this.signalLossMs);
      this.#accumulate(p, p.lastT, lostAt);
      p.lost = true;
      this.#closeSegment(p, lostAt);
      p.segments.push({ s: lostAt, e: t, kind: 'lost', floor: null, room: null, private: false, moving: false });
      p.lastT = t;
      return;
    }
    if (p.present && !p.lost) this.#accumulate(p, p.lastT, t);
    const last = p.segments[p.segments.length - 1];
    if (last && last.open) last.e = t;
    else if (last && last.kind === 'lost' && p.lost) last.e = t;
    p.lastT = t;
  }

  #accumulate(p, a, b) {
    const d = b - a;
    if (d <= 0) return;
    const room = this.clinic.roomById.get(p.roomId);
    const role = this.clinic.roles[p.staff.role];
    p.acc.present += d;
    if (p.moving) p.acc.moving += d;
    if (room?.type === 'maxfiy') p.acc.private += d;
    else if (room?.type === 'dam_olish') p.acc.rest += d;
    else if (isWorkZone(role, room)) p.acc.work += d;
    if (!p.moving && p.stillSince != null) {
      const overStart = p.stillSince + this.idleLimitMs;
      if (b > overStart) {
        p.acc.idleLong += b - Math.max(a, overStart);
        if (!p.idleCounted) { p.acc.idleCount += 1; p.idleCounted = true; }
      }
    }
  }

  #openSegment(p, t) {
    const room = this.clinic.roomById.get(p.roomId);
    const priv = room?.type === 'maxfiy';
    p.segments.push({
      s: t,
      e: t,
      open: true,
      kind: priv ? 'private' : room?.type ?? 'ish',
      floor: room?.floor ?? null,
      room: priv ? null : p.roomId,
      private: priv,
      moving: p.moving,
    });
  }

  #closeSegment(p, t) {
    const last = p.segments[p.segments.length - 1];
    if (last && last.open) {
      last.e = t;
      delete last.open;
      if (last.e - last.s < 1000) p.segments.pop();
      else this.#mergeTail(p);
    }
  }

  #mergeTail(p) {
    const n = p.segments.length;
    if (n < 2) return;
    const a = p.segments[n - 2];
    const b = p.segments[n - 1];
    if (a.kind === b.kind && a.room === b.room && a.floor === b.floor && a.moving === b.moving && b.s - a.e < 1000) {
      a.e = b.e;
      p.segments.pop();
    }
  }

  status(p, t) {
    if (!p.present) return STATUS.OUT;
    if (p.lost || (p.lastSeen != null && t - p.lastSeen > this.signalLossMs)) return STATUS.LOST;
    if (p.moving) return STATUS.MOVING;
    if (p.stillSince != null && t - p.stillSince >= this.idleLimitMs) return STATUS.IDLE;
    return STATUS.STANDING;
  }

  // Ekranga chiqadigan joriy holat. Maxfiy zonada aniq xona yuborilmaydi.
  state(staffId, t) {
    const p = this.people.get(staffId);
    if (!p) return null;
    const room = this.clinic.roomById.get(p.roomId);
    const priv = room?.type === 'maxfiy';
    const status = this.status(p, t);
    return {
      id: staffId,
      present: p.present,
      status,
      floor: p.present ? room?.floor ?? null : null,
      room: p.present && !priv ? p.roomId : null,
      private: p.present && priv,
      moving: status === STATUS.MOVING,
      roomSince: p.present ? p.roomSince : null,
      lastSeen: p.lastSeen,
      activity: this.activity(p),
    };
  }

  activity(p) {
    const { present, moving, work } = p.acc;
    if (present < 5 * MIN) return null;
    const norm = this.clinic.roles[p.staff.role]?.norm || 0.3;
    const moveScore = Math.min(1, moving / present / norm);
    const zoneScore = Math.min(1, work / present);
    return Math.round(100 * (ACTIVITY_WEIGHTS.moving * moveScore + ACTIVITY_WEIGHTS.workZone * zoneScore));
  }

  summary(staffId) {
    const p = this.people.get(staffId);
    if (!p) return null;
    const steps = p.extraSteps ?? Math.round((p.acc.moving / 1000) * STEPS_PER_MOVING_SECOND);
    const visited = [...p.rooms].filter((id) => this.clinic.roomById.get(id)?.type !== 'koridor');
    return {
      id: staffId,
      presentMs: p.acc.present,
      movingMs: p.acc.moving,
      workMs: p.acc.work,
      restMs: p.acc.rest,
      privateMs: p.acc.private,
      idleLongMs: p.acc.idleLong,
      idleCount: p.acc.idleCount,
      steps,
      distanceM: Math.round(steps * METERS_PER_STEP),
      roomsVisited: visited.length,
      activity: this.activity(p),
      firstIn: p.firstIn,
      lastOut: p.present ? null : p.lastOut,
    };
  }

  timeline(staffId) {
    const p = this.people.get(staffId);
    if (!p) return [];
    return p.segments.map(({ open, ...seg }) => seg);
  }
}
