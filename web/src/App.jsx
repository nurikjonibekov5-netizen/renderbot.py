import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useClinicData } from './state/useClinicData.js';
import { logout } from './data-source.js';
import { AppLayout } from './layout/AppLayout.jsx';
import { TopBar } from './layout/TopBar.jsx';
import { SidePanel } from './layout/SidePanel.jsx';
import { BuildingScene } from './scene/BuildingScene.jsx';
import { FloorSelector } from './components/FloorSelector.jsx';
import { SearchBar } from './components/SearchBar.jsx';
import { FiltersPanel } from './components/FiltersPanel.jsx';
import { EmployeeInfoCard } from './components/EmployeeInfoCard.jsx';
import { StatsStrip } from './components/StatsStrip.jsx';
import { ViewHeader } from './components/ViewHeader.jsx';
import { TodayPanel } from './components/TodayPanel.jsx';
import { Login } from './components/Login.jsx';
import { exportExcel } from './excel.js';

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

// Sahnaning panellar bilan yopilgan qismlari: kamera bo'sh joy markaziga qaraydi.
function measureInsets(stage) {
  const box = stage.getBoundingClientRect();
  const rect = (sel) => stage.querySelector(sel)?.getBoundingClientRect() ?? null;
  const card = rect('.emp-card');
  const selector = rect('.floor-selector');
  const strip = rect('.stats-strip');
  const today = rect('.today');
  const header = rect('.view-header');
  return {
    left: card ? card.right - box.left + 8 : 0,
    right: selector ? box.right - selector.left + 8 : 0,
    top: header ? Math.min(header.bottom - box.top, 140) * 0.6 : 0,
    bottom: Math.max(strip ? box.bottom - strip.top + 8 : 0, today ? box.bottom - today.top + 8 : 0),
  };
}

export default function App() {
  const data = useClinicData();
  const { source, phase, config, snapshot, today, conn, staffById, roomById, stateById, summaryById } = data;
  const [view, setView] = useState({ mode: 'overview', floor: null });
  const [selectedId, setSelectedId] = useState(null);
  const [roleFilter, setRoleFilter] = useState(() => new Set());
  const [panel, setPanel] = useState(null);
  const [hoverFloor, setHoverFloor] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [toast, setToast] = useState(null);
  const [insets, setInsets] = useState(null);
  const sceneRef = useRef(null);
  const stageRef = useRef(null);

  const say = useCallback((text) => setToast({ text, id: Math.random() }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const measure = () => setInsets((prev) => {
      const next = measureInsets(stage);
      return prev && Object.keys(next).every((k) => Math.round(prev[k]) === Math.round(next[k])) ? prev : next;
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    const card = stage.querySelector('.emp-card');
    if (card) ro.observe(card);
    return () => ro.disconnect();
  }, [config, selectedId, panel]);

  const counts = useMemo(() => {
    const m = new Map();
    for (const st of snapshot?.staff ?? []) {
      if (!st.present) continue;
      if (roleFilter.size && !roleFilter.has(staffById.get(st.id)?.role)) continue;
      m.set(st.floor, (m.get(st.floor) || 0) + 1);
    }
    return m;
  }, [snapshot, roleFilter, staffById]);

  const changeView = (mode, floor = null) => sceneRef.current?.setView(mode, floor);

  const focus = (id) => {
    const st = stateById.get(id);
    const s = staffById.get(id);
    if (!st?.present) {
      say(`${s?.name ?? 'Xodim'} hozir binoda emas.`);
      return;
    }
    sceneRef.current?.focusStaff(id);
    if (st.private) say(`${s.name}: ${st.floor}-qavat, maxfiy zonada (aniq xona ko'rsatilmaydi).`);
  };

  const select = (id, { fly = false } = {}) => {
    setSelectedId(id);
    if (id && fly) focus(id);
  };

  const onNav = async (id) => {
    if (id === 'bino') {
      setPanel(null);
      changeView('overview');
    } else if (id === 'xodimlar') setPanel(panel === 'table' ? null : 'table');
    else if (id === 'faollik') setPanel(panel === 'timeline' ? null : 'timeline');
    else if (id === 'hisobot') {
      if (!today) return;
      say('Excel hisobot tayyorlanmoqda…');
      try {
        await exportExcel({ config, today, source });
      } catch (err) {
        say(`Excel faylni yaratib bo'lmadi: ${err.message || err}`);
      }
    }
  };

  const toggleRole = (r) => setRoleFilter((prev) => {
    const next = new Set(prev);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    return next;
  });

  if (phase === 'login') return <Login onDone={data.relogin} />;
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
    ? `3D model: ${modelInfo.floors.filter((f) => f.ok).map((f) => f.floor).join(', ')}-qavat 3ds Max faylidan`
    : '3D model: vaqtincha bloklar (3ds Max fayllari hali qo\'yilmagan)';
  const activeNav = panel === 'table' ? 'xodimlar' : panel === 'timeline' ? 'faollik' : 'bino';

  return (
    <AppLayout
      side={(
        <SidePanel
          active={activeNav}
          onNav={onNav}
          footer={(
            <>
              {config.demo && <div className="side-note">Telefon/namuna versiyasi: ma'lumotlar soxta</div>}
              <div className="side-note muted">{modelNote}</div>
            </>
          )}
        >
          <FiltersPanel config={config} snapshot={snapshot} roleFilter={roleFilter} onToggle={toggleRole} onClear={() => setRoleFilter(new Set())} />
          {warnings.length > 0 && (
            <details className="warnings">
              <summary>⚠ Ogohlantirishlar ({warnings.length})</summary>
              <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </details>
          )}
        </SidePanel>
      )}
      top={(
        <TopBar
          search={(
            <SearchBar
              staff={config.staff}
              roles={config.roles}
              stateById={stateById}
              roomById={roomById}
              onPick={(id) => select(id, { fly: true })}
              onNotFound={() => say('Hech kim topilmadi.')}
            />
          )}
          snapshot={snapshot}
          speeds={config.speeds}
          onSpeed={(v) => source.setSpeed(v).catch((err) => say(`Tezlikni o'zgartirib bo'lmadi: ${err.message}`))}
          conn={conn}
          isLive={source.kind === 'live'}
          onLogout={async () => { await logout(); location.reload(); }}
        />
      )}
    >
      <main className={`stage mode-${view.mode}`} ref={stageRef}>
        <BuildingScene
          ref={sceneRef}
          config={config}
          snapshot={snapshot}
          selectedId={selectedId}
          roleFilter={roleFilter}
          insets={insets}
          onSelect={(id) => select(id)}
          onViewChange={setView}
          onModelInfo={setModelInfo}
          onHoverFloor={setHoverFloor}
        />
        <ViewHeader view={view} hoverFloor={hoverFloor} config={config} snapshot={snapshot} onOverview={() => changeView('overview')} />
        <FloorSelector floors={config.floors} view={view} counts={counts} onChange={changeView} />
        {conn.state === 'uzildi' && <div className="banner">Server bilan aloqa uzildi, qayta ulanmoqda…</div>}
        {selected && (
          <EmployeeInfoCard
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
        {panel ? (
          <TodayPanel
            key={panel}
            initialTab={panel}
            config={config}
            today={today}
            roleFilter={roleFilter}
            source={source}
            selectedId={selectedId}
            onSelect={(id) => select(id, { fly: true })}
            onClose={() => setPanel(null)}
          />
        ) : (
          <StatsStrip
            config={config}
            snapshot={snapshot}
            today={today}
            roleFilter={roleFilter}
            onFloor={(f) => changeView('floor', f)}
            onSelect={(id) => select(id, { fly: true })}
            onOpenTable={() => setPanel('table')}
          />
        )}
        {toast && <div className="toast" key={toast.id}>{toast.text}</div>}
      </main>
    </AppLayout>
  );
}
