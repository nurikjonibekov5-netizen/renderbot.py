import type { EditorStore } from './store.ts';
import { saveToStorage } from './persist.ts';

export const AUTOSAVE_DELAY = 800;

/** Writes the scene to browser storage shortly after every committed change. Returns an unsubscribe. */
export function startAutosave(store: EditorStore, delay = AUTOSAVE_DELAY): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsub = store.subscribe((state, prev) => {
    if (state.doc === prev.doc) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (saveToStorage(store.getState().doc)) store.getState().markSaved();
    }, delay);
  });
  const flush = () => {
    if (timer && saveToStorage(store.getState().doc)) store.getState().markSaved();
  };
  window.addEventListener('pagehide', flush);
  return () => {
    unsub();
    if (timer) clearTimeout(timer);
    window.removeEventListener('pagehide', flush);
  };
}
