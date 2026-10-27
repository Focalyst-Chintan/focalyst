import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { McpUserError, must } from '../run';
import { addDays, daysBetween, localDate, localTime, todayIn, utcRange } from '../time';
import { READ, dateSchema, defineTool, loadSessions, round1 } from './shared';

const MAX_SPAN_DAYS = 92;

export function registerFocusTools(server: McpServer) {
  defineTool(
    server,
    'get_focus_stats',
    {
      title: 'Focus stats',
      description:
        "Get the user's focus (Pomodoro) time for a date range: totals, minutes per day, best day, the hours they focus most and the tasks they focused on. Defaults to the last 7 days including today.",
      inputSchema: z.object({
        from: dateSchema.optional().describe('YYYY-MM-DD, defaults to 6 days before to'),
        to: dateSchema.optional().describe('YYYY-MM-DD, defaults to today'),
      }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      const today = todayIn(tz);
      const to = args.to ?? (args.from ? (addDays(args.from, 6) < today ? addDays(args.from, 6) : today) : today);
      const from = args.from ?? addDays(to, -6);
      if (from > to) throw new McpUserError('The start date must be on or before the end date.');
      const span = daysBetween(from, to) + 1;
      if (span > MAX_SPAN_DAYS) throw new McpUserError(`Choose a range of ${MAX_SPAN_DAYS} days or less.`);

      const sessions = await loadSessions(sb, userId, utcRange(from, to, tz));

      const byDay = new Map<string, { minutes: number; sessions: number }>();
      for (let i = 0; i < span; i++) byDay.set(addDays(from, i), { minutes: 0, sessions: 0 });
      const byHour = new Map<string, number>();
      const byTask = new Map<string, number>();
      let total = 0;

      for (const s of sessions) {
        const mins = s.focus_minutes || 0;
        total += mins;
        const day = byDay.get(localDate(s.started_at, tz)!);
        if (day) {
          day.minutes += mins;
          day.sessions += 1;
        }
        const hour = `${localTime(s.started_at, tz).slice(0, 2)}:00`;
        byHour.set(hour, (byHour.get(hour) ?? 0) + mins);
        if (s.task_id) byTask.set(s.task_id, (byTask.get(s.task_id) ?? 0) + mins);
      }

      const days = [...byDay.entries()].map(([date, v]) => ({ date, minutes: Math.round(v.minutes), sessions: v.sessions }));
      const best = days.reduce<{ date: string; minutes: number } | null>(
        (acc, d) => (d.minutes > 0 && (!acc || d.minutes > acc.minutes) ? { date: d.date, minutes: d.minutes } : acc),
        null
      );

      const topTaskIds = [...byTask.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      let titles = new Map<string, string>();
      if (topTaskIds.length) {
        const rows = must(
          await sb
            .from('tasks')
            .select('id, title')
            .eq('user_id', userId)
            .in(
              'id',
              topTaskIds.map(([id]) => id)
            )
            .limit(5)
        ) as { id: string; title: string }[];
        titles = new Map(rows.map((r) => [r.id, r.title]));
      }

      return {
        from,
        to,
        total_minutes: Math.round(total),
        total_hours: round1(total / 60),
        sessions: sessions.length,
        avg_session_minutes: sessions.length ? round1(total / sessions.length) : 0,
        days,
        best_day: best,
        top_hours: [...byHour.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([hour, minutes]) => ({ hour, minutes: Math.round(minutes) })),
        top_tasks: topTaskIds.map(([task_id, minutes]) => ({
          task_id,
          title: titles.get(task_id) ?? null,
          minutes: Math.round(minutes),
        })),
      };
    }
  );
}
