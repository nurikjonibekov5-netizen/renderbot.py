import { useCallback, useEffect, useState } from 'react';
import { createSampleDocument } from '@scene/schema';
import { getAppStore, useEditor } from '../editor/store.ts';
import { dismissHint, hintDismissed, saveToStorage } from '../editor/persist.ts';
import { bindShortcuts } from '../editor/shortcuts.ts';
import { SceneCanvas } from '../scene/SceneCanvas.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { BuildToolbar } from '../components/BuildToolbar.tsx';
import { Inspector } from '../components/Inspector.tsx';
import { Toast } from '../components/Toast.tsx';
import { Hint } from '../components/Hint.tsx';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';

const params = new URLSearchParams(location.search);
const ORTHO = params.has('ortho');
const DEBUG = params.has('debug');
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 700;

function ToolHint() {
  const tool = useEditor((s) => s.tool);
  let text = '';
  if (tool === 'road') text = "Yo'l: boshlanish nuqtasini, keyin oxirini bosing. Esc — tugatish";
  else if (tool === 'footprint') text = 'Maydon: sichqonchani bosib turib to\'rtburchak chizing';
  else if (tool.startsWith('place:')) text = "Joyni bosing. R — burish, Esc — bekor qilish";
  if (!text) return null;
  return <div className="tool-hint" data-testid="tool-hint">{text}</div>;
}

export function App() {
  const [hint, setHint] = useState(() => !hintDismissed() && !params.has('nohint'));
  const [contextLost, setContextLost] = useState(false);
  const tool = useEditor((s) => s.tool);

  useEffect(() => bindShortcuts(getAppStore()), []);

  const closeHint = () => {
    dismissHint();
    setHint(false);
  };
  const resetScene = useCallback(() => {
    const doc = createSampleDocument();
    getAppStore().getState().replaceDocument(doc);
    saveToStorage(doc);
  }, []);

  return (
    <div className={`app tool-${tool.split(':')[0]}`}>
      <TopBar onHelp={() => setHint(true)} />
      <main className="viewport" data-testid="viewport">
        <ErrorBoundary onReset={resetScene}>
          <SceneCanvas ortho={ORTHO} debug={DEBUG} mobile={MOBILE} onContextLost={setContextLost} />
        </ErrorBoundary>
        <ToolHint />
        <Inspector />
        {hint && <Hint onClose={closeHint} />}
        {contextLost && <div className="overlay-msg">3D qayta yuklanmoqda…</div>}
        {DEBUG && <div id="perf-panel" className="perf-panel" data-testid="perf-panel" />}
        <Toast />
      </main>
      <BuildToolbar />
    </div>
  );
}
