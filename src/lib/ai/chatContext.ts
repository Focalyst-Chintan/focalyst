import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function buildUserContext(supabase: SupabaseClient, userId: string, timezone: string = 'Asia/Kolkata'): Promise<string> {
  const now = new Date();
  let tz = timezone;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    tz = 'Asia/Kolkata';
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
  const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel user-scoped queries using signed-in client
  const [tasksRes, habitsRes, sessionsRes, notesRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, is_completed, due_date, priority')
      .eq('user_id', userId)
      .or(`due_date.gte.${todayStr},is_completed.eq.false`)
      .limit(20),
    supabase
      .from('habits')
      .select('id, name, frequency, current_streak')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(10),
    supabase
      .from('pomodoro_sessions')
      .select('focus_minutes, completed_at, was_completed')
      .eq('user_id', userId)
      .gte('completed_at', sevenDaysAgo)
      .limit(30),
    supabase
      .from('notes')
      .select('title, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const tasks = tasksRes.data || [];
  const habits = habitsRes.data || [];
  const sessions = sessionsRes.data || [];
  const notes = notesRes.data || [];

  const completedTasks = tasks.filter((t: any) => t.is_completed);
  const pendingTasks = tasks.filter((t: any) => !t.is_completed);

  const totalFocusMinutes = sessions.reduce((acc: number, s: any) => acc + (s.focus_minutes || 0), 0);

  const contextText = `
--- CURRENT USER REAL-TIME CONTEXT ---
Date: ${dayOfWeek}, ${todayStr} (Timezone: ${tz})
Focus Time (last 7 days): ${Math.round(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m across ${sessions.length} sessions
Active Habits:
${habits.length === 0 ? '- None yet' : habits.map((h: any) => `- ${h.name} (${h.current_streak || 0} day streak)`).join('\n')}
Tasks:
- Pending: ${pendingTasks.length === 0 ? 'None' : pendingTasks.map((t: any) => `${t.title}${t.due_date ? ` (due: ${t.due_date})` : ''}`).join(', ')}
- Completed: ${completedTasks.length === 0 ? 'None' : completedTasks.map((t: any) => t.title).join(', ')}
Recent Notes:
${notes.length === 0 ? '- None' : notes.map((n: any) => `- ${n.title}: ${(n.content || '').slice(0, 100)}`).join('\n')}
--------------------------------------
`.trim();

  return contextText;
}
