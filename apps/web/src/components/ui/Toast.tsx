import { useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(clearToast, 2800);
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-[22px] right-[22px] z-10 rounded-[10px] bg-nv px-4 py-3 text-xs text-white"
    >
      {toast}
    </div>
  );
}
