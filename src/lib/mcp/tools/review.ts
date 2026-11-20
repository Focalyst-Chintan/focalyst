import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { must } from '../run';
import { addDays, daysBetween, localDate, todayIn, utcRange, weekdayIndex } from '../time';
import {
  READ,
  countIn,
  defineTool,
  loadActiveHabits,
  loadBlockingStats,
  loadHabitLogs,
  loadSessions,
  mustCount,
} from './shared';
import { getTasksByUser, getNotesByUser } from '@/lib/server/azure-db';

export function registerReviewTools(server: McpServer) {
  defineTool(
    server,
    'get_weekly_review',
    {
      title: 'Weekly review',
      description:
        "Get a review of the user's week, Sunday to Saturday: tasks completed, focus time by day, habit consistency, notes created and distraction blocking (when used), plus the saved Focalyst weekly report if there is one. Defaults to last week.",
      inputSchema: z.object({ week: z.enum(['this', 'last']).default('last') }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      const today = todayIn(tz);
      const thisWeekStart = addDays(today, -weekdayIndex(today));
      const weekStart = args.week === 'this' ? thisWeekStart : addDays(thisWeekStart, -7);
      const weekEnd = addDays(weekStart, 6);
      const lastCounted = weekEnd < today ? weekEnd : today;
      const range = utcRange(weekStart, weekEnd, tz);

      let doneCount = 0;
      let doneTitles: { title: string }[] = [];
      let notesCount = 0;
      let voiceCount = 0;

      try {
        const [azTasks, azNotes] = await Promise.all([
          getTasksByUser(userId, { isCompleted: true }),
          getNotesByUser(userId),
        ]);
        const completedThisWeek = azTasks.filter(
          (t) => t.completed_at && t.completed_at >= range.gte && t.completed_at < range.lt
        );
        doneCount = completedThisWeek.length;
        doneTitles = completedThisWeek.slice(0, 15).map((t) => ({ title: t.title }));

        const createdNotes = azNotes.filter(
          (n) => n.created_at >= range.gte && n.created_at < range.lt
        );
        notesCount = createdNotes.length;
        voiceCount = createdNotes.filter((n) => n.type === 'voice').length;
      } catch {
        const notDeleted = () =>
          sb
            .from('notes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .not('is_deleted', 'is', true)
            .gte('created_at', range.gte)
            .lt('created_at', range.lt);

        const [dcRes, dtRes, ncRes, vcRes] = await Promise.all([
          sb
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_completed', true)
            .gte('completed_at', range.gte)
            .lt('completed_at', range.lt),
          sb
            .from('tasks')
            .select('title')
            .eq('user_id', userId)
            .eq('is_completed', true)
            .gte('completed_at', range.gte)
            .lt('completed_at', range.lt)
            .order('completed_at', { ascending: false })
            .limit(15),
          notDeleted(),
          notDeleted().eq('note_type', 'voice'),
        ]);
        doneCount = mustCount(dcRes);
        doneTitles = dtRes.data || [];
        notesCount = mustCount(ncRes);
        voiceCount = mustCount(vcRes);
      }

      const [sessions, habits, logs, report, blocking] = await Promise.all([
        loadSessions(sb, userId, range),
        loadActiveHabits(sb, userId),
        loadHabitLogs(sb, userId, weekStart),
        sb
          .from('reports')
          .select('score, week_summary_text')
          .eq('user_id', userId)
          .gte('start_date', `${addDays(weekStart, -1)}T00:00:00Z`)
          .lte('start_date', `${addDays(weekStart, 1)}T23:59:59Z`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        loadBlockingStats(sb, userId, range),
      ]);

      const byDay = new Map<string, number>();
      for (let i = 0; i < 7; i++) byDay.set(addDays(weekStart, i), 0);
      let total = 0;
      for (const s of sessions) {
        total += s.focus_minutes || 0;
        const day = localDate(s.started_at, tz)!;
        if (byDay.has(day)) byDay.set(day, byDay.get(day)! + (s.focus_minutes || 0));
      }

      const saved = must(report) as { score: number; week_summary_text: string } | null;

      return {
        week_start: weekStart,
        week_end: weekEnd,
        tasks_completed: doneCount,
        completed_titles: doneTitles.map((t) => t.title),
        focus: {
          total_minutes: Math.round(total),
          by_day: [...byDay.entries()].map(([date, minutes]) => ({ date, minutes: Math.round(minutes) })),
        },
        habits: habits.map((h) => {
          // Only days that have happened and that the habit existed for
          const created = localDate(h.created_at, tz) ?? weekStart;
          const first = created > weekStart ? created : weekStart;
          const possible = first > lastCounted ? 0 : daysBetween(first, lastCounted) + 1;
          const done = countIn(logs.get(h.id), weekStart, weekEnd);
          return {
            name: h.name,
            done_days: done,
            possible_days: possible,
            rate_percent: possible ? Math.min(100, Math.round((done / possible) * 100)) : 0,
          };
        }),
        notes_created: notesCount,
        voice_notes_created: voiceCount,
        ...(saved ? { saved_report: { score: saved.score, summary: saved.week_summary_text } } : {}),
        ...(blocking ? { distraction_blocking: blocking } : {}),
      };
    }
  );
}
