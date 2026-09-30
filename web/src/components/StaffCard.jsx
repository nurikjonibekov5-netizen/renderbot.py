import { useEffect, useState } from 'react';
import { Timeline, TimelineLegend } from './Timeline.jsx';
import { STATUS_COLORS } from '../scene/ClinicScene.js';
import { formatDuration, locationText, pct, activityLevel, STATUS_LABELS, formatClock } from '../format.js';
import { formatMinutes } from '../../../shared/time.js';

// Odamchani bosganda ochiladigan kartochka.
export function StaffCard({ staff, state, summary, role, roomById, source, now, onClose, onFocus }) {
  const [segments, setSegments] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => source.timeline(staff.id).then((r) => alive && setSegments(r.segments)).catch(() => {});
    load();
    const timer = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [staff.id, source]);

  const status = state?.status ?? 'binoda_emas';
  const activity = summary?.activity ?? null;
  const since = state?.present && state.roomSince ? now - state.roomSince : null;
  return (
    <aside className="card" aria-label="Xodim kartochkasi">
      <header className="card-head">
        <span className="role-dot big" style={{ background: role?.color }} />
        <div className="card-title">
          <h2>{staff.name}</h2>
          <div className="muted">{staff.role}{staff.demo ? ' · namuna' : ''}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Yopish">✕</button>
      </header>

      <div className="status-pill" style={{ '--status': STATUS_COLORS[status] }}>
        <span className="dot" /> {STATUS_LABELS[status]}
      </div>

      <dl className="facts">
        <dt>Joylashuv</dt>
        <dd>{locationText(state, roomById)}</dd>
        {since != null && (<><dt>Shu joyda</dt><dd>{formatDuration(since)}</dd></>)}
        {!state?.present && summary?.lastOut && (<><dt>Chiqib ketgan</dt><dd>{formatClock(summary.lastOut)}</dd></>)}
        {summary?.firstIn && (<><dt>Kelgan</dt><dd>{formatClock(summary.firstIn)}</dd></>)}
        <dt>Smena</dt>
        <dd>{formatMinutes(staff.shiftStart)}–{formatMinutes(staff.shiftEnd)}</dd>
      </dl>

      <div className="activity-block">
        <div className="activity-row">
          <span>Bugungi faollik</span>
          <strong className={`lvl-${activityLevel(activity)}`}>{pct(activity)}</strong>
        </div>
        <div className="meter"><div className={`fill lvl-${activityLevel(activity)}`} style={{ width: `${activity ?? 0}%` }} /></div>
        <div className="muted small">Lavozim harakat normasi: {Math.round((role?.norm ?? 0) * 100)}%</div>
      </div>

      {summary && summary.presentMs > 0 && (
        <div className="mini-stats">
          <div><b>{formatDuration(summary.movingMs)}</b><span>harakatda</span></div>
          <div><b>{formatDuration(summary.workMs)}</b><span>ish zonasida</span></div>
          <div><b>{formatDuration(summary.restMs)}</b><span>dam olishda</span></div>
          <div><b>{summary.steps.toLocaleString('ru-RU')}</b><span>qadam (~{(summary.distanceM / 1000).toFixed(1)} km)</span></div>
          <div><b>{summary.roomsVisited}</b><span>xonaga kirgan</span></div>
          <div><b>{summary.idleCount}</b><span>marta uzoq harakatsiz</span></div>
        </div>
      )}

      <div className="card-actions">
        <button className="btn" onClick={onFocus} disabled={!state?.present}>📍 Xaritada ko'rsatish</button>
      </div>

      <h3>Kunlik tasma</h3>
      {segments ? (
        segments.length ? (
          <>
            <Timeline segments={segments} role={role} roomById={roomById} now={now} />
            <TimelineLegend />
          </>
        ) : <p className="muted small">Bugun hali binoga kirmagan.</p>
      ) : <p className="muted small">Yuklanmoqda…</p>}
    </aside>
  );
}
