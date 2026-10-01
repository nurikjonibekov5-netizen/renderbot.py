import { parseDocument, serializeDocument, type SceneDocument, type ValidationResult } from '@scene/schema';

// v2: Phase 2 reference world (Phase 1 test scenes are not carried over).
export const STORAGE_KEY = 'isoeditor:project:v2';
const HINT_KEY = 'isoeditor:hint-dismissed';

/** Browser storage can throw (private mode, quota, blocked site data): never let it crash the editor. */
export function saveToStorage(doc: SceneDocument): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serializeDocument(doc));
    return true;
  } catch {
    return false;
  }
}

export function loadFromStorage(): ValidationResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseDocument(raw) : null;
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissHint(): void {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}
