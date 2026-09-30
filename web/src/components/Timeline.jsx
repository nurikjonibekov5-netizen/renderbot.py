import { isWorkZone } from '../../../shared/clinic.js';
import { minuteOfDay, formatClock } from '../format.js';

export const SEGMENT_STYLES = {
  work: { color: 'var(--seg-work)', label: 'Ish zonasi' },
  other: { color: 'var(--seg-other)', label: 'Boshqa xona' },
  koridor: { color: 'var(--seg-corridor)', label: 'Koridor' },
  dam_olish: { color: 'var(--seg-rest)', label: 'Dam olish' },
  private: { color: 'var(--seg-private)', label: 'Maxfiy zona' },
  lost: { color: 'var(--seg-lost)', label: 'Signal yo\'q' },
};

export function segmentClass(seg, role, roomById) {
  if (seg.kind === 'lost') return 'lost';
  if (seg.private) return 'private';
  const room = roomById.get(seg.room);
  if (!room) return 'other';
  if (room.type === 'dam_olish') return 'dam_olish';
  if (isWorkZone(role, room)) return 'work';
  if (room.type === 'koridor') return 'koridor';
  return 'other';
}

// Kunlik tasma: xodim qaysi soatda qayerda bo'lgani. To'q rang - harakatda, och - turibdi.
export function Timeline({ segments, role, roomById, now, compact = false }) {
  const startMin = Math.min(7 * 60, ...segments.map((s) => Math.floor(minuteOfDay(s.s) / 60) * 60));
  const endMin = Math.max(21 * 60, ...segments.map((s) => Math.ceil(minuteOfDay(s.e) / 60) * 60));
  const span = endMin - startMin;
  const pos = (t) => ((minuteOfDay(t) - startMin) / span) * 100;
  const hours = [];
  for (let h = startMin / 60; h <= endMin / 60; h += compact ? 3 : 2) hours.push(h);
  return (
    <div className={`timeline ${compact ? 'compact' : ''}`}>
      <div className="tl-bar">
        {segments.map((seg, i) => {
          const cls = segmentClass(seg, role, roomById);
          const room = roomById.get(seg.room);
          const where = seg.kind === 'lost' ? 'Signal yo\'q' : seg.private ? `${seg.floor}-qavat, maxfiy zona` : room?.label ?? '';
          return (
            <div
              key={i}
              className={`tl-seg ${cls} ${seg.moving ? 'moving' : 'still'}`}
              style={{ left: `${pos(seg.s)}%`, width: `${Math.max(0.15, pos(seg.e) - pos(seg.s))}%` }}
              title={`${formatClock(seg.s)}–${formatClock(seg.e)} · ${where} · ${seg.moving ? 'harakatda' : 'turgan'}`}
            />
          );
        })}
        {now != null && <div className="tl-now" style={{ left: `${Math.min(100, pos(now))}%` }} />}
      </div>
      <div className="tl-hours">
        {hours.map((h) => (
          <span key={h} style={{ left: `${((h * 60 - startMin) / span) * 100}%` }}>{String(h).padStart(2, '0')}</span>
        ))}
      </div>
    </div>
  );
}

export function TimelineLegend() {
  return (
    <div className="tl-legend">
      {Object.entries(SEGMENT_STYLES).map(([k, v]) => (
        <span key={k}><i className={`tl-seg ${k} moving`} />{v.label}</span>
      ))}
      <span><i className="tl-seg work still" />och rang — turgan</span>
    </div>
  );
}
