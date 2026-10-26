'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import dynamic from 'next/dynamic';

const TaskModal = dynamic(
  () => import('@/components/desktop/plan/TaskModal').then((m) => m.TaskModal),
  { ssr: false }
);

const HabitModal = dynamic(
  () => import('@/components/desktop/plan/HabitModal').then((m) => m.HabitModal),
  { ssr: false }
);

const ReminderModal = dynamic(
  () => import('@/components/desktop/plan/ReminderModal').then((m) => m.ReminderModal),
  { ssr: false }
);

export type CreateKind = 'task' | 'habit' | 'reminder' | 'note' | 'focus';
type Opts = { date?: string; initialData?: any };

const Ctx = createContext<{ open: (k: CreateKind, o?: Opts) => void } | null>(null);

const noop = { open: () => {} };
export const useCreate = () => useContext(Ctx) ?? noop;

export function CreateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ kind: CreateKind; opts?: Opts } | null>(null);

  const open = useCallback((kind: CreateKind, opts?: Opts) => {
    if (kind === 'focus') {
      window.location.assign('/focus?start=1');
      return;
    }
    if (kind === 'note') {
      if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) {
          if (window.location.pathname.startsWith('/notes')) {
            window.dispatchEvent(new CustomEvent('fx:create-note'));
            return;
          }
          window.location.assign('/notes?new=1');
          return;
        } else {
          window.location.assign('/notes/new');
          return;
        }
      }
      return;
    }
    setState({ kind, opts });
  }, []);

  const close = () => setState(null);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state?.kind === 'task' && (
        <TaskModal defaultDate={state.opts?.date} onClose={close} />
      )}
      {state?.kind === 'habit' && (
        <HabitModal
          isOpen={true}
          onClose={close}
          habitToEdit={state.opts?.initialData}
        />
      )}
      {state?.kind === 'reminder' && (
        <ReminderModal
          isOpen={true}
          onClose={close}
          prefillDate={state.opts?.date}
          reminderToEdit={state.opts?.initialData}
        />
      )}
    </Ctx.Provider>
  );
}

export default CreateProvider;
