import { Icon } from '../components/icons.jsx';

const NAV = [
  { id: 'bino', icon: 'building', label: 'Bino ko\'rinishi', hint: '3D raqamli egizak' },
  { id: 'xodimlar', icon: 'users', label: 'Xodimlar', hint: 'bugungi jadval' },
  { id: 'faollik', icon: 'activity', label: 'Faollik', hint: 'kunlik tasma' },
  { id: 'hisobot', icon: 'report', label: 'Hisobot', hint: 'Excel yuklash' },
  { id: 'sozlamalar', icon: 'settings', label: 'Sozlamalar', hint: 'keyingi bosqich', disabled: true },
];

// Chap panel: logotip, bo'limlar menyusi, filtrlar.
export function SidePanel({ active, onNav, children, footer }) {
  return (
    <aside className="sidepanel">
      <div className="brand">
        <div className="brand-mark">+</div>
        <div>
          <b>Klinika 3D</b>
          <small>Raqamli egizak</small>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${active === n.id ? 'on' : ''}`} onClick={() => onNav(n.id)} disabled={n.disabled}>
            <span className="nav-ico"><Icon name={n.icon} size={17} /></span>
            <span className="nav-txt"><b>{n.label}</b><small>{n.hint}</small></span>
          </button>
        ))}
      </nav>
      <div className="side-scroll">{children}</div>
      {footer && <div className="side-foot">{footer}</div>}
    </aside>
  );
}
