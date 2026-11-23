import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FREE_TIER_LIMITS } from '@/lib/featureGates';
import { localDateStr } from '@/lib/utils/date';

export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export const CHAT_TOOLS: OpenAIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description:
        'Creates a new habit in the user habit tracker. Always call this when the user asks to add, create, or start a habit.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Concise name of the habit (e.g., "Morning Gym").' },
          frequency: {
            type: 'string',
            enum: ['daily', 'custom'],
            description: 'Habit frequency. Use "daily" for every day / every morning.',
          },
          custom_days: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Array of day numbers 0=Sun..6=Sat when frequency is "custom".',
          },
          icon: { type: 'string', description: 'Single emoji icon for the habit.' },
          color: { type: 'string', description: 'Hex color string (e.g., "#3B82F6").' },
          reminder_time: {
            type: 'string',
            description: 'Start/reminder time in 24-hour HH:MM:00 format (e.g., "04:30:00").',
          },
          duration_minutes: {
            type: 'integer',
            description: 'Optional duration in minutes if the user specifies a time range.',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Creates a new task in the user planner.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Concise task title.' },
          description: { type: 'string', description: 'Optional task notes.' },
          due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format (or "today"/"tomorrow").' },
          due_time: { type: 'string', description: 'Due time (e.g., "14:00:00" or "2:00 PM").' },
          start_time: { type: 'string', description: 'Start time if scheduled.' },
          end_time: { type: 'string', description: 'End time if scheduled.' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Marks an existing active task as completed in the user planner.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'UUID of the task if known.' },
          title: { type: 'string', description: 'Title of the task to complete if UUID is not known.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Updates an existing task in the user planner.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'UUID of the task.' },
          title: { type: 'string', description: 'New title.' },
          due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format.' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Creates a calendar event or reminder in the Plan tab Calendar.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title.' },
          day: { type: 'string', description: 'Event date in YYYY-MM-DD format.' },
          start_time: { type: 'string', description: 'Event start time, e.g., "08:00 AM".' },
          end_time: { type: 'string', description: 'Event end time, e.g., "09:00 AM".' },
          all_day: { type: 'boolean', description: 'Whether the event is all-day.' },
        },
        required: ['title', 'day'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_countdown',
      description: 'Creates an event countdown for a verified target date.',
      parameters: {
        type: 'object',
        properties: {
          event_name: { type: 'string', description: 'Name of the countdown event.' },
          target_date: { type: 'string', description: 'Exact target date in YYYY-MM-DD format.' },
          color: { type: 'string', description: 'Hex color string for the countdown card.' },
          icon: { type: 'string', description: 'Emoji icon for the event.' },
        },
        required: ['event_name', 'target_date'],
      },
    },
  },
];

const FREE_PLANS = new Set(['', 'free', 'none', 'expired', 'cancelled', 'canceled', 'inactive']);
const PERMANENT_PLANS = new Set(['lifetime']);

export function isProPlan(plan?: string | null, expiresAt?: string | null, now = Date.now()): boolean {
  const p = (plan ?? '').trim().toLowerCase();
  if (FREE_PLANS.has(p)) return false;
  if (PERMANENT_PLANS.has(p)) return true;
  if (!expiresAt) return true;
  const end = new Date(expiresAt).getTime();
  return Number.isNaN(end) || end >= now;
}

function getLocalDateInTz(tz: string, offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return localDateStr(d);
  }
}

function sanitizeDate(rawDate: unknown, tz: string): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const trimmed = rawDate.trim().toLowerCase();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') return null;
  if (trimmed === 'today') return getLocalDateInTz(tz, 0);
  if (trimmed === 'tomorrow') return getLocalDateInTz(tz, 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(rawDate);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().split('T')[0];
  return null;
}

function sanitizeTime(rawTime: unknown): string | null {
  if (!rawTime || typeof rawTime !== 'string') return null;
  let trimmed = rawTime.trim();
  if (!trimmed || ['null', 'undefined', 'none'].includes(trimmed.toLowerCase())) return null;

  // If a range like "4:30 a.m. to 9 am" was passed, extract the start time
  const rangeSplit = trimmed.split(/\s*(?:to|-|–|—)\s*/i);
  if (rangeSplit.length > 1 && rangeSplit[0]) {
    trimmed = rangeSplit[0].trim();
  }

  // Normalize "a.m." / "p.m." -> "am" / "pm"
  const normalizedAmPm = trimmed.replace(/\./g, '');
  const ampmMatch = normalizedAmPm.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(':');
    const h = String(parseInt(parts[0], 10)).padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const s = (parts[2] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  return null;
}

function isMissingColumnError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return code === 'PGRST204' || msg.includes('column') || msg.includes('schema cache');
}

export interface ChatToolExecutionContext {
  userId: string;
  supabase: SupabaseClient;
  tz: string;
  isPro: boolean;
}

export async function executeChatTool(
  toolName: string,
  args: Record<string, any>,
  ctx: ChatToolExecutionContext
): Promise<{ ok: boolean; [key: string]: any }> {
  const { userId, supabase, tz, isPro } = ctx;

  try {
    switch (toolName) {
      case 'create_habit': {
        const habitName = String(args?.name || '').trim();
        if (!habitName) {
          return { ok: false, error: 'Habit name is required.' };
        }

        if (!isPro) {
          const { count } = await supabase
            .from('habits')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true);

          if (count !== null && count >= FREE_TIER_LIMITS.habits) {
            return {
              ok: false,
              error: `Free plan limit reached: Free accounts support up to ${FREE_TIER_LIMITS.habits} active habits. Upgrade to Pro for unlimited habits.`,
            };
          }
        }

        const isDaily = args?.frequency !== 'custom';
        const customDays = isDaily
          ? null
          : Array.isArray(args?.custom_days)
            ? args.custom_days
                .map((d: any) => Number(d))
                .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
            : [];

        const reminderTime = sanitizeTime(args?.reminder_time);

        let nextPosition = 0;
        try {
          const { data: posRows } = await supabase
            .from('habits')
            .select('position')
            .eq('user_id', userId)
            .order('position', { ascending: false })
            .limit(1);
          if (posRows && posRows.length > 0 && typeof posRows[0].position === 'number') {
            nextPosition = posRows[0].position + 1;
          }
        } catch {}

        const corePayload: Record<string, any> = {
          user_id: userId,
          name: habitName,
          frequency: isDaily ? 'daily' : 'custom',
          custom_days: customDays,
          icon: typeof args?.icon === 'string' && args.icon.trim() ? args.icon.trim() : '🎯',
          color: typeof args?.color === 'string' && args.color.trim() ? args.color.trim() : '#3B82F6',
          reminder_time: reminderTime,
          current_streak: 0,
          longest_streak: 0,
          is_active: true,
          position: nextPosition,
        };

        const extendedPayload: Record<string, any> = { ...corePayload };
        if (typeof args?.duration_minutes === 'number' && args.duration_minutes > 0) {
          extendedPayload.duration_minutes = Math.round(args.duration_minutes);
        }

        let res = await supabase.from('habits').insert([extendedPayload]).select().single();
        if (res.error && isMissingColumnError(res.error)) {
          res = await supabase.from('habits').insert([corePayload]).select().single();
          if (res.error && isMissingColumnError(res.error)) {
            const { position: _pos, ...minimalPayload } = corePayload;
            res = await supabase.from('habits').insert([minimalPayload]).select().single();
          }
        }

        if (res.error) {
          return { ok: false, error: res.error.message || 'Failed to create habit.' };
        }
        return { ok: true, habit: res.data };
      }

      case 'create_task': {
        const title = String(args?.title || args?.name || '').trim();
        if (!title) {
          return { ok: false, error: 'Task title is required.' };
        }

        const rawPriority = typeof args?.priority === 'string' ? args.priority.toLowerCase().trim() : '';
        const priority = ['high', 'medium', 'low'].includes(rawPriority) ? rawPriority : 'medium';

        const payload: Record<string, any> = {
          id: crypto.randomUUID(),
          user_id: userId,
          title,
          description: typeof args?.description === 'string' && args.description.trim() ? args.description.trim() : null,
          due_date: sanitizeDate(args?.due_date, tz) ?? getLocalDateInTz(tz, 0),
          due_time: sanitizeTime(args?.due_time),
          start_time: sanitizeTime(args?.start_time),
          end_time: sanitizeTime(args?.end_time),
          priority,
          tags: Array.isArray(args?.tags) ? args.tags : [],
          is_completed: false,
          position: 0,
        };

        const { data, error } = await supabase.from('tasks').upsert([payload], { onConflict: 'id' }).select().single();
        if (error) {
          return { ok: false, error: error.message || 'Failed to create task.' };
        }
        return { ok: true, task: data };
      }

      case 'complete_task': {
        let taskId = typeof args?.task_id === 'string' ? args.task_id.trim() : '';
        if (!taskId && typeof args?.title === 'string' && args.title.trim()) {
          const { data: matches } = await supabase
            .from('tasks')
            .select('id, title')
            .eq('user_id', userId)
            .eq('is_completed', false)
            .ilike('title', args.title.trim())
            .limit(1);
          if (matches && matches.length > 0) {
            taskId = matches[0].id;
          }
        }

        if (!taskId) {
          return { ok: false, error: 'Could not find a matching active task to complete.' };
        }

        const { data, error } = await supabase
          .from('tasks')
          .update({ is_completed: true, completed_at: new Date().toISOString() })
          .eq('id', taskId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          return { ok: false, error: error.message || 'Failed to complete task.' };
        }
        return { ok: true, task: data };
      }

      case 'update_task': {
        const taskId = typeof args?.task_id === 'string' ? args.task_id.trim() : '';
        if (!taskId) {
          return { ok: false, error: 'task_id is required.' };
        }

        const updatePayload: Record<string, any> = {};
        if (typeof args?.title === 'string' && args.title.trim()) updatePayload.title = args.title.trim();
        const dueDate = sanitizeDate(args?.due_date, tz);
        if (dueDate) updatePayload.due_date = dueDate;
        if (typeof args?.priority === 'string' && ['high', 'medium', 'low'].includes(args.priority)) {
          updatePayload.priority = args.priority;
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(updatePayload)
          .eq('id', taskId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          return { ok: false, error: error.message || 'Failed to update task.' };
        }
        return { ok: true, task: data };
      }

      case 'create_calendar_event': {
        const title = String(args?.title || '').trim();
        const day = sanitizeDate(args?.day, tz);
        if (!title || !day) {
          return { ok: false, error: 'Event title and valid day (YYYY-MM-DD) are required.' };
        }

        const payload = {
          user_id: userId,
          title,
          day,
          start_time: typeof args?.start_time === 'string' && args.start_time.trim() ? args.start_time.trim() : '08:00 AM',
          end_time: typeof args?.end_time === 'string' && args.end_time.trim() ? args.end_time.trim() : '09:00 AM',
          all_day: Boolean(args?.all_day),
          repeat: 'Never',
          repeat_mode: 'Never',
        };

        const { data, error } = await supabase.from('reminders').insert([payload]).select().single();
        if (error) {
          return { ok: false, error: error.message || 'Failed to create calendar event.' };
        }
        return { ok: true, event: data };
      }

      case 'create_countdown': {
        const eventName = String(args?.event_name || '').trim();
        const targetDate = sanitizeDate(args?.target_date, tz);
        if (!eventName || !targetDate) {
          return { ok: false, error: 'event_name and valid target_date (YYYY-MM-DD) are required.' };
        }

        if (!isPro) {
          const { count } = await supabase
            .from('countdowns')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true);

          if (count !== null && count >= FREE_TIER_LIMITS.countdowns) {
            return {
              ok: false,
              error: `Free plan limit reached: Free accounts support ${FREE_TIER_LIMITS.countdowns} active countdown. Upgrade to Pro for unlimited countdowns.`,
            };
          }
        }

        const payload = {
          user_id: userId,
          event_name: eventName,
          target_date: targetDate,
          icon: typeof args?.icon === 'string' && args.icon.trim() ? args.icon.trim() : '📅',
          color: typeof args?.color === 'string' && args.color.trim() ? args.color.trim() : '#2563EB',
          is_active: true,
        };

        const { data, error } = await supabase.from('countdowns').insert([payload]).select().single();
        if (error) {
          return { ok: false, error: error.message || 'Failed to create countdown.' };
        }
        return { ok: true, countdown: data };
      }

      default:
        return { ok: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Tool execution failed.' };
  }
}
