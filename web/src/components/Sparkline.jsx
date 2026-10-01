// Kichik chiziqli grafik: bitta qator, maydon bilan, oxirgi nuqta ajratilgan.
// Sichqonchani ustiga olib borsangiz, o'sha vaqtdagi qiymat chiqadi.
import { useState } from 'react';
import { formatClock } from '../format.js';

export function Sparkline({ points, field, width = 76, height = 26, label }) {
  const [hover, setHover] = useState(null);
  if (!points || points.length < 2) return <svg className="spark" width={width} height={height} aria-hidden="true" />;
  const vals = points.map((p) => p[field]);
  const max = Math.max(1, ...vals);
  const x = (i) => 2 + (i / (points.length - 1)) * (width - 6);
  const y = (v) => height - 3 - (v / max) * (height - 7);
  const line = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${x(0)},${height - 2} ${line} ${x(vals.length - 1)},${height - 2}`;
  const last = vals.length - 1;
  const hi = hover ?? last;
  return (
    <span className="spark-wrap">
      <svg
        className="spark"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}: bugungi o'zgarish`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const k = (e.clientX - r.left) / r.width;
          setHover(Math.max(0, Math.min(last, Math.round(k * last))));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <polygon points={area} className="spark-area" />
        <polyline points={line} className="spark-line" />
        {hover != null && <line x1={x(hi)} x2={x(hi)} y1="2" y2={height - 2} className="spark-cross" />}
        <circle cx={x(hi)} cy={y(vals[hi])} r="2.6" className="spark-dot" />
      </svg>
      {hover != null && <span className="spark-tip">{formatClock(points[hi].t)} · <b>{vals[hi]}</b></span>}
    </span>
  );
}
