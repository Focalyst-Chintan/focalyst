import { localDateStr } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase';

const KEY = (id: string) => `fx-focus-saved-${id}`;
const inFlight = new Set<string>();

export type FocusSession = {
  id: string;
  startedAt: number;
  minutes: number;
  taskId?: string | null;
  taskTitle?: string | null;
};

export async function recordFocusSession(s: FocusSession) {
  if (s.minutes < 1 || inFlight.has(s.id)) return;
  try {
    if (localStorage.getItem(KEY(s.id))) return;
  } catch {}
  inFlight.add(s.id);

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const day = localDateStr(new Date(s.startedAt));
    const focusMinsToAdd = Math.round(s.minutes);

    // 1) Try RPC first if available
    try {
      await supabase.rpc('increment_daily_focus', {
        p_focus_minutes: focusMinsToAdd,
        p_break_minutes: 0,
        p_date: day,
      });
    } catch {
      // Proceed to table upsert
    }

    // 2) daily_focus_activity for `day`: add focus minutes
    try {
      const { data: existingData } = await supabase
        .from('daily_focus_activity')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', day)
        .maybeSingle();

      const existingFocus = existingData?.focus_time_minutes ?? existingData?.focus_minutes ?? 0;
      const existingSessions = existingData?.sessions_completed ?? 0;

      await supabase.from('daily_focus_activity').upsert(
        {
          user_id: user.id,
          date: day,
          focus_time_minutes: existingFocus + focusMinsToAdd,
          sessions_completed: existingSessions + 1,
        },
        { onConflict: 'user_id,date' }
      );
    } catch (e) {
      console.warn('Error upserting daily_focus_activity:', e);
    }

    // 3) Increment users total_focus_minutes if available
    try {
      const { data: uData } = await supabase
        .from('users')
        .select('total_focus_minutes')
        .eq('id', user.id)
        .single();

      if (uData && typeof uData.total_focus_minutes === 'number') {
        await supabase
          .from('users')
          .update({ total_focus_minutes: uData.total_focus_minutes + focusMinsToAdd })
          .eq('id', user.id);
      }
    } catch {}

    // 4) Insert into pomodoro_sessions
    try {
      await supabase.from('pomodoro_sessions').insert([
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
    } catch {
      // Fallback without task_id if column missing
      try {
        await supabase.from('pomodoro_sessions').insert([
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
      } catch {}
    }

    // 5) Mark saved in localStorage and clear pending focus
    try {
      localStorage.setItem(KEY(s.id), '1');
      localStorage.removeItem('fx-pending-focus');
    } catch {}

    // 6) Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fx:focus-updated'));
      window.dispatchEvent(new CustomEvent('focalyst:focus-updated'));
    }
  } finally {
    inFlight.delete(s.id);
  }
}
