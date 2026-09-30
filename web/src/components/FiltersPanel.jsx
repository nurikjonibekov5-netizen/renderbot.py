import { STATUS_COLORS } from '../scene/engine/palette.js';
import { STATUS_LABELS } from '../format.js';

// Lavozim filtri va holat belgilari izohi.
export function FiltersPanel({ config, snapshot, roleFilter, onToggle, onClear }) {
  const present = new Map();
  for (const st of snapshot?.staff ?? []) if (st.present) present.set(st.id, st);
  const roles = [...new Set(config.staff.map((s) => s.role))];
  return (
    <div className="filters">
      <div className="side-title">
        <span>Lavozimlar</span>
        {roleFilter.size > 0 && <button className="link" onClick={onClear}>tozalash</button>}
      </div>
      <ul className="role-list">
        {roles.map((r) => {
          const on = roleFilter.has(r);
          const n = config.staff.filter((s) => s.role === r && present.has(s.id)).length;
          return (
            <li key={r}>
              <button className={`role-item ${on ? 'on' : ''} ${roleFilter.size && !on ? 'dim' : ''}`} onClick={() => onToggle(r)} aria-pressed={on}>
                <span className="swatch" style={{ background: config.roles[r]?.color }} />
                <span className="rl-name">{r}</span>
                <span className="rl-count">{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="side-title"><span>Holatlar</span></div>
      <ul className="legend">
        {['yurmoqda', 'turibdi', 'uzoq_harakatsiz', 'signal_yoq'].map((k) => (
          <li key={k}><i style={{ borderColor: STATUS_COLORS[k] }} />{STATUS_LABELS[k]}</li>
        ))}
      </ul>
    </div>
  );
}
