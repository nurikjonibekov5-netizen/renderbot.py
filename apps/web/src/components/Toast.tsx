import { useEffect } from 'react';
import { getAppStore, useEditor } from '../editor/store.ts';

export function Toast() {
  const toast = useEditor((s) => s.toast);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => {
      if (getAppStore().getState().toast?.id === toast.id) getAppStore().setState({ toast: null });
    }, toast.kind === 'error' ? 3500 : 2200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return <div key={toast.id} className={`toast ${toast.kind}`} role="status" data-testid="toast">{toast.text}</div>;
}
