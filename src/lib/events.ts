export type DataKind = 'task' | 'habit' | 'reminder' | 'countdown' | 'focus' | 'note';

export const emitDataChanged = (kind: DataKind) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fx:data-changed', { detail: { kind } }));
  }
};

export function onDataChanged(kinds: DataKind[], cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const h = (e: Event) => {
    const k = (e as CustomEvent).detail?.kind;
    if (kinds.includes(k)) cb();
  };
  window.addEventListener('fx:data-changed', h);
  return () => window.removeEventListener('fx:data-changed', h);
}
