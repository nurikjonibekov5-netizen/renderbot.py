import { Icon } from '../components/icons.jsx';
import { formatClock } from '../format.js';

// Ingichka tepa panel: logotip, qidiruv, vaqt, tezlik, voqealar, chiqish.
export function TopBar({ search, bell, snapshot, speeds, onSpeed, conn, isLive, onLogout, onHome }) {
  return (
    <header className="topbar">
      <button className="logo" onClick={onHome} aria-label="Bosh sahifa" title="Bosh sahifa">
        <span className="brand-mark">+</span>
      </button>
      {search}
      <div className="tb-right">
        <div className="clock" title={conn.state === 'ulangan' ? 'Server bilan aloqa bor' : conn.state}>
          <i className={`conn ${conn.state}`} />
          <b>{snapshot ? formatClock(snapshot.t) : '--:--'}</b>
          {snapshot?.mode === 'simulyatsiya' && <small>{snapshot.demoDay ? 'namuna kun' : 'simulyatsiya'}</small>}
        </div>
        {speeds?.length > 0 && snapshot && (
          <select className="speed" value={snapshot.speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Simulyatsiya tezligi" title="Simulyatsiya tezligi">
            {speeds.map((v) => <option key={v} value={v}>{v}× tezlik</option>)}
          </select>
        )}
        {bell}
        {isLive && (
          <button className="icon-btn" onClick={onLogout} title="Chiqish" aria-label="Chiqish"><Icon name="logout" /></button>
        )}
      </div>
    </header>
  );
}
