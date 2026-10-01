import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { formatClock } from '../format.js';

// Qo'ng'iroqcha: jonli voqealar ro'yxati. Voqeani bossangiz, o'sha xodim ko'rsatiladi.
export function EventsBell({ events, onPick }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const box = useRef(null);
  const unread = events.length && events[0].id !== seen ? events.findIndex((e) => e.id === seen) : 0;
  const count = unread === -1 ? events.length : unread;
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return (
    <div className="bell" ref={box}>
      <button
        className="icon-btn"
        aria-label="Voqealar"
        title="Voqealar"
        onClick={() => {
          setOpen((v) => !v);
          if (events[0]) setSeen(events[0].id);
        }}
      >
        <Icon name="bell" size={19} />
        {count > 0 && <span className="bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="bell-pop">
          <div className="bell-head">Jonli voqealar</div>
          {events.length ? (
            <ul>
              {events.slice(0, 25).map((e) => (
                <li key={e.id}>
                  <button onClick={() => { onPick(e.staffId); setOpen(false); }}>
                    <i className={`ev-dot ${e.kind}`} />
                    <span><b>{e.name}</b> {e.text}</span>
                    <time>{formatClock(e.t)}</time>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="muted small bell-empty">Hozircha voqea yo'q. Xodimlar xonadan xonaga o'tganda shu yerda ko'rinadi.</p>}
        </div>
      )}
    </div>
  );
}
