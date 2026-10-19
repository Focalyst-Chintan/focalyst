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
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) {
      console.error('Failed to get user for reconciliation:', userErr);
      showFocusToast(`User error: ${userErr.message}`, 'error');
      return;
    }
    uid = user?.id;
  }
  if (!uid) return;

  const { data: sessions, error: sessErr } = await supabase
    .from('pomodoro_sessions')
    .select('focus_minutes')
    .eq('user_id', uid)
    .gte('started_at', `${dayStr}T00:00:00`)
    .lte('started_at', `${dayStr}T23:59:59`);

  if (sessErr) {
    console.error('Failed to query pomodoro_sessions for reconciliation:', sessErr);
    showFocusToast(`Couldn't query focus sessions: ${sessErr.message}`, 'error');
    return;
  }

  const totalFocusMinutes = (sessions || []).reduce(
    (acc: number, curr: any) => acc + (curr.focus_minutes || 0),
    0
  );
  const sessionCount = (sessions || []).length;

  const { data: existingData, error: readErr } = await supabase
    .from('daily_focus_activity')
    .select('*')
    .eq('user_id', uid)
    .eq('date', dayStr)
    .maybeSingle();

  if (readErr) {
    console.error('Failed to check daily_focus_activity:', readErr);
    showFocusToast(`Couldn't check focus activity: ${readErr.message}`, 'error');
    return;
  }

  const breakMins = existingData?.break_minutes ?? existingData?.break_time_minutes ?? 0;

  if (existingData) {
    const { error: updateErr } = await supabase
      .from('daily_focus_activity')
      .update({
        focus_time_minutes: totalFocusMinutes,
        sessions_completed: sessionCount,
        break_minutes: breakMins,
      })
      .eq('user_id', uid)
      .eq('date', dayStr);

    if (updateErr) {
      console.error('Failed to update daily_focus_activity:', updateErr);
      showFocusToast(`Couldn't update focus activity: ${updateErr.message}`, 'error');
    }
  } else {
    const { error: insertErr } = await supabase
      .from('daily_focus_activity')
      .insert([
        {
          user_id: uid,
          date: dayStr,
          focus_time_minutes: totalFocusMinutes,
          sessions_completed: sessionCount,
          break_minutes: breakMins,
        },
      ]);

    if (insertErr) {
      console.error('Failed to insert daily_focus_activity:', insertErr);
      showFocusToast(`Couldn't insert focus activity: ${insertErr.message}`, 'error');
    }
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
      const err = userError || new Error('User not authenticated');
      console.error('User authentication error:', err);
      showFocusToast(`Authentication error: ${err.message}`, 'error');
      throw err;
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
    } catch (firstErr: any) {
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
      if (fallbackErr) {
        console.error('Failed to insert pomodoro_sessions:', fallbackErr);
        showFocusToast(`Couldn't save focus session: ${fallbackErr.message}`, 'error');
        throw fallbackErr;
      }
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
  } catch (err: any) {
    console.error("Couldn't save focus time:", err);
    const msg = err?.message || 'Unknown error';
    if (!isRetry) {
      showFocusToast(`Couldn't save focus time: ${msg}. Retrying...`, 'error');
      setTimeout(() => {
        inFlight.delete(s.id);
        recordFocusSession(s, true);
      }, 3000);
    } else {
      showFocusToast(`Couldn't save focus time: ${msg}. Please check your connection.`, 'error');
    }
  } finally {
    inFlight.delete(s.id);
  }
}
