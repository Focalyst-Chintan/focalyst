'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { TaskModal } from '@/components/desktop/plan/TaskModal';
import { HabitModal } from '@/components/desktop/plan/HabitModal';
import { ReminderModal } from '@/components/desktop/plan/ReminderModal';

export type CreateKind = 'task' | 'habit' | 'reminder' | 'note' | 'focus';
type Opts = { date?: string; initialData?: any };

const Ctx = createContext<{ open: (k: CreateKind, o?: Opts) => void } | null>(null);

export const useCreate = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCreate outside CreateProvider');
  return c;
};

export function CreateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ kind: CreateKind; opts?: Opts } | null>(null);

  const open = useCallback((kind: CreateKind, opts?: Opts) => {
    if (kind === 'focus') {
      window.location.assign('/focus?start=1');
      return;
    }
    if (kind === 'note') {
      /* keep the existing new-note flow until Phase 4 */
      window.location.assign('/notes/new');
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
