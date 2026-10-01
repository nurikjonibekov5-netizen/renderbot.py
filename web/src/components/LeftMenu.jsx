import { STATUS_COLORS } from '../scene/engine/palette.js';
import { STATUS_LABELS } from '../format.js';

const ROLE_ICONS = {
  hamshira: 'M12 4v16M4 12h16',
  shifokor: 'M6 3v6a6 6 0 0 0 12 0V3M12 15v2a4 4 0 0 0 8 0v-3M20 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  sanitarka: 'M3 21h18M6 21V10l6-6 6 6v11M10 14h4',
  laborant: 'M9 3h6M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3',
  oshpaz: 'M6 13h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM6 13a4 4 0 1 1 2-7.5 4 4 0 0 1 8 0A4 4 0 1 1 18 13',
  administrator: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
};

// Chapdagi ro'yxat (1-rasmdagi "XDragon Data System" qismi): joriy ko'rinish nomi va lavozimlar.
export function LeftMenu({ config, snapshot, view, hoverFloor, roleFilter, onToggle, onClear, onHome, children }) {
  const present = (snapshot?.staff ?? []).filter((s) => s.present);
  const staffById = new Map(config.staff.map((s) => [s.id, s]));
  const roles = [...new Set(config.staff.map((s) => s.role))];
  let title = 'Nazorat tizimi';
  let eyebrow = 'Klinika';
  let hint = hoverFloor ? `${hoverFloor}-qavatga kirish uchun bosing` : 'Qavatni bosing — ichkariga kirasiz';
  if (view.mode === 'overview') {
    eyebrow = 'Bino';
    title = 'Tashqi ko\'rinish';
  } else if (view.mode === 'floor') {
    eyebrow = 'Qavat';
    title = `${view.floor}-qavat`;
    hint = 'Odamchani bosing — ma\'lumot ochiladi';
  } else if (view.mode === 'all') {
    eyebrow = 'Qavatlar';
    title = 'Barcha qavatlar';
    hint = 'Qavatni bosing — o\'sha qavatga o\'tasiz';
  }
  return (
    <aside className="left-menu">
      <div className="lm-head">
        <button className="lm-eyebrow" onClick={onHome} disabled={view.mode === 'home'}>{eyebrow}</button>
        <h2>{title}<i className="lm-mark" /></h2>
        <p className="lm-hint">{hint}</p>
      </div>
      <ul className="lm-list">
        {roles.map((r) => {
          const on = roleFilter.has(r);
          const n = present.filter((s) => staffById.get(s.id)?.role === r).length;
          const total = config.staff.filter((s) => s.role === r).length;
          const color = config.roles[r]?.color;
          return (
            <li key={r}>
              <button className={`lm-item ${on ? 'on' : ''} ${roleFilter.size && !on ? 'dim' : ''}`} onClick={() => onToggle(r)} aria-pressed={on}>
                <span className="lm-ico" style={{ color }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ROLE_ICONS[r.toLowerCase()] || 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0'} /></svg>
                </span>
                <span className="lm-txt"><b>{r}</b><small>{n} / {total} binoda</small></span>
              </button>
            </li>
          );
        })}
      </ul>
      {roleFilter.size > 0 && <button className="link lm-clear" onClick={onClear}>Filtrni tozalash</button>}
      <ul className="lm-legend">
        {['yurmoqda', 'turibdi', 'uzoq_harakatsiz', 'signal_yoq'].map((k) => (
          <li key={k}><i style={{ borderColor: STATUS_COLORS[k] }} />{STATUS_LABELS[k]}</li>
        ))}
      </ul>
      {children}
    </aside>
  );
}
