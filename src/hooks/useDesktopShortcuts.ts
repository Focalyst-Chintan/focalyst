'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface DesktopShortcutsOptions {
  onToggleCommandPalette?: () => void;
  onToggleAiDrawer?: () => void;
  onToggleSidebar?: () => void;
  onToggleContextPanel?: () => void;
  onOpenNewMenu?: () => void;
  onEscape?: () => void;
  onNewHabit?: () => void;
  onNewReminder?: () => void;
  onFocusTasksComposer?: () => void;
}

export function useDesktopShortcuts({
  onToggleCommandPalette,
  onToggleAiDrawer,
  onToggleSidebar,
  onToggleContextPanel,
  onOpenNewMenu,
  onEscape,
  onNewHabit,
  onNewReminder,
  onFocusTasksComposer,
}: DesktopShortcutsOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gSequenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isGActiveRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only active on desktop (>= 1024px)
      if (window.innerWidth < 1024) return;

      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Esc always works
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
        return;
      }

      // Cmd/Ctrl shortcuts
      if (modifier) {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          onToggleCommandPalette?.();
          return;
        }
        if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          onToggleAiDrawer?.();
          return;
        }
        if (e.key === '\\') {
          e.preventDefault();
          onToggleSidebar?.();
          return;
        }
        if (e.key === '.') {
          e.preventDefault();
          onToggleContextPanel?.();
          return;
        }
      }

      // Single-letter shortcuts (ignored inside inputs)
      if (isInput || modifier || e.altKey || e.shiftKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // N -> Context-aware creation
      // On Plan habits -> Habit Modal, tasks -> focus composer, calendar -> Reminder Modal; elsewhere opens + New menu.
      if (key === 'n' && !isGActiveRef.current) {
        e.preventDefault();
        if (pathname.startsWith('/plan')) {
          const view = searchParams.get('view') || 'habits';
          if (view === 'habits') {
            if (onNewHabit) onNewHabit();
            else onOpenNewMenu?.();
            return;
          }
          if (view === 'tasks') {
            if (onFocusTasksComposer) onFocusTasksComposer();
            else onOpenNewMenu?.();
            return;
          }
          if (view === 'calendar') {
            if (onNewReminder) onNewReminder();
            else onOpenNewMenu?.();
            return;
          }
        }
        if (pathname.startsWith('/notes')) {
          window.dispatchEvent(new CustomEvent('fx:create-note'));
          return;
        }
        onOpenNewMenu?.();
        return;
      }

      // G sequence navigation
      if (key === 'g' && !isGActiveRef.current) {
        isGActiveRef.current = true;
        if (gSequenceTimerRef.current) clearTimeout(gSequenceTimerRef.current);
        gSequenceTimerRef.current = setTimeout(() => {
          isGActiveRef.current = false;
        }, 1000);
        return;
      }

      if (isGActiveRef.current) {
        isGActiveRef.current = false;
        if (gSequenceTimerRef.current) clearTimeout(gSequenceTimerRef.current);

        if (key === 't') {
          e.preventDefault();
          router.push('/today');
        } else if (key === 'p') {
          e.preventDefault();
          router.push('/plan');
        } else if (key === 'f') {
          e.preventDefault();
          router.push('/focus');
        } else if (key === 'n') {
          e.preventDefault();
          router.push('/notes');
        } else if (key === 'i') {
          e.preventDefault();
          router.push('/insights');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gSequenceTimerRef.current) clearTimeout(gSequenceTimerRef.current);
    };
  }, [
    router,
    pathname,
    searchParams,
    onToggleCommandPalette,
    onToggleAiDrawer,
    onToggleSidebar,
    onToggleContextPanel,
    onOpenNewMenu,
    onEscape,
    onNewHabit,
    onNewReminder,
    onFocusTasksComposer,
  ]);
}
