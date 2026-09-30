// Simulyatsiya: qurilmalar yo'q paytda soxta xodimlarni real ishga o'xshatib yurgizadi.
// Natija kuzatuvchiga (Tracker) haqiqiy nishonlar bilan bir xil ko'rinishda uzatiladi.
import { dayKey, dayStart, hashString, minuteOfDay, MIN, rng } from './time.js';

export const SIM_STEP_MS = 5000;

const rand = (r, a, b) => a + r() * (b - a);
const pick = (r, list) => list[Math.floor(r() * list.length)];

// Har lavozim qanday ishlashi: qayerga boradi, qancha turadi, xonada qanchalik harakatlanadi.
const BEHAVIOR = {
  Sanitarka(ctx) {
    const { r, agent, rooms } = ctx;
    const pool = r() < 0.75 ? rooms.cleanable(agent.staff.floor) : rooms.cleanable();
    const room = pick(r, pool.length ? pool : rooms.cleanable());
    if (!room) return null;
    return room.type === 'koridor'
      ? { room, min: 3, max: 9, motion: 0.9 }
      : { room, min: 6, max: 16, motion: 0.75 };
  },
  Hamshira(ctx) {
    const { r, agent, rooms } = ctx;
    const f = agent.staff.floor;
    const x = r();
    if (x < 0.55) {
      const room = pick(r, rooms.ofKind(['Palata'], f)) || pick(r, rooms.ofKind(['Palata']));
      if (room) return { room, min: 5, max: 15, motion: 0.5 };
    }
    if (x < 0.8) {
      const room = pick(r, rooms.ofKind(['Post', 'Protsedura'], f)) || rooms.home(agent);
      if (room) return { room, min: 8, max: 20, motion: 0.35 };
    }
    const corr = rooms.corridor(f);
    if (corr) return { room: corr, min: 2, max: 5, motion: 0.85 };
    return { room: rooms.home(agent), min: 10, max: 20, motion: 0.4 };
  },
  Shifokor(ctx) {
    const { r, agent, rooms } = ctx;
    const x = r();
    if (x < 0.12) {
      const room = pick(r, rooms.ofKind(['Operatsion']));
      if (room) return { room, min: 40, max: 90, motion: 0.22 };
    }
    if (x < 0.32) {
      const room = pick(r, rooms.ofKind(['Palata'], agent.staff.floor)) || pick(r, rooms.ofKind(['Palata']));
      if (room) return { room, min: 8, max: 18, motion: 0.3 };
    }
    return { room: rooms.home(agent), min: 20, max: 55, motion: 0.17 };
  },
  Laborant(ctx) {
    const { r, agent, rooms } = ctx;
    if (r() < 0.12) {
      const room = pick(r, rooms.ofKind(['Palata']));
      if (room) return { room, min: 4, max: 10, motion: 0.45 };
    }
    const labs = rooms.ofKind(['Laboratoriya'], agent.staff.floor);
    const room = r() < 0.7 ? rooms.home(agent) : pick(r, labs) || rooms.home(agent);
    return { room, min: 20, max: 60, motion: 0.25 };
  },
  Oshpaz(ctx) {
    const { r, agent, rooms } = ctx;
    if (r() < 0.12) {
      const room = pick(r, rooms.ofKind(['Ombor'], agent.staff.floor));
      if (room) return { room, min: 4, max: 10, motion: 0.6 };
    }
    return { room: rooms.home(agent), min: 25, max: 60, motion: 0.5 };
  },
  Administrator(ctx) {
    const { r, agent, rooms } = ctx;
    if (r() < 0.15) {
      const room = pick(r, rooms.ofKind(['Kabinet'], agent.staff.floor));
      if (room) return { room, min: 3, max: 8, motion: 0.3 };
    }
    return { room: rooms.home(agent), min: 20, max: 60, motion: 0.28 };
  },
};

function defaultBehavior({ agent, rooms }) {
  return { room: rooms.home(agent), min: 20, max: 50, motion: 0.3 };
}

class RoomIndex {
  constructor(clinic) {
    this.clinic = clinic;
    this.all = clinic.rooms;
    this.corridors = new Map();
    for (const r of this.all) {
      if (r.type === 'koridor' && !this.corridors.has(r.floor)) this.corridors.set(r.floor, r);
    }
  }
  corridor(floor) { return this.corridors.get(floor) || null; }
  home(agent) {
    return this.clinic.roomById.get(agent.staff.homeRoom)
      || this.corridor(agent.staff.floor)
      || this.all.find((r) => r.floor === agent.staff.floor && r.type !== 'maxfiy')
      || this.all.find((r) => r.type !== 'maxfiy');
  }
  ofKind(kinds, floor) {
    const ks = kinds.map((k) => k.toLowerCase());
    return this.all.filter((r) => (floor == null || r.floor === floor)
      && r.type !== 'maxfiy' && ks.some((k) => r.kind.toLowerCase().startsWith(k)));
  }
  cleanable(floor) {
    return this.all.filter((r) => (floor == null || r.floor === floor) && r.type !== 'maxfiy');
  }
  ofType(type, floor) {
    return this.all.filter((r) => r.type === type && (floor == null || r.floor === floor));
  }
  entrance() {
    return this.corridor(1) || this.all.find((r) => r.floor === 1 && r.type !== 'maxfiy') || this.all[0];
  }
  // Bir xonadan ikkinchisiga yo'l: koridor, zinapoya orqali boshqa qavat koridori.
  route(from, to) {
    if (!from || from.id === to.id) return [to];
    const path = [];
    const cf = this.corridor(from.floor);
    const ct = this.corridor(to.floor);
    if (cf && from.id !== cf.id) path.push(cf);
    if (from.floor !== to.floor && ct && ct.id !== to.id) path.push(ct);
    if (from.floor === to.floor && cf && to.id === cf.id) return path.length ? path : [to];
    path.push(to);
    return path;
  }
}

export class Simulation {
  constructor(clinic, { onObserve, seed = 1 } = {}) {
    this.clinic = clinic;
    this.rooms = new RoomIndex(clinic);
    this.onObserve = onObserve || (() => {});
    this.seed = seed;
    this.t = null;
    this.day = null;
    this.agents = clinic.staff.map((staff) => ({ staff }));
  }

  #planDay(t) {
    this.day = dayKey(t);
    const dayRnd = rng(hashString(`${this.seed}:${this.day}`));
    const batteryVictim = dayRnd() < 0.5 ? pick(dayRnd, this.agents) : null;
    for (const a of this.agents) {
      const r = rng(hashString(`${this.seed}:${a.staff.id}:${this.day}`));
      const late = r() < 0.12 ? rand(r, 10, 35) : rand(r, -15, 8);
      const plan = {
        arrive: a.staff.shiftStart + late,
        leave: a.staff.shiftEnd + rand(r, 0, 20),
        lunch: rand(r, 12 * 60 + 15, 14 * 60),
        lunchDone: false,
        battery: null,
      };
      if (a === batteryVictim) {
        const from = rand(r, plan.arrive + 90, Math.max(plan.arrive + 100, plan.leave - 120));
        plan.battery = { from, to: from + rand(r, 12, 30) };
      }
      Object.assign(a, {
        r,
        plan,
        inside: false,
        leaving: false,
        room: null,
        path: [],
        hopUntil: 0,
        task: null,
        dwellUntil: 0,
        moving: false,
        chunkUntil: 0,
        announcedOut: false,
      });
    }
  }

  #choose(a, m) {
    const { r, plan } = a;
    const rest = this.rooms.ofType('dam_olish');
    if (!plan.lunchDone && m >= plan.lunch && m < plan.leave - 45 && rest.length) {
      plan.lunchDone = true;
      return { room: pick(r, rest), min: 25, max: 45, motion: 0.05 };
    }
    if (r() < 0.05) {
      const priv = this.rooms.ofType('maxfiy', a.room?.floor);
      const room = pick(r, priv.length ? priv : this.rooms.ofType('maxfiy'));
      if (room) return { room, min: 3, max: 7, motion: 0.1 };
    }
    if (rest.length && r() < 0.04) return { room: pick(r, rest), min: 8, max: 15, motion: 0.05 };
    const fn = BEHAVIOR[a.staff.role] || defaultBehavior;
    return fn({ r, agent: a, rooms: this.rooms }) || defaultBehavior({ agent: a, rooms: this.rooms });
  }

  #go(a, task, t) {
    a.task = task;
    a.path = this.rooms.route(a.room, task.room);
    this.#hop(a, t);
  }

  #hop(a, t) {
    const next = a.path.shift();
    a.room = next;
    if (a.path.length) {
      a.moving = true;
      a.hopUntil = t + rand(a.r, 15, 45) * 1000;
    } else if (a.task) {
      a.dwellUntil = t + rand(a.r, a.task.min, a.task.max) * MIN;
      a.chunkUntil = t;
    }
  }

  #stepAgent(a, t) {
    const m = minuteOfDay(t);
    const { plan, r } = a;
    if (!a.inside) {
      if (m >= plan.arrive && m < plan.leave) {
        a.inside = true;
        a.announcedOut = false;
        a.room = null;
        a.path = [];
        const home = this.rooms.home(a);
        a.task = { room: home, min: 10, max: 30, motion: 0.3 };
        a.path = this.rooms.route(this.rooms.entrance(), home);
        if (a.path[0]?.id !== this.rooms.entrance().id) a.path.unshift(this.rooms.entrance());
        this.#hop(a, t);
      } else {
        if (!a.announcedOut) {
          this.onObserve(a.staff.id, t, { roomId: null, moving: false });
          a.announcedOut = true;
        }
        return;
      }
    }

    if (a.path.length) {
      if (t >= a.hopUntil) this.#hop(a, t);
    } else if (a.leaving) {
      a.inside = false;
      a.leaving = false;
      a.room = null;
      this.onObserve(a.staff.id, t, { roomId: null, moving: false });
      a.announcedOut = true;
      return;
    } else if (m >= plan.leave) {
      a.leaving = true;
      a.task = null;
      const exit = this.rooms.entrance();
      a.path = this.rooms.route(a.room, exit);
      if (a.path[a.path.length - 1]?.id !== exit.id) a.path.push(exit);
      if (a.room?.id === exit.id) a.path = [];
      else this.#hop(a, t);
    } else if (t >= a.dwellUntil) {
      this.#go(a, this.#choose(a, m), t);
    } else if (t >= a.chunkUntil) {
      a.moving = r() < (a.task?.motion ?? 0.3);
      a.chunkUntil = t + (a.moving ? rand(r, 1, 4) : rand(r, 1, 7)) * MIN;
    }

    if (plan.battery && m >= plan.battery.from && m < plan.battery.to) return;
    this.onObserve(a.staff.id, t, { roomId: a.room.id, moving: a.moving });
  }

  // Simulyatsiyani t vaqtgacha yurgizadi (5 soniyalik qadamlar bilan).
  runTo(t) {
    if (this.t == null) {
      this.t = t;
      this.#planDay(t);
    }
    while (this.t + SIM_STEP_MS <= t) {
      const next = this.t + SIM_STEP_MS;
      if (dayStart(next) !== dayStart(this.t)) this.#planDay(next);
      this.t = next;
      for (const a of this.agents) this.#stepAgent(a, next);
    }
  }
}
