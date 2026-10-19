import { localDateStr } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase';
import { emitDataChanged } from '@/lib/events';

const KEY = (id: string) => `fx-focus-saved-${id}`;
const inFlight = new Set<string>();

export type FocusSession = {
  id: string;
  startedAt: number;
  minutes: number;
  taskId?: string | null;
  taskTitle?: string | null;
};

function showFocusToast(message: string, type: 'error' | 'success' | 'info' = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fx:toast', {
        detail: { message, type },
      })
    );
  }
}

/**
 * Reconciles the day's focus minutes by querying all pomodoro_sessions
 * for that local day and upserting into daily_focus_activity.
 */
export async function reconcileDailyFocus(dayStr: string, userId?: string) {
  const supabase = createClient();
  let uid = userId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return;

  const startIso = `${dayStr}T00:00:00.000Z`;
  const endIso = `${dayStr}T23:59:59.999Z`;

  const { data: sessions, error } = await supabase
    .from('pomodoro_sessions')
    .select('focus_minutes')
    .eq('user_id', uid)
    .gte('started_at', `${dayStr}T00:00:00`)
    .lte('started_at', `${dayStr}T23:59:59`);

  if (error) {
    console.error('Failed to query pomodoro_sessions for reconciliation:', error);
    return;
  }

  const totalFocusMinutes = (sessions || []).reduce(
    (acc: number, curr: any) => acc + (curr.focus_minutes || 0),
    0
  );
  const sessionCount = (sessions || []).length;

  const { data: existingData } = await supabase
    .from('daily_focus_activity')
    .select('*')
    .eq('user_id', uid)
    .eq('date', dayStr)
    .maybeSingle();

  const breakMins = existingData?.break_minutes ?? 0;

  const { error: upsertErr } = await supabase.from('daily_focus_activity').upsert(
    {
      user_id: uid,
      date: dayStr,
      focus_time_minutes: totalFocusMinutes,
      sessions_completed: sessionCount,
      break_minutes: breakMins,
    },
    { onConflict: 'user_id,date' }
  );

  if (upsertErr) {
    console.error('Failed to reconcile daily_focus_activity:', upsertErr);
  }
}

export async function recordFocusSession(s: FocusSession, isRetry = false): Promise<void> {
  if (s.minutes < 1 || inFlight.has(s.id)) return;
  try {
    if (localStorage.getItem(KEY(s.id))) return;
  } catch {}
  inFlight.add(s.id);

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw userError || new Error('User not authenticated');
    }

    const day = localDateStr(new Date(s.startedAt));
    const focusMinsToAdd = Math.floor(s.minutes);

    // 1) Insert pomodoro_sessions row
    let insertSuccess = false;
    try {
      const { error: insertErr } = await supabase.from('pomodoro_sessions').insert([
        {
          user_id: user.id,
          focus_minutes: focusMinsToAdd,
          break_minutes: 0,
          sets_planned: 4,
          sets_completed: 1,
          started_at: new Date(s.startedAt).toISOString(),
          was_completed: true,
          task_id: s.taskId || null,
        },
      ]);
      if (insertErr) throw insertErr;
      insertSuccess = true;
    } catch {
      // Fallback without task_id if column missing in table
      const { error: fallbackErr } = await supabase.from('pomodoro_sessions').insert([
        {
          user_id: user.id,
          focus_minutes: focusMinsToAdd,
          break_minutes: 0,
          sets_planned: 4,
          sets_completed: 1,
          started_at: new Date(s.startedAt).toISOString(),
          was_completed: true,
        },
      ]);
      if (fallbackErr) throw fallbackErr;
      insertSuccess = true;
    }

    if (!insertSuccess) {
      throw new Error('Could not insert pomodoro session');
    }

    // 2) Reconcile the day instead of blind increment
    await reconcileDailyFocus(day, user.id);

    // 3) Mark saved in localStorage and clear pending focus
    try {
      localStorage.setItem(KEY(s.id), '1');
      localStorage.removeItem('fx-pending-focus');
    } catch {}

    // 4) Dispatch events and notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fx:focus-updated'));
      window.dispatchEvent(new CustomEvent('focalyst:focus-updated'));
      emitDataChanged('focus');
    }
  } catch (err) {
    console.error("Couldn't save focus time:", err);
    if (!isRetry) {
      showFocusToast("Couldn't save your focus time. Retrying...", 'error');
      setTimeout(() => {
        inFlight.delete(s.id);
        recordFocusSession(s, true);
      }, 3000);
    } else {
      showFocusToast("Couldn't save your focus time. Please check your connection.", 'error');
    }
  } finally {
    inFlight.delete(s.id);
  }
}
