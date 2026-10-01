import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/icons.jsx';
import { formatClock } from '../format.js';

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

// Sarlavha qatori (1-rasmdagi "Shawn" qismi): nom, bo'limlar, asosiy raqamlar, yangiliklar.
export function PageHeader({ snapshot, floors, active, view, onTab, onFloor, events, onEvent }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);
  const present = (snapshot?.staff ?? []).filter((s) => s.present);
  const attention = present.filter((s) => s.status === 'uzoq_harakatsiz' || s.status === 'signal_yoq').length;
  const d = snapshot ? new Date(snapshot.t + 5 * 3600 * 1000) : null;
  const tabs = [
    { id: 'home', label: 'Bosh sahifa' },
    { id: 'bino', label: 'Bino' },
    { id: 'qavatlar', label: 'Qavatlar', menu: true },
    { id: 'xodimlar', label: 'Xodimlar' },
    { id: 'faollik', label: 'Faollik' },
    { id: 'hisobot', label: 'Hisobot' },
  ];
  return (
    <section className="page-header">
      <div className="ph-left">
        <h1>Klinika</h1>
        <small>{d ? `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, '0')} · raqamli egizak` : 'raqamli egizak'}</small>
        <nav className="tabs-row" aria-label="Bo'limlar">
          {tabs.map((t) => (
            <div key={t.id} className="tab-wrap" ref={t.menu ? menuRef : undefined}>
              <button className={`tab ${active === t.id ? 'on' : ''}`} onClick={() => (t.menu ? setMenu((v) => !v) : onTab(t.id))} aria-expanded={t.menu ? menu : undefined}>
                {t.label}
                {t.menu && <Icon name="chevronDown" size={13} />}
              </button>
              {t.menu && menu && (
                <div className="tab-menu">
                  {[...floors].sort((a, b) => b - a).map((f) => (
                    <button key={f} className={view.mode === 'floor' && view.floor === f ? 'on' : ''} onClick={() => { onFloor(f); setMenu(false); }}>{f}-qavat</button>
                  ))}
                  <button className={view.mode === 'all' ? 'on' : ''} onClick={() => { onTab('all'); setMenu(false); }}>Barcha qavatlar</button>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="ph-kpis">
        <div className="ph-kpi">
          <div><i className="tri" /><b>{present.length}</b></div>
          <small>binoda xodim</small>
        </div>
        <div className="ph-kpi">
          <div><i className={`dot ${attention ? 'red' : 'green'}`} /><b>{attention}</b></div>
          <small>e'tibor kerak</small>
        </div>
      </div>
      <div className="ph-news">
        <b className="news-title">Yangiliklar</b>
        {events.length ? events.slice(0, 2).map((e, i) => (
          <button key={e.id} className="news-line" onClick={() => onEvent(e.staffId)}>
            {i + 1}. {e.name} {e.text} <time>{formatClock(e.t)}</time>
          </button>
        )) : <span className="news-line muted">Xodimlar harakatlanganda shu yerda yoziladi.</span>}
      </div>
    </section>
  );
}
