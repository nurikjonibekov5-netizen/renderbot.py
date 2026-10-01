import { createSampleDocument } from '@scene/schema';
import { getAppStore, useEditor } from '../editor/store.ts';
import { saveToStorage } from '../editor/persist.ts';
import { clearDrafts } from '../scene/interaction.ts';
import { Icon } from './icons.tsx';

function SaveStatus() {
  const dirty = useEditor((s) => s.dirty);
  const savedAt = useEditor((s) => s.savedAt);
  if (dirty) return <span className="save-status" data-testid="save-status">Saqlanmoqda…</span>;
  if (!savedAt) return <span className="save-status" data-testid="save-status" />;
  const t = new Date(savedAt);
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  return <span className="save-status ok" data-testid="save-status">Saqlandi {hh}:{mm}</span>;
}

export function TopBar({ onHelp }: { onHelp: () => void }) {
  const name = useEditor((s) => s.doc.name);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const grid = useEditor((s) => s.gridVisible);
  const snapOn = useEditor((s) => s.snapOn);
  const st = () => getAppStore().getState();

  const resetScene = () => {
    if (!window.confirm("Namuna sahna qayta yuklansinmi? Hozirgi o'zgarishlar o'chadi.")) return;
    clearDrafts();
    const doc = createSampleDocument();
    st().replaceDocument(doc);
    if (saveToStorage(doc)) st().markSaved();
    st().resetCamera();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div className="brand-text">
          <strong>IsoEditor</strong>
          <span data-testid="project-name">{name}</span>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="tb" data-testid="undo" disabled={!canUndo} onClick={() => st().undo()} data-tip="Orqaga (Ctrl+Z)">
          <Icon name="undo" /><span className="lbl">Orqaga</span>
        </button>
        <button className="tb" data-testid="redo" disabled={!canRedo} onClick={() => st().redo()} data-tip="Qaytarish (Ctrl+Shift+Z)">
          <Icon name="redo" /><span className="lbl">Qaytarish</span>
        </button>
        <span className="sep" />
        <button className="tb" data-testid="save" onClick={() => st().save()} data-tip="Saqlash (Ctrl+S)">
          <Icon name="save" /><span className="lbl">Saqlash</span>
        </button>
        <SaveStatus />
        <span className="sep" />
        <button className="tb" data-testid="camera-reset" onClick={() => st().resetCamera()} data-tip="Kamerani boshlang'ich holatga qaytarish">
          <Icon name="camera" /><span className="lbl">Kamera</span>
        </button>
        <button className={`tb ${grid ? 'on' : ''}`} data-testid="grid-toggle" aria-pressed={grid} onClick={() => st().toggleGrid()} data-tip="To'r chiziqlari (G)">
          <Icon name="grid" /><span className="lbl">To'r</span>
        </button>
        <button className={`tb ${snapOn ? 'on' : ''}`} data-testid="snap-toggle" aria-pressed={snapOn} onClick={() => st().toggleSnap()} data-tip="To'rga yopishish (1 m / 2 m)">
          <Icon name="magnet" /><span className="lbl">Yopishish</span>
        </button>
        <span className="sep" />
        <button className="tb" data-testid="reset-sample" onClick={resetScene} data-tip="Namuna sahnani qayta yuklash">
          <Icon name="reset" /><span className="lbl">Namuna</span>
        </button>
        <button className="tb" data-testid="present" onClick={() => st().setPresenting(true)} data-tip="Shaharni ko'rish rejimi (tugmalar yashiriladi)">
          <Icon name="eye" /><span className="lbl">Ko'rish</span>
        </button>
        <button className="tb" data-testid="help" onClick={onHelp} data-tip="Qisqa yo'riqnoma">
          <Icon name="help" />
        </button>
      </div>
    </header>
  );
}
