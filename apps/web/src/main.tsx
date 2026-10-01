import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createSampleDocument } from '@scene/schema';
import { createEditorStore, setAppStore } from './editor/store.ts';
import { clearStorage, loadFromStorage } from './editor/persist.ts';
import { startAutosave } from './editor/autosave.ts';
import { App } from './app/App.tsx';
import './styles/app.css';

// Restore the autosaved scene; fall back to the deterministic sample scene.
const params = new URLSearchParams(location.search);
if (params.has('fresh')) clearStorage();
const saved = params.has('fresh') ? null : loadFromStorage();
const store = createEditorStore(saved?.ok && saved.doc ? saved.doc : createSampleDocument());
setAppStore(store);
if (saved && saved.ok && saved.errors.length) {
  store.getState().notify(`Saqlangan sahnadagi ${saved.errors.length} ta obyekt o'qilmadi va o'tkazib yuborildi.`, 'error');
} else if (saved && !saved.ok) {
  store.getState().notify("Saqlangan sahnani o'qib bo'lmadi, namuna sahna ochildi.", 'error');
}
startAutosave(store);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
