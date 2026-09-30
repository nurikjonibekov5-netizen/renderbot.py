import { Icon } from '../components/icons.jsx';
import { formatClock } from '../format.js';

const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

// Tepa panel: sarlavha, qidiruv, asosiy ko'rsatkichlar, vaqt va boshqaruv.
export function TopBar({ search, snapshot, speeds, onSpeed, conn, isLive, onLogout }) {
  const present = (snapshot?.staff ?? []).filter((s) => s.present);
  const moving = present.filter((s) => s.status === 'yurmoqda').length;
  const lost = present.filter((s) => s.status === 'signal_yoq').length;
  const idle = present.filter((s) => s.status === 'uzoq_harakatsiz').length;
  const d = snapshot ? new Date(snapshot.t + 5 * 3600 * 1000) : null;
  return (
    <header className="topbar">
      <div className="tb-title">
        <h1>Klinika nazorati</h1>
        <small>{d ? `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}` : ''}</small>
      </div>
      {search}
      <div className="kpis">
        <div className="kpi"><i className="tri" /><b>{present.length}</b><small>binoda</small></div>
        <div className="kpi"><i className="dot green" /><b>{moving}</b><small>harakatda</small></div>
        <div className="kpi"><i className="dot amber" /><b>{idle}</b><small>harakatsiz</small></div>
        <div className="kpi"><i className="dot grey" /><b>{lost}</b><small>signal yo'q</small></div>
      </div>
      <div className="tb-right">
        <div className="clock" title={conn.state}>
          <i className={`conn ${conn.state}`} />
          <b>{snapshot ? formatClock(snapshot.t) : '--:--'}</b>
          {snapshot?.mode === 'simulyatsiya' && <small>{snapshot.demoDay ? 'namuna kun' : 'simulyatsiya'}</small>}
        </div>
        {speeds?.length > 0 && snapshot && (
          <select className="speed" value={snapshot.speed} onChange={(e) => onSpeed(Number(e.target.value))} aria-label="Simulyatsiya tezligi" title="Simulyatsiya tezligi">
            {speeds.map((v) => <option key={v} value={v}>{v}×</option>)}
          </select>
        )}
        {isLive && (
          <button className="icon-btn" onClick={onLogout} title="Chiqish" aria-label="Chiqish"><Icon name="logout" /></button>
        )}
      </div>
    </header>
  );
}
