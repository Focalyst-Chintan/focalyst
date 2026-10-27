import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { must } from '../run';
import { addDays, daysBetween, hhmm, todayIn, utcRange, weekdayName } from '../time';
import {
  READ,
  defineTool,
  loadActiveHabits,
  loadHabitLogs,
  loadSessions,
  mustCount,
  streakOf,
  type TaskOut,
} from './shared';

export function registerTodayTools(server: McpServer) {
  defineTool(
    server,
    'get_today',
    {
      title: 'Today in Focalyst',
      description:
        "Get a snapshot of the user's day: overdue, today's and upcoming tasks, habits with today's status and streaks, today's focus minutes and the next countdowns. Use this first for any question about the user's day or plan.",
      inputSchema: z.object({}),
      annotations: READ,
    },
    async (_args, { sb, userId, tz }) => {
      const today = todayIn(tz);
      const weekAhead = addDays(today, 7);
      const todayRange = utcRange(today, today, tz);

      const [profile, openTasks, noDate, doneToday, habits, logs, sessions, countdowns] = await Promise.all([
        sb.from('users').select('full_name').eq('id', userId).maybeSingle(),
        sb
          .from('tasks')
          .select('id, title, due_date, due_time, priority')
          .eq('user_id', userId)
          .eq('is_completed', false)
          .not('due_date', 'is', null)
          .lte('due_date', weekAhead)
          .order('due_date', { ascending: true })
          .order('due_time', { ascending: true, nullsFirst: false })
          .limit(40),
        sb
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_completed', false)
          .is('due_date', null),
        sb
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_completed', true)
          .gte('completed_at', todayRange.gte)
          .lt('completed_at', todayRange.lt),
        loadActiveHabits(sb, userId),
        loadHabitLogs(sb, userId, addDays(today, -400)),
        loadSessions(sb, userId, todayRange),
        sb
          .from('countdowns')
          .select('id, event_name, target_date')
          .eq('user_id', userId)
          .eq('is_active', true)
          .gte('target_date', today)
          .order('target_date', { ascending: true })
          .limit(5),
      ]);

      const tasks = (must(openTasks) ?? []) as TaskOut[];
      const toTask = (t: TaskOut): TaskOut => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        due_time: hhmm(t.due_time),
        priority: t.priority,
      });

      return {
        date: today,
        weekday: weekdayName(today),
        name: must(profile)?.full_name?.trim() || null,
        tasks: {
          overdue: tasks.filter((t) => t.due_date! < today).map(toTask),
          today: tasks.filter((t) => t.due_date === today).map(toTask),
          upcoming_7_days: tasks.filter((t) => t.due_date! > today).map(toTask),
          no_date_count: mustCount(noDate),
          completed_today_count: mustCount(doneToday),
        },
        habits: habits.map((h) => ({
          id: h.id,
          name: h.name,
          icon: h.icon,
          done_today: logs.get(h.id)?.has(today) ?? false,
          streak: streakOf(logs.get(h.id), today),
        })),
        focus_today_minutes: Math.round(sessions.reduce((sum, s) => sum + (s.focus_minutes || 0), 0)),
        countdowns: ((must(countdowns) ?? []) as { id: string; event_name: string; target_date: string }[]).map(
          (c) => ({ id: c.id, name: c.event_name, date: c.target_date, days_left: daysBetween(today, c.target_date) })
        ),
      };
    }
  );
}
