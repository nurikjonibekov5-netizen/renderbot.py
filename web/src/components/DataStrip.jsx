import { Icon } from './icons.jsx';
import { initials } from './SearchBar.jsx';
import { Sparkline } from './Sparkline.jsx';

// Pastki "Data" qatori (1-rasmdagi kabi): ko'rsatkich, kichik grafik va bir soatlik o'zgarish.
function delta(series, field, hours = 1) {
  if (!series || series.length < 2) return null;
  const last = series[series.length - 1];
  const ago = series.filter((p) => p.t <= last.t - hours * 3600 * 1000).pop();
  if (!ago) return null;
  return last[field] - ago[field];
}

function Metric({ label, value, series, field, invert = false }) {
  const d = series ? delta(series, field) : null;
  const good = d == null || d === 0 ? 'flat' : (d > 0) !== invert ? 'up' : 'down';
  return (
    <div className="ds-metric">
      <div className="ds-text">
        <small>{label}</small>
        <b>{value}</b>
      </div>
      {series && <Sparkline points={series} field={field} label={label} />}
      {d != null && <span className={`ds-delta ${good}`}>{d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : '±0'}</span>}
    </div>
  );
}

export function DataStrip({ config, snapshot, today, roleFilter, onSelect, onOpenTable }) {
  const staffById = new Map(config.staff.map((s) => [s.id, s]));
  const visible = (id) => !roleFilter.size || roleFilter.has(staffById.get(id)?.role);
  const present = (snapshot?.staff ?? []).filter((s) => s.present && visible(s.id));
  const moving = present.filter((s) => s.status === 'yurmoqda').length;
  const idle = present.filter((s) => s.status === 'uzoq_harakatsiz').length;
  const lost = present.filter((s) => s.status === 'signal_yoq').length;
  const rows = (today?.rows ?? []).filter((r) => r.activity != null && visible(r.id));
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.activity, 0) / rows.length) : null;
  const top = [...rows].sort((a, b) => b.activity - a.activity).slice(0, 10);
  const series = roleFilter.size ? null : today?.series;
  return (
    <section className="data-strip" aria-label="Bugungi statistika">
      <div className="ds-title">
        <b>Data</b>
        <small>bugungi statistika</small>
      </div>
      <Metric label="Binoda" value={present.length} series={series} field="present" />
      <Metric label="Harakatda" value={moving} series={series} field="moving" />
      <Metric label="Harakatsiz" value={idle} />
      <Metric label="Signal yo'q" value={lost} series={series} field="lost" invert />
      <Metric label="O'rtacha faollik" value={avg == null ? '—' : `${avg}%`} />
      <div className="ds-top">
        <span className="ds-top-label"><i>★</i>TOP {top.length}</span>
        <div className="ds-avatars">
          {top.map((r, i) => {
            const s = staffById.get(r.id);
            return (
              <button key={r.id} className="avatar sm" style={{ '--role': config.roles[s.role]?.color }} title={`${i + 1}. ${s.name} — ${r.activity}%`} onClick={() => onSelect(r.id)}>
                {initials(s.name)}
                <em>{i + 1}</em>
              </button>
            );
          })}
        </div>
        <button className="ds-next" onClick={onOpenTable} aria-label="To'liq jadval" title="To'liq jadval"><Icon name="chevron" size={18} /></button>
      </div>
    </section>
  );
}
