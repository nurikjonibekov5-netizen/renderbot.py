import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ClinicScene } from './scene/ClinicScene.js';
import { DemoSource, LiveSource, logout } from './data-source.js';
import { Sidebar } from './components/Sidebar.jsx';
import { StaffCard } from './components/StaffCard.jsx';
import { TodayPanel } from './components/TodayPanel.jsx';
import { Login } from './components/Login.jsx';
import { formatClock, locationText, searchStaff } from './format.js';

const isDemo = () => __DEMO__ || new URLSearchParams(location.search).has('demo');

function modelWarnings(info) {
  if (!info || info.source !== 'model') return [];
  const out = [];
  for (const f of info.floors) {
    if (!f.ok) {
      out.push(`${f.floor}-qavat modeli ochilmadi: ${f.error}. Avtomatik chizma ko'rsatilmoqda.`);
      continue;
    }
    if (f.missing.length) out.push(`${f.floor}-qavat modelida topilmagan xonalar: ${f.missing.join(', ')}.`);
    if (f.extra.length) out.push(`${f.floor}-qavat modelida ro'yxatda yo'q xonalar: ${f.extra.join(', ')}.`);
    if (f.wrongFloor.length) out.push(`${f.floor}-qavat modelida boshqa qavat nomli xonalar: ${f.wrongFloor.join(', ')}.`);
  }
  return out;
}

// Ekranning panellar bilan yopilgan qismlari: kamera markazni shunga qarab suradi.
function measureInsets(stage) {
  const box = stage.getBoundingClientRect();
  const mobile = box.width <= 820;
  const rect = (sel) => stage.querySelector(sel)?.getBoundingClientRect() ?? null;
  const side = rect('.sidebar');
  const card = rect('.card');
  const today = rect('.today');
  const insets = { left: 0, right: 0, top: 0, bottom: 0 };
  if (!mobile && side) insets.left = side.right - box.left;
  if (!mobile && card) insets.right = box.right - card.left;
  const bottoms = [today, mobile ? card : null].filter(Boolean).map((r) => box.bottom - r.top);
  if (bottoms.length) insets.bottom = Math.max(...bottoms);
  return insets;
}

export default function App() {
  const [source, setSource] = useState(() => (isDemo() ? new DemoSource() : new LiveSource()));
  const [phase, setPhase] = useState('loading');
  const [config, setConfig] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [today, setToday] = useState(null);
  const [conn, setConn] = useState({ state: 'ulanmoqda' });
  const [selectedId, setSelectedId] = useState(null);
  const [floor, setFloor] = useState('all');
  const [roleFilter, setRoleFilter] = useState(() => new Set());
  const [todayOpen, setTodayOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const sceneBox = useRef(null);
  const scene = useRef(null);
  const stageRef = useRef(null);

  const say = useCallback((text) => {
    setToast({ text, id: Math.random() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    source.start({
      onConfig: (cfg) => {
        setConfig(cfg);
        setPhase('ready');
      },
      onSnapshot: setSnapshot,
      onToday: setToday,
      onStatus: (state, detail) => setConn({ state, detail }),
      onAuthRequired: () => setPhase('login'),
    });
    return () => source.stop();
  }, [source]);

  // 3D sahna config kelgandan keyin bir marta yaratiladi.
  useEffect(() => {
    if (!config || !sceneBox.current) return undefined;
    const s = new ClinicScene(sceneBox.current, {
      onSelect: (id) => setSelectedId(id),
      onModelInfo: setModelInfo,
    });
    if (stageRef.current) s.setInsets(measureInsets(stageRef.current));
    s.setConfig(config);
    scene.current = s;
    window.__klinika = s;
    return () => {
      s.dispose();
      scene.current = null;
    };
  }, [config]);

  useEffect(() => { if (snapshot) scene.current?.update(snapshot); }, [snapshot]);

  // Kamera panellar ostida qolgan joyni hisobga olsin (kartochka, jadval, chap panel).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => scene.current?.setInsets(measureInsets(stage));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [config, selectedId, todayOpen]);
  useEffect(() => { scene.current?.setSelected(selectedId); }, [selectedId, config]);
  useEffect(() => { scene.current?.setRoleFilter(roleFilter); }, [roleFilter, config]);

  const staffById = useMemo(() => new Map((config?.staff ?? []).map((s) => [s.id, s])), [config]);
  const roomById = useMemo(() => new Map((config?.rooms ?? []).map((r) => [r.id, r])), [config]);
  const stateById = useMemo(() => new Map((snapshot?.staff ?? []).map((s) => [s.id, s])), [snapshot]);
  const summaryById = useMemo(() => new Map((today?.rows ?? []).map((r) => [r.id, r])), [today]);
  const suggestions = useMemo(() => (config ? searchStaff(config.staff, query).slice(0, 6) : []), [config, query]);

  const chooseFloor = (f) => {
    setFloor(f);
    scene.current?.setFloor(f);
  };

  const focus = (id) => {
    const st = stateById.get(id);
    const s = staffById.get(id);
    if (!st?.present) {
      say(`${s?.name ?? 'Xodim'} hozir binoda emas.`);
      return;
    }
    const f = scene.current?.focusStaff(id);
    if (f) setFloor(f);
    if (st.private) say(`${s.name}: ${st.floor}-qavat, maxfiy zonada.`);
  };

  const select = (id, { fly = false } = {}) => {
    setSelectedId(id);
    if (id && fly) focus(id);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const found = suggestions[0];
    if (!found) {
      if (query.trim()) say('Hech kim topilmadi.');
      return;
    }
    select(found.id, { fly: true });
    setSuggestOpen(false);
    setQuery('');
    document.activeElement?.blur();
  };

  const toggleRole = (r) => setRoleFilter((prev) => {
    const next = new Set(prev);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    return next;
  });

  const changeSpeed = async (v) => {
    try {
      await source.setSpeed(Number(v));
    } catch (err) {
      say(`Tezlikni o'zgartirib bo'lmadi: ${err.message}`);
    }
  };

  if (phase === 'login') {
    return <Login onDone={() => { setPhase('loading'); setSource(new LiveSource()); }} />;
  }
  if (phase === 'loading' || !config) {
    return (
      <div className="splash">
        <div className="brand-mark big">+</div>
        <p>{conn.state === 'xato' ? `Serverga ulanib bo'lmadi: ${conn.detail}. Qayta urinilmoqda…` : 'Yuklanmoqda…'}</p>
      </div>
    );
  }

  const selected = selectedId ? staffById.get(selectedId) : null;
  const warnings = [...(config.warnings ?? []), ...modelWarnings(modelInfo)];
  const modelNote = modelInfo?.source === 'model'
    ? `3D model: ${modelInfo.floors.filter((f) => f.ok).map((f) => `${f.floor}`).join(', ')}-qavat 3ds Max faylidan`
    : '3D model: avtomatik chizma (3ds Max fayllari hali qo\'yilmagan)';

  return (
    <div className={`app ${todayOpen ? 'with-today' : ''} ${selected ? 'with-card' : ''}`}>
      <header className="topbar">
        <button className="icon-btn only-mobile" onClick={() => setSidebarOpen((v) => !v)} aria-label="Filtr">☰</button>
        <div className="brand">
          <div className="brand-mark">+</div>
          <div>
            <div className="brand-name">Klinika 3D</div>
            <div className="brand-sub">
              <span className={`conn ${conn.state}`} title={conn.state} />
              {snapshot ? formatClock(snapshot.t) : '--:--'}
              {snapshot?.mode === 'simulyatsiya' && <span className="badge">{snapshot.demoDay ? 'namuna kun' : 'simulyatsiya'}</span>}
              {config.demo && <span className="badge alt">telefon namunasi</span>}
            </div>
          </div>
        </div>

        <form className="search" onSubmit={submitSearch} role="search">
          <input
            type="search"
            placeholder="Kim qayerda? Masalan: Dilnoza"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            aria-label="Xodimni qidirish"
          />
          {suggestOpen && suggestions.length > 0 && (
            <ul className="suggest">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { select(s.id, { fly: true }); setSuggestOpen(false); setQuery(''); }}>
                    <span className="role-dot" style={{ background: config.roles[s.role]?.color }} />
                    <span className="sg-name">{s.name}</span>
                    <span className="muted small">{locationText(stateById.get(s.id), roomById)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="floor-switch" role="group" aria-label="Qavat">
          <button className={floor === 'all' ? 'on' : ''} onClick={() => chooseFloor('all')}>Hammasi</button>
          {config.floors.map((f) => (
            <button key={f} className={floor === f ? 'on' : ''} onClick={() => chooseFloor(f)}>{f}</button>
          ))}
        </div>

        <div className="top-actions">
          {config.speeds?.length > 0 && snapshot && (
            <select value={snapshot.speed} onChange={(e) => changeSpeed(e.target.value)} aria-label="Simulyatsiya tezligi" title="Simulyatsiya tezligi">
              {config.speeds.map((v) => <option key={v} value={v}>{v}× tezlik</option>)}
            </select>
          )}
          <button className={`btn ${todayOpen ? 'primary' : ''}`} onClick={() => setTodayOpen((v) => !v)}>📊 Bugun</button>
          {source.kind === 'live' && (
            <button className="icon-btn" title="Chiqish" aria-label="Chiqish" onClick={async () => { await logout(); location.reload(); }}>⎋</button>
          )}
        </div>
      </header>

      <main className="stage" ref={stageRef}>
        <div className="scene" ref={sceneBox} />
        <div className="model-note muted small">{modelNote}</div>
        {conn.state === 'uzildi' && <div className="banner">Server bilan aloqa uzildi, qayta ulanmoqda…</div>}
        <Sidebar
          config={config}
          snapshot={snapshot}
          roleFilter={roleFilter}
          onToggleRole={toggleRole}
          onClearRoles={() => setRoleFilter(new Set())}
          floor={floor}
          onFloor={chooseFloor}
          warnings={warnings}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        {selected && (
          <StaffCard
            key={selected.id}
            staff={selected}
            state={stateById.get(selected.id)}
            summary={summaryById.get(selected.id)}
            role={config.roles[selected.role]}
            roomById={roomById}
            source={source}
            now={snapshot?.t}
            onClose={() => setSelectedId(null)}
            onFocus={() => focus(selected.id)}
          />
        )}
        {todayOpen && (
          <TodayPanel
            config={config}
            today={today}
            roleFilter={roleFilter}
            source={source}
            selectedId={selectedId}
            onSelect={(id) => select(id, { fly: true })}
            onClose={() => setTodayOpen(false)}
          />
        )}
        {toast && <div className="toast" key={toast.id}>{toast.text}</div>}
      </main>
    </div>
  );
}

