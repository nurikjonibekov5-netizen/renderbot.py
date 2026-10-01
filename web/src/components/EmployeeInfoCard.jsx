import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';
import { initials } from './SearchBar.jsx';
import { Timeline, TimelineLegend } from './Timeline.jsx';
import { STATUS_COLORS } from '../scene/engine/palette.js';
import { formatDuration, formatClock, pct, activityLevel, STATUS_LABELS, minuteOfDay } from '../format.js';
import { formatMinutes } from '../../../shared/time.js';

// Qisqa vaqt: "17 daq" yoki "1:26 soat" (kichik blokka sig'ishi uchun).
function compact(ms) {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} daq` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} soat`;
}

// Odamchani bosganda chapdan chiqadigan xodim paneli (5-rasm uslubida, kompyuterga moslangan).
export function EmployeeInfoCard({ staff, state, summary, role, roomById, source, now, onClose, onFocus }) {
  const [segments, setSegments] = useState(null);
  useEffect(() => {
    let alive = true;
    setSegments(null);
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
  const room = state?.room ? roomById.get(state.room) : null;
  const where = !state?.present ? 'Binoda emas' : state.private ? 'Maxfiy zona' : room?.label ?? '—';
  const nowMin = now ? minuteOfDay(now) : 0;
  const shiftPct = Math.max(0, Math.min(100, ((nowMin - staff.shiftStart) / (staff.shiftEnd - staff.shiftStart)) * 100));

  return (
    <aside className="emp-card" aria-label="Xodim ma'lumotlari">
      <header className="emp-hero" style={{ '--role': role?.color }}>
        <div className="emp-hero-top">
          <button className="hero-btn" onClick={onClose} aria-label="Yopish"><Icon name="close" size={16} /></button>
          <button className="hero-btn" onClick={onFocus} disabled={!state?.present} aria-label="Xaritada ko'rsatish" title="Xaritada ko'rsatish"><Icon name="pin" size={16} /></button>
        </div>
        <div className="emp-avatar" aria-hidden="true">
          <span>{initials(staff.name)}</span>
        </div>
        <h2>{staff.name}</h2>
        <div className="emp-sub">
          <span>{staff.role}{staff.demo ? ' · namuna' : ''}</span>
          <span className="status-chip" style={{ '--status': STATUS_COLORS[status] }}><i />{STATUS_LABELS[status]}</span>
        </div>
      </header>

      <div className="emp-stats">
        <div>
          <span className="st-ico"><Icon name="pulse" size={16} /></span>
          <b className={`lvl-${activityLevel(activity)}`}>{pct(activity)}</b>
          <small>Bugungi faollik</small>
        </div>
        <div>
          <span className="st-ico"><Icon name="clock" size={16} /></span>
          <b>{since != null ? compact(since) : '—'}</b>
          <small>Shu joyda</small>
        </div>
        <div>
          <span className="st-ico"><Icon name="activity" size={16} /></span>
          <b>{summary ? compact(summary.movingMs) : '—'}</b>
          <small>Harakatda</small>
        </div>
      </div>

      <div className="emp-body">
        <section>
          <h3>Joylashuv</h3>
          <div className="loc-rows">
            <div className="loc-row"><span className="loc-ico"><Icon name="layers" size={15} /></span><span>Qavat</span><b>{state?.present ? `${state.floor}-qavat` : '—'}</b></div>
            <div className="loc-row"><span className="loc-ico"><Icon name="door" size={15} /></span><span>Xona</span><b>{where}</b></div>
          </div>
        </section>

        <section>
          <h3>Smena</h3>
          <div className="shift">
            <div className="shift-pills">
              <span className="pill on">{formatMinutes(staff.shiftStart)} – {formatMinutes(staff.shiftEnd)}</span>
              {summary?.firstIn && <span className="pill">Kelgan {formatClock(summary.firstIn)}</span>}
              {!state?.present && summary?.lastOut && <span className="pill">Ketgan {formatClock(summary.lastOut)}</span>}
            </div>
            <div className="shift-bar"><i style={{ width: `${shiftPct}%` }} /></div>
          </div>
        </section>

        <section>
          <h3>Bugungi faollik</h3>
          <div className="meter"><div className={`fill lvl-${activityLevel(activity)}`} style={{ width: `${activity ?? 0}%` }} /></div>
          <div className="muted small">Lavozim harakat normasi: {Math.round((role?.norm ?? 0) * 100)}% · foiz yordamchi ko'rsatkich</div>
          {summary && summary.presentMs > 0 && (
            <div className="mini-grid">
              <div><b>{summary.roomsVisited}</b><small>xonaga kirgan</small></div>
              <div><b>{formatDuration(summary.workMs)}</b><small>ish zonasida</small></div>
              <div><b>{formatDuration(summary.restMs)}</b><small>dam olishda</small></div>
              <div><b>{summary.idleCount} marta</b><small>uzoq harakatsiz</small></div>
            </div>
          )}
        </section>

        <section>
          <h3>Kunlik tasma</h3>
          {segments ? (
            segments.length ? (
              <>
                <Timeline segments={segments} role={role} roomById={roomById} now={now} />
                <TimelineLegend />
              </>
            ) : <p className="muted small">Bugun hali binoga kirmagan.</p>
          ) : <p className="muted small">Yuklanmoqda…</p>}
        </section>
      </div>

      <footer className="emp-foot">
        <button className="cta" onClick={onFocus} disabled={!state?.present}>
          <Icon name="pin" size={17} /> Xaritada ko'rsatish
        </button>
      </footer>
    </aside>
  );
}
