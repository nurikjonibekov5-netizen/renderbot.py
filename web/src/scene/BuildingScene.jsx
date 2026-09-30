// React qobig'i: 3D sahnani yaratadi va React holatini sahnaga uzatadi.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ClinicScene } from './engine/ClinicScene.js';

export const BuildingScene = forwardRef(function BuildingScene(
  { config, snapshot, selectedId, roleFilter, insets, onSelect, onViewChange, onModelInfo, onHoverFloor },
  ref,
) {
  const box = useRef(null);
  const scene = useRef(null);
  const handlers = useRef({});
  handlers.current = { onSelect, onViewChange, onModelInfo, onHoverFloor };

  useEffect(() => {
    if (!config || !box.current) return undefined;
    const s = new ClinicScene(box.current, {
      onSelect: (id) => handlers.current.onSelect?.(id),
      onViewChange: (v) => handlers.current.onViewChange?.(v),
      onModelInfo: (i) => handlers.current.onModelInfo?.(i),
      onHoverFloor: (f) => handlers.current.onHoverFloor?.(f),
    });
    if (insets) s.setInsets(insets);
    s.setConfig(config);
    scene.current = s;
    window.__klinika = s;
    return () => {
      s.dispose();
      scene.current = null;
    };
  }, [config]);

  useEffect(() => { if (snapshot) scene.current?.update(snapshot); }, [snapshot]);
  useEffect(() => { scene.current?.setSelected(selectedId); }, [selectedId, config]);
  useEffect(() => { scene.current?.setRoleFilter(roleFilter); }, [roleFilter, config]);
  useEffect(() => { if (insets) scene.current?.setInsets(insets); }, [insets]);

  useImperativeHandle(ref, () => ({
    setView: (mode, floor) => scene.current?.setView(mode, floor),
    focusStaff: (id) => scene.current?.focusStaff(id) ?? null,
  }), []);

  return <div className="scene" ref={box} />;
});
