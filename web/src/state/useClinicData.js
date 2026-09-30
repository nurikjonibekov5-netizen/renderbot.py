// Ma'lumot oqimi: config, joriy holat (snapshot), bugungi faollik, aloqa holati, kirish.
import { useEffect, useMemo, useState } from 'react';
import { DemoSource, LiveSource } from '../data-source.js';

const isDemo = () => __DEMO__ || new URLSearchParams(location.search).has('demo');

export function useClinicData() {
  const [source, setSource] = useState(() => (isDemo() ? new DemoSource() : new LiveSource()));
  const [phase, setPhase] = useState('loading');
  const [config, setConfig] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [today, setToday] = useState(null);
  const [conn, setConn] = useState({ state: 'ulanmoqda' });

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

  const index = useMemo(() => ({
    staffById: new Map((config?.staff ?? []).map((s) => [s.id, s])),
    roomById: new Map((config?.rooms ?? []).map((r) => [r.id, r])),
  }), [config]);
  const stateById = useMemo(() => new Map((snapshot?.staff ?? []).map((s) => [s.id, s])), [snapshot]);
  const summaryById = useMemo(() => new Map((today?.rows ?? []).map((r) => [r.id, r])), [today]);

  return {
    source,
    phase,
    config,
    snapshot,
    today,
    conn,
    ...index,
    stateById,
    summaryById,
    relogin: () => {
      setPhase('loading');
      setSource(new LiveSource());
    },
  };
}
