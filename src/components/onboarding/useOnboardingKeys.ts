'use client';
import { useEffect, useRef } from 'react';

export interface OnboardingKeyHandlers {
  /** Enter: Continue when the screen is valid (also inside text inputs). */
  onEnter?: () => void;
  canContinue?: boolean;
  /** 1 to 9: pick option N (index 0 based). */
  onPick?: (index: number) => void;
  optionCount?: number;
  /** Alt + Left arrow. */
  onBack?: () => void;
  /** Esc closes an open sheet or follow-up. It never leaves the flow. */
  onEscape?: () => void;
}

function isTextTarget(t: EventTarget | null): t is HTMLElement {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
}

/** Keyboard rules from 3.6. Arrow keys and Space live in the option groups (roving tabindex). */
export function useOnboardingKeys(h: OnboardingKeyHandlers) {
  const ref = useRef(h);
  useEffect(() => { ref.current = h; });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const cur = ref.current;
      const target = e.target;

      if (e.key === 'ArrowLeft' && e.altKey) {
        if (cur.onBack) { e.preventDefault(); cur.onBack(); }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Enter') {
        // Buttons and links handle Enter natively (picking a focused card, pressing Back).
        if (target instanceof HTMLElement && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'TEXTAREA')) return;
        if (target instanceof HTMLInputElement && target.dataset.obEnter === 'self') return;
        if (cur.canContinue && cur.onEnter) { e.preventDefault(); cur.onEnter(); }
        return;
      }
      if (e.key === 'Escape') {
        if (cur.onEscape) { e.preventDefault(); cur.onEscape(); }
        return;
      }
      if (/^[1-9]$/.test(e.key) && !isTextTarget(target)) {
        const i = Number(e.key) - 1;
        if (cur.onPick && i < (cur.optionCount ?? 0)) { e.preventDefault(); cur.onPick(i); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Roving tabindex helper for option groups: arrows move focus between the group's options. */
export function rovingKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(e.key) || e.altKey) return;
  // Only from an option itself: a follow-up's text field or segmented control keeps its own arrow keys.
  if (!(e.target instanceof HTMLElement) || !e.target.hasAttribute('data-ob-option')) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-ob-option]'));
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  let n = i;
  if (e.key === 'Home') n = 0;
  else if (e.key === 'End') n = items.length - 1;
  else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = i < 0 ? 0 : (i + 1) % items.length;
  else n = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
  e.preventDefault();
  items.forEach((el, k) => el.setAttribute('tabindex', k === n ? '0' : '-1'));
  items[n]?.focus();
}

export default useOnboardingKeys;
