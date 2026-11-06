import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  McpServer,
  ServerContext,
  StandardSchemaWithJSON,
  ToolAnnotations,
  ToolCallback,
} from '@modelcontextprotocol/server';
import { runTool, must, type ToolCtx, type ToolName } from '../run';
import { isRealDate } from '../time';

export const READ: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const writeHints = (idempotent: boolean): ToolAnnotations => ({
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: idempotent,
  openWorldHint: false,
});

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine(isRealDate, 'Use a real date as YYYY-MM-DD');

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

/** Registers a tool whose handler always runs inside runTool (credits, refunds, logging). */
export function defineTool<S extends ObjectSchema>(
  server: McpServer,
  name: ToolName,
  config: { title: string; description: string; inputSchema: S; annotations: ToolAnnotations },
  fn: (args: z.output<S>, ctx: ToolCtx) => Promise<object>
) {
  // The SDK's callback type is conditional on S, which TypeScript can't resolve for a generic S,
  // so cast here. Callers stay typed through `fn`; the SDK validates args against inputSchema.
  const cb = (async (args: unknown, ctx: ServerContext) =>
    runTool(name, ctx.http?.authInfo, (c) => fn(args as z.output<S>, c))) as unknown as ToolCallback<S>;
  server.registerTool<StandardSchemaWithJSON, S>(name, config, cb);
}

export function mustCount(res: { count: number | null; error: unknown }): number {
  if (res.error) throw res.error;
  return res.count ?? 0;
}

/** Reads past PostgREST's per-request row cap, page by page. The query must have a stable order. */
export async function fetchPaged<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  max = 20_000,
  size = 1_000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += size) {
    const rows = must(await page(from, from + size - 1)) ?? [];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Habits: streaks are computed from habit_logs, never from habits.current_streak.
// custom_days is ignored because web and mobile disagree on its weekday index.
// ---------------------------------------------------------------------------

export type HabitRow = { id: string; name: string; icon: string | null; frequency: string; created_at: string };

export async function loadActiveHabits(sb: SupabaseClient, userId: string): Promise<HabitRow[]> {
  return must(
    await sb
      .from('habits')
      .select('id, name, icon, frequency, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(100)
  ) as HabitRow[];
}

/** habit_id → set of YYYY-MM-DD dates logged on or after `since`. */
export async function loadHabitLogs(
  sb: SupabaseClient,
  userId: string,
  since: string,
  habitIds?: string[]
): Promise<Map<string, Set<string>>> {
  const rows = await fetchPaged<{ habit_id: string; completed_date: string }>((from, to) => {
    let q = sb
      .from('habit_logs')
      .select('habit_id, completed_date')
      .eq('user_id', userId)
      .gte('completed_date', since);
    if (habitIds) q = q.in('habit_id', habitIds);
    return q.order('completed_date', { ascending: false }).order('id', { ascending: true }).range(from, to);
  });
  const map = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!map.has(r.habit_id)) map.set(r.habit_id, new Set());
    map.get(r.habit_id)!.add(String(r.completed_date).slice(0, 10));
  }
  return map;
}

import { calculateHabitStreak, type HabitSchedule } from '@/lib/habits/streak';

/** Consecutive days back from today, or from yesterday if today isn't logged yet, according to habit schedule. */
export function streakOf(
  days: Set<string> | undefined,
  today: string,
  habit?: HabitSchedule
): number {
  if (!days || days.size === 0) return 0;
  return calculateHabitStreak(habit || { frequency: 'daily' }, Array.from(days), today).currentStreak;
}

export function bestRun(
  days: Set<string> | undefined,
  from: string,
  to: string,
  habit?: HabitSchedule
): number {
  if (!days || days.size === 0) return 0;
  const filtered = [...days].filter((d) => d >= from && d <= to);
  return calculateHabitStreak(habit || { frequency: 'daily' }, filtered, to).bestStreak;
}

export function countIn(days: Set<string> | undefined, from: string, to: string): number {
  if (!days) return 0;
  let n = 0;
  for (const d of days) if (d >= from && d <= to) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Focus: pomodoro_sessions with focus_minutes > 0, by local day of started_at.
// focus_minutes is already the row total; never multiply by sets.
// ---------------------------------------------------------------------------

export type SessionRow = { focus_minutes: number; started_at: string; task_id: string | null };

export async function loadSessions(
  sb: SupabaseClient,
  userId: string,
  range: { gte: string; lt: string }
): Promise<SessionRow[]> {
  return fetchPaged<SessionRow>((from, to) =>
    sb
      .from('pomodoro_sessions')
      .select('focus_minutes, started_at, task_id')
      .eq('user_id', userId)
      .gt('focus_minutes', 0)
      .gte('started_at', range.gte)
      .lt('started_at', range.lt)
      .order('started_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );
}

const UNLOCK_REASON_LABELS: Record<string, string> = {
  study: 'Studying or work',
  reply: 'Replying to someone',
  bored: 'Just bored',
  other: 'Something else',
};

export type BlockingStats = {
  attempts_blocked: number;
  unlocks_used: number;
  /** App name (Android) or null when the platform hides names (iOS) or nothing was blocked. */
  most_tempting_app: string | null;
  top_unlock_reason: string | null;
};

/**
 * Distraction-blocking totals for a range, read from the events the app syncs after each session.
 * Returns null when there's nothing to report or the blocking tables aren't available, so callers
 * can leave the field out instead of failing the whole tool.
 */
export async function loadBlockingStats(
  sb: SupabaseClient,
  userId: string,
  range: { gte: string; lt: string }
): Promise<BlockingStats | null> {
  let rows: { type: string; app_label: string | null; reason: string | null }[];
  try {
    rows = await fetchPaged((from, to) =>
      sb
        .from('blocking_events')
        .select('type, app_label, reason')
        .eq('user_id', userId)
        .gte('at', range.gte)
        .lt('at', range.lt)
        .order('at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );
  } catch {
    return null;
  }
  if (!rows.length) return null;

  const top = (counts: Map<string, number>) => [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const apps = new Map<string, number>();
  const reasons = new Map<string, number>();
  let attempts = 0;
  let unlocks = 0;
  for (const r of rows) {
    if (r.type === 'attempt') {
      attempts += 1;
      if (r.app_label) apps.set(r.app_label, (apps.get(r.app_label) ?? 0) + 1);
    } else if (r.type === 'unlock') {
      unlocks += 1;
      if (r.reason) reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    }
  }
  const reason = top(reasons);
  return {
    attempts_blocked: attempts,
    unlocks_used: unlocks,
    most_tempting_app: top(apps),
    top_unlock_reason: reason ? (UNLOCK_REASON_LABELS[reason] ?? reason) : null,
  };
}

export type TaskOut = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: string;
};
