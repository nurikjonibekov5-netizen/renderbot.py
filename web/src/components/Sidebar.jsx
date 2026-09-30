import { STATUS_COLORS } from '../scene/ClinicScene.js';
import { STATUS_LABELS } from '../format.js';

// Chap panel: lavozim filtri, qavatlar bo'yicha xodimlar soni, belgilar izohi, ogohlantirishlar.
export function Sidebar({ config, snapshot, roleFilter, onToggleRole, onClearRoles, floor, onFloor, warnings, open, onClose }) {
  const staffById = new Map(config.staff.map((s) => [s.id, s]));
  const present = (snapshot?.staff ?? []).filter((s) => s.present);
  const roleNames = [...new Set(config.staff.map((s) => s.role))];
  const byRole = (role) => present.filter((s) => staffById.get(s.id)?.role === role).length;
  const visible = present.filter((s) => !roleFilter.size || roleFilter.has(staffById.get(s.id)?.role));

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Filtr va qavatlar">
      <div className="side-head">
        <h3>Lavozimlar</h3>
        {roleFilter.size > 0 && <button className="link" onClick={onClearRoles}>hammasi</button>}
        <button className="icon-btn only-mobile" onClick={onClose} aria-label="Yopish">✕</button>
      </div>
      <div className="chips">
        {roleNames.map((r) => {
          const on = roleFilter.has(r);
          return (
            <button key={r} className={`chip ${on ? 'on' : ''} ${roleFilter.size && !on ? 'off' : ''}`} onClick={() => onToggleRole(r)} aria-pressed={on}>
              <span className="role-dot" style={{ background: config.roles[r]?.color }} />
              {r}
              <span className="count">{byRole(r)}</span>
            </button>
          );
        })}
      </div>

      <h3>Qavatlar</h3>
      <div className="floors">
        {[...config.floors].reverse().map((f) => {
          const here = visible.filter((s) => s.floor === f);
          const roles = {};
          for (const s of here) {
            const role = staffById.get(s.id)?.role;
            roles[role] = (roles[role] || 0) + 1;
          }
          return (
            <button key={f} className={`floor-row ${floor === f ? 'on' : ''}`} onClick={() => onFloor(floor === f ? 'all' : f)}>
              <span className="floor-num">{f}</span>
              <span className="floor-roles">
                {Object.entries(roles).map(([role, n]) => (
                  <span key={role} className="mini" title={role}><i style={{ background: config.roles[role]?.color }} />{n}</span>
                ))}
                {!here.length && <span className="muted small">hech kim yo'q</span>}
              </span>
              <b>{here.length}</b>
            </button>
          );
        })}
        <div className="floor-total muted small">Binoda: {visible.length} kishi · binodan tashqarida: {config.staff.length - present.length}</div>
      </div>

      <h3>Belgilar</h3>
      <ul className="legend">
        {['yurmoqda', 'turibdi', 'uzoq_harakatsiz', 'signal_yoq'].map((k) => (
          <li key={k}><span className="ring" style={{ borderColor: STATUS_COLORS[k] }} />{STATUS_LABELS[k]}</li>
        ))}
        <li><span className="ring lock">🔒</span>Maxfiy zonada faqat qavat ko'rsatiladi</li>
      </ul>

      {warnings.length > 0 && (
        <details className="warnings">
          <summary>⚠ Ogohlantirishlar ({warnings.length})</summary>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </details>
      )}
    </aside>
  );
}
