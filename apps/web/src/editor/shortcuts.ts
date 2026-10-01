import type { EditorStore } from './store.ts';
import { clearDrafts } from '../scene/interaction.ts';

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

/** Global editor shortcuts. Returns an unsubscribe. */
export function bindShortcuts(store: EditorStore): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    const s = store.getState();
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) s.redo();
      else s.undo();
      return;
    }
    if (mod && key === 'y') {
      e.preventDefault();
      s.redo();
      return;
    }
    if (mod && key === 'd') {
      e.preventDefault();
      s.duplicateSelected();
      return;
    }
    if (mod && key === 's') {
      e.preventDefault();
      s.save();
      return;
    }
    if (mod || e.altKey) return;

    switch (key) {
      case 'escape':
        if (!clearDrafts()) s.cancel();
        break;
      case 'delete':
      case 'backspace':
        if (s.selectedId) {
          e.preventDefault();
          s.deleteSelected();
        }
        break;
      case 'r':
        if (s.tool.startsWith('place:')) s.rotateGhost();
        else if (s.selectedId) s.rotateSelected(90);
        break;
      case 'w':
        s.setTransformMode('translate');
        break;
      case 'e':
        s.setTransformMode('rotate');
        break;
      case 't':
        s.setTransformMode('scale');
        break;
      case 'g':
        s.toggleGrid();
        break;
      case 'arrowleft':
      case 'arrowright':
      case 'arrowup':
      case 'arrowdown': {
        if (!s.selectedId) return;
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dz = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        s.nudgeSelected(dx, dz);
        break;
      }
      default:
        break;
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
