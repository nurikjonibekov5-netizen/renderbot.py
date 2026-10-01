import { useEffect, useMemo, useState } from 'react';
import { Timeline, TimelineLegend } from './Timeline.jsx';
import { pct, activityLevel } from '../format.js';
import { exportExcel } from '../excel.js';

const COLUMNS = [
  { key: 'name', label: 'Xodim', get: (r) => r.staff.name },
  { key: 'role', label: 'Lavozim', get: (r) => r.staff.role },
  { key: 'activity', label: 'Faollik', get: (r) => r.activity ?? -1 },
];

// "Bugun" paneli: barcha xodimlar faollik bo'yicha saralangan jadval va kunlik tasmalar.
export function TodayPanel({ config, today, roleFilter, source, onSelect, selectedId, onClose, initialTab = 'table' }) {
  const [tab, setTab] = useState(initialTab);
  const [sort, setSort] = useState({ key: 'activity', dir: -1 });
  const [timelines, setTimelines] = useState({});
  const [exporting, setExporting] = useState(false);
  const staffById = useMemo(() => new Map(config.staff.map((s) => [s.id, s])), [config]);
  const roomById = useMemo(() => new Map(config.rooms.map((r) => [r.id, r])), [config]);

  const rows = useMemo(() => {
    const list = (today?.rows ?? [])
      .map((r) => ({ ...r, staff: staffById.get(r.id) }))
      .filter((r) => r.staff && (!roleFilter.size || roleFilter.has(r.staff.role)));
    const col = COLUMNS.find((c) => c.key === sort.key);
    return list.sort((a, b) => {
      const x = col.get(a);
      const y = col.get(b);
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
    });
  }, [today, staffById, roleFilter, sort]);

  useEffect(() => {
    if (tab !== 'timeline') return undefined;
    let alive = true;
    const load = async () => {
      const entries = await Promise.all(config.staff.map((s) => source.timeline(s.id).then((r) => [s.id, r.segments]).catch(() => [s.id, []])));
      if (alive) setTimelines(Object.fromEntries(entries));
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [tab, config, source]);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportExcel({ config, today, source });
    } catch (err) {
      alert(`Excel faylni yaratib bo'lmadi: ${err.message || err}`);
    } finally {
      setExporting(false);
    }
  };

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : key === 'name' || key === 'role' ? 1 : -1 }));

  return (
    <section className="today" aria-label="Bugungi faollik">
      <header className="today-head">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'table'} className={tab === 'table' ? 'on' : ''} onClick={() => setTab('table')}>Bugun</button>
          <button role="tab" aria-selected={tab === 'timeline'} className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>Kunlik tasma</button>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={onExport} disabled={exporting || !today}>{exporting ? 'Tayyorlanmoqda…' : 'Excel yuklash'}</button>
        <button className="icon-btn" onClick={onClose} aria-label="Yopish">✕</button>
      </header>

      {tab === 'table' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} onClick={() => toggleSort(c.key)} className={sort.key === c.key ? 'sorted' : ''}>
                    {c.label}{sort.key === c.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} onClick={() => onSelect(r.id)} className={r.id === selectedId ? 'selected' : ''}>
                  <td className="muted">{i + 1}</td>
                  <td className="name"><span className="role-dot" style={{ background: config.roles[r.staff.role]?.color }} />{r.staff.name}</td>
                  <td className="muted">{r.staff.role}</td>
                  <td>
                    <div className="act-cell">
                      <div className="meter small"><div className={`fill lvl-${activityLevel(r.activity)}`} style={{ width: `${r.activity ?? 0}%` }} /></div>
                      <b className={`lvl-${activityLevel(r.activity)}`}>{pct(r.activity)}</b>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small note">Faollik foizi lavozim normasiga nisbatan hisoblanadi va faqat yordamchi ko'rsatkich.</p>
        </div>
      ) : (
        <div className="tl-list">
          <TimelineLegend />
          {rows.map((r) => (
            <div key={r.id} className={`tl-row ${r.id === selectedId ? 'selected' : ''}`} onClick={() => onSelect(r.id)}>
              <div className="tl-name"><span className="role-dot" style={{ background: config.roles[r.staff.role]?.color }} />{r.staff.name}</div>
              {timelines[r.id] ? (
                <Timeline segments={timelines[r.id]} role={config.roles[r.staff.role]} roomById={roomById} now={today?.t} compact />
              ) : <div className="muted small">…</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
