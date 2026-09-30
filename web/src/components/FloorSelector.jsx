import { Icon } from './icons.jsx';

// O'ng tomondagi qavat tanlagich: Bino (tashqi ko'rinish), 4F..1F, Barchasi.
export function FloorSelector({ floors, view, counts, onChange }) {
  const desc = [...floors].sort((a, b) => b - a);
  const isOn = (mode, f) => view.mode === mode && (mode !== 'floor' || view.floor === f);
  return (
    <nav className="floor-selector" aria-label="Qavatlar">
      <button className={`fs-btn icon ${isOn('overview') ? 'on' : ''}`} onClick={() => onChange('overview')} title="Bino (tashqi ko'rinish)" aria-label="Bino">
        <Icon name="building" size={18} />
      </button>
      <div className="fs-sep" />
      {desc.map((f) => (
        <button key={f} className={`fs-btn ${isOn('floor', f) ? 'on' : ''}`} onClick={() => onChange('floor', f)} aria-label={`${f}-qavat`} title={`${f}-qavat`}>
          <span className="fs-num">{f}F</span>
          <span className="fs-count">{counts.get(f) || 0}</span>
        </button>
      ))}
      <div className="fs-sep" />
      <button className={`fs-btn icon ${isOn('all') ? 'on' : ''}`} onClick={() => onChange('all')} title="Barcha qavatlar" aria-label="Barchasi">
        <Icon name="layers" size={18} />
      </button>
    </nav>
  );
}
