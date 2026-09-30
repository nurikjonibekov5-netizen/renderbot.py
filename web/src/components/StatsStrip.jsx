import { Icon } from './icons.jsx';
import { initials } from './SearchBar.jsx';

// Pastki statistika qatori (1-rasmdagi "Data" qatori ruhida).
export function StatsStrip({ config, snapshot, today, roleFilter, onFloor, onSelect, onOpenTable }) {
  const staffById = new Map(config.staff.map((s) => [s.id, s]));
  const visible = (id) => !roleFilter.size || roleFilter.has(staffById.get(id)?.role);
  const present = (snapshot?.staff ?? []).filter((s) => s.present && visible(s.id));
  const moving = present.filter((s) => s.status === 'yurmoqda').length;
  const rows = (today?.rows ?? []).filter((r) => r.activity != null && visible(r.id));
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.activity, 0) / rows.length) : null;
  const top = [...rows].sort((a, b) => b.activity - a.activity).slice(0, 6);
  const floors = [...config.floors].sort((a, b) => a - b);
  return (
    <section className="stats-strip" aria-label="Bugungi statistika">
      <div className="ss-title">
        <b>Bugun</b>
        <small>statistika</small>
      </div>
      {floors.map((f) => {
        const n = present.filter((s) => s.floor === f).length;
        return (
          <button key={f} className="ss-item" onClick={() => onFloor(f)} title={`${f}-qavatga o'tish`}>
            <small>{f}-qavat</small>
            <b>{n}</b>
            <span className="ss-bar"><i style={{ width: `${present.length ? (n / present.length) * 100 : 0}%` }} /></span>
          </button>
        );
      })}
      <div className="ss-item static">
        <small>Harakatda</small>
        <b>{moving}<em>/{present.length}</em></b>
      </div>
      <div className="ss-item static">
        <small>O'rtacha faollik</small>
        <b>{avg == null ? '—' : `${avg}%`}</b>
      </div>
      <div className="ss-top">
        <small>TOP faol</small>
        <div className="ss-avatars">
          {top.map((r) => {
            const s = staffById.get(r.id);
            return (
              <button key={r.id} className="avatar sm" style={{ '--role': config.roles[s.role]?.color }} title={`${s.name} — ${r.activity}%`} onClick={() => onSelect(r.id)}>
                {initials(s.name)}
              </button>
            );
          })}
        </div>
      </div>
      <button className="ss-more" onClick={onOpenTable}>
        Jadval <Icon name="chevron" size={16} />
      </button>
    </section>
  );
}
