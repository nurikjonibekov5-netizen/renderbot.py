// Jonli voqealar: ketma-ket kelgan holatlarni solishtirib, "kim qayerga kirdi" kabi yozuvlar yasaydi.
import { useEffect, useRef, useState } from 'react';

const MAX_EVENTS = 60;

export function useEvents(snapshot, staffById, roomById, seed = []) {
  const prev = useRef(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!snapshot) return;
    const before = prev.current;
    prev.current = new Map(snapshot.staff.map((s) => [s.id, s]));
    if (!before) return;
    const fresh = [];
    for (const st of snapshot.staff) {
      const old = before.get(st.id);
      const s = staffById.get(st.id);
      if (!old || !s) continue;
      const base = { id: `${st.id}-${snapshot.t}`, t: snapshot.t, staffId: st.id, name: s.name };
      if (!old.present && st.present) fresh.push({ ...base, kind: 'in', text: 'binoga keldi' });
      else if (old.present && !st.present) fresh.push({ ...base, kind: 'out', text: 'binodan chiqdi' });
      else if (st.present && st.status !== old.status && st.status === 'uzoq_harakatsiz') fresh.push({ ...base, kind: 'warn', text: 'uzoq vaqt harakatsiz' });
      else if (st.present && st.status !== old.status && st.status === 'signal_yoq') fresh.push({ ...base, kind: 'warn', text: 'signal yo\'qoldi' });
      else if (st.present && (st.room !== old.room || st.private !== old.private)) {
        const room = st.room ? roomById.get(st.room) : null;
        if (st.private) fresh.push({ ...base, kind: 'move', text: `${st.floor}-qavat, maxfiy zonaga o'tdi` });
        else if (room && room.type !== 'koridor') fresh.push({ ...base, kind: 'move', text: `${room.label}ga kirdi` });
      }
    }
    if (fresh.length) setEvents((list) => [...fresh.reverse(), ...list].slice(0, MAX_EVENTS));
  }, [snapshot, staffById, roomById]);

  // Bugungi tarixdan kelgan voqealar bilan birlashtiriladi (takrorlar olib tashlanadi).
  const seen = new Set();
  return [...events, ...seed]
    .filter((e) => {
      const key = `${e.staffId}-${Math.round(e.t / 10000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.t - a.t)
    .slice(0, MAX_EVENTS);
}
