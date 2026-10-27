import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { McpNotFound, must, PHONE_NOTE } from '../run';
import { addDays, todayIn } from '../time';
import {
  READ,
  bestRun,
  countIn,
  dateSchema,
  defineTool,
  loadActiveHabits,
  loadHabitLogs,
  streakOf,
  writeHints,
} from './shared';

export function registerHabitTools(server: McpServer, { writes }: { writes: boolean }) {
  defineTool(
    server,
    'list_habits',
    {
      title: 'List habits',
      description:
        "List the user's active habits with today's status, current streak, best streak this year and how often each was done in the last 7 and 30 days. Use this to see which habits the user is keeping up or slipping on.",
      inputSchema: z.object({}),
      annotations: READ,
    },
    async (_args, { sb, userId, tz }) => {
      const today = todayIn(tz);
      const [habits, logs] = await Promise.all([
        loadActiveHabits(sb, userId),
        loadHabitLogs(sb, userId, addDays(today, -400)),
      ]);
      return {
        habits: habits.map((h) => {
          const days = logs.get(h.id);
          return {
            id: h.id,
            name: h.name,
            icon: h.icon,
            schedule: h.frequency === 'custom' ? 'custom days' : 'daily',
            done_today: days?.has(today) ?? false,
            streak: streakOf(days, today),
            best_streak_365d: bestRun(days, addDays(today, -364), today),
            done_last_7_days: countIn(days, addDays(today, -6), today),
            done_last_30_days: countIn(days, addDays(today, -29), today),
          };
        }),
      };
    }
  );

  defineTool(
    server,
    'get_habit_history',
    {
      title: 'Habit history',
      description:
        'Get the days a single habit was done over the last 7 to 90 days, with its completion rate and current streak. Use this for questions about one habit over time.',
      inputSchema: z.object({
        habit_id: z.uuid(),
        days: z.number().int().min(7).max(90).default(30),
      }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      const habit = must(
        await sb.from('habits').select('id, name').eq('id', args.habit_id).eq('user_id', userId).maybeSingle()
      ) as { id: string; name: string } | null;
      if (!habit) throw new McpNotFound();

      const today = todayIn(tz);
      const from = addDays(today, -(args.days - 1));
      const logs = (await loadHabitLogs(sb, userId, addDays(today, -400), [habit.id])).get(habit.id);
      const doneDates = [...(logs ?? [])].filter((d) => d >= from && d <= today).sort();

      return {
        habit: { id: habit.id, name: habit.name },
        from,
        to: today,
        done_dates: doneDates,
        done_count: doneDates.length,
        rate_percent: Math.round((doneDates.length / args.days) * 100),
        streak: streakOf(logs, today),
      };
    }
  );

  if (!writes) return;

  defineTool(
    server,
    'create_habit',
    {
      title: 'Add a daily habit',
      description:
        'Add a new daily habit for the user, with an optional emoji icon. Creates a daily habit. Habits on specific weekdays must be set up in the Focalyst app. Confirm the details with the user before calling.',
      inputSchema: z.object({
        name: z.string().trim().min(1).max(80),
        icon: z.string().trim().max(16).optional().describe('One emoji'),
      }),
      annotations: writeHints(false),
    },
    async (args, { sb, callId }) => {
      const created = must(
        await sb.rpc('mcp_create_habit', { p_call_id: callId, p_name: args.name, p_icon: args.icon || null })
      );
      return { created, note: PHONE_NOTE };
    }
  );

  defineTool(
    server,
    'log_habit',
    {
      title: 'Mark a habit done',
      description:
        "Mark one of the user's habits as done for today, or for a date up to 7 days back, using its id from list_habits or get_today. Confirm the details with the user before calling.",
      inputSchema: z.object({
        habit_id: z.uuid(),
        date: dateSchema.optional().describe('YYYY-MM-DD, defaults to today, up to 7 days back'),
      }),
      annotations: writeHints(true),
    },
    async (args, { sb, callId }) => {
      const logged = must(
        await sb.rpc('mcp_log_habit', { p_call_id: callId, p_habit_id: args.habit_id, p_date: args.date ?? null })
      );
      return { logged, note: PHONE_NOTE };
    }
  );
}
