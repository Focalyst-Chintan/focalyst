import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { FOCALYST_AI_PERSONA } from '../constants/focalystPersona';
import { AuthorizedUserContext } from './focalystContextService';
import { supabase } from '../utils/supabase';
import { awardXP } from '../utils/xpService';
import { queryCache } from '../utils/queryCache';

export class AIRateLimitError extends Error {
  public reason: string;
  public remaining: number;
  constructor(message: string, reason: string = 'RATE_LIMIT', remaining: number = 0) {
    super(message);
    this.name = 'AIRateLimitError';
    this.reason = reason;
    this.remaining = remaining;
  }
}

let lastChatRequestTimestamp = 0;
let lastVoiceRequestTimestamp = 0;
const MIN_CLIENT_COOLDOWN_MS = 2000;
export const MAX_USER_PROMPT_CHARS = 3000;
export const MAX_CHAT_HISTORY_MESSAGES = 10;
export const MAX_AUDIO_BASE64_LENGTH = 20 * 1024 * 1024; // ~15MB raw audio cap (~10 mins m4a)

/**
 * Multi-layer AI Gatekeeper:
 * 1. Instant 0ms client burst guard (blocks rapid button mashing).
 * 2. Atomic Supabase PostgreSQL RPC check (`check_and_increment_ai_quota`) tied to `auth.uid()`.
 */
export async function enforceAIRateLimit(actionType: 'chat' | 'voice'): Promise<void> {
  const now = Date.now();

  if (actionType === 'chat') {
    if (now - lastChatRequestTimestamp < MIN_CLIENT_COOLDOWN_MS) {
      throw new AIRateLimitError(
        'Please wait a couple of seconds before sending another message.',
        'RATE_LIMIT_BURST'
      );
    }
    lastChatRequestTimestamp = now;
  } else {
    if (now - lastVoiceRequestTimestamp < MIN_CLIENT_COOLDOWN_MS) {
      throw new AIRateLimitError(
        'Please wait a moment before starting another voice transcription.',
        'RATE_LIMIT_BURST'
      );
    }
    lastVoiceRequestTimestamp = now;
  }

  const { data, error } = await supabase.rpc('check_and_increment_ai_quota', {
    p_action_type: actionType,
  });

  if (error) {
    console.warn('[AIRateLimit] RPC warning:', error.message);
    // If unauthenticated, block immediately
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new AIRateLimitError('Please sign in to use Focalyst AI.', 'UNAUTHENTICATED');
    }
    return;
  }

  if (data && data.allowed === false) {
    throw new AIRateLimitError(
      data.message || 'Daily AI limit reached. Please try again tomorrow.',
      data.reason || 'DAILY_LIMIT_REACHED',
      data.remaining ?? 0
    );
  }
}

/**
 * Sanitizes and bounds chat messages so a malicious user cannot send huge token payloads.
 */
export function boundChatMessages(
  messages: Array<{ role: string; content: any }>
): Array<{ role: string; content: any }> {
  const recent = messages.slice(-MAX_CHAT_HISTORY_MESSAGES);
  return recent.map((msg) => {
    if (typeof msg.content === 'string' && msg.content.length > MAX_USER_PROMPT_CHARS) {
      return {
        ...msg,
        content: msg.content.slice(0, MAX_USER_PROMPT_CHARS) + '... [truncated for length]',
      };
    }
    return msg;
  });
}

export const FAST_MODEL = 'meta-llama/llama-3.1-8b-instruct';
export const REASONING_MODEL = 'meta-llama/llama-3.3-70b-instruct';

export const AI_MODELS = {
  LIGHTWEIGHT: FAST_MODEL,
  HEAVY_REASONING: REASONING_MODEL,
  WHISPER_PRIMARY: 'openai/whisper-large-v3-turbo',
  WHISPER_SECONDARY: 'openai/whisper-large-v3',
  GEMINI_BACKUP: 'gemini-3.8-flash',
} as const;

export const GROQ_MODELS = {
  LIGHT: AI_MODELS.LIGHTWEIGHT,
  HEAVY: AI_MODELS.HEAVY_REASONING,
  FALLBACK: AI_MODELS.HEAVY_REASONING,
  WHISPER_PRIMARY: AI_MODELS.WHISPER_PRIMARY,
  WHISPER_FALLBACK: AI_MODELS.WHISPER_SECONDARY,
} as const;

export const LIGHT_MODEL = AI_MODELS.LIGHTWEIGHT;
export const HEAVY_MODEL = AI_MODELS.HEAVY_REASONING;
export const FALLBACK_MODEL = AI_MODELS.HEAVY_REASONING;
export const WHISPER_MODEL = AI_MODELS.WHISPER_PRIMARY;
export const WHISPER_FALLBACK_MODEL = AI_MODELS.WHISPER_SECONDARY;
export const GEMINI_FALLBACK_MODEL = AI_MODELS.GEMINI_BACKUP;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface GroqChatResponse {
  content: string;
  modelUsed: string;
  toolsExecuted?: Array<{
    name: string;
    args: any;
    result: any;
  }>;
}

export function getOpenRouterApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    ''
  );
}

export function getGeminiApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ''
  );
}

export function getGroqApiKey(): string {
  return getOpenRouterApiKey();
}

/**
 * Intelligent Router deciding between LIGHT and HEAVY model
 * based on conversation intent, complexity, and behavioral requirements.
 */
export function routeModelForQuery(message: string, context?: AuthorizedUserContext): string {
  const lower = message.toLowerCase().trim();

  // HEAVY triggers:
  // 1. Productivity Reports & Starter Chip queries ("How productive was I this week?", "What should I focus on today?")
  if (
    lower.includes('what should i focus on today') ||
    lower.includes('what to focus on') ||
    lower.includes('how productive') ||
    lower.includes('weekly report') ||
    lower.includes('productivity report') ||
    lower.includes('summarise my week') ||
    lower.includes('summarize my week') ||
    lower.includes('my productivity') ||
    lower.includes('weekly breakdown')
  ) {
    return GROQ_MODELS.HEAVY;
  }

  // 2. Habit Pattern & Consistency Analysis
  if (
    lower.includes('missed') ||
    lower.includes('habit pattern') ||
    lower.includes('analyse my habit') ||
    lower.includes('analyze my habit') ||
    lower.includes('why do i keep missing') ||
    lower.includes('habit streak') ||
    lower.includes('gym habit') ||
    lower.includes('workout habit') ||
    lower.includes('consistency')
  ) {
    return GROQ_MODELS.HEAVY;
  }

  // 3. Planning & Scheduling from goals/deadlines (Section 9)
  if (
    lower.includes('exam in') ||
    lower.includes('study plan') ||
    lower.includes('project plan') ||
    lower.includes('day-by-day') ||
    lower.includes('schedule my') ||
    lower.includes('help me plan') ||
    lower.includes('prepare for')
  ) {
    return GROQ_MODELS.HEAVY;
  }

  // 4. Emotional difficulty & Procrastination coaching (Section 13)
  if (
    lower.includes('wasted the day') ||
    lower.includes('wasted my day') ||
    lower.includes('procrastinated') ||
    lower.includes('feel like a failure') ||
    lower.includes('achieve anything') ||
    lower.includes('overwhelmed') ||
    lower.includes('discouraged') ||
    lower.includes("can't focus") ||
    lower.includes('unmotivated')
  ) {
    return GROQ_MODELS.HEAVY;
  }

  // 5. Notes & Synthesis
  if (
    lower.includes('synthesize') ||
    lower.includes('synthesise') ||
    lower.includes('my notes say') ||
    lower.includes('across my notes') ||
    lower.includes('compare my notes')
  ) {
    return GROQ_MODELS.HEAVY;
  }

  // 6. Reflective coaching & Bottleneck challenge (Section 12)
  if (
    lower.includes('how can i improve') ||
    lower.includes('what should i change') ||
    lower.includes('bottleneck') ||
    lower.includes('critique my')
  ) {
    return GROQ_MODELS.HEAVY;
  }

  // Default to LIGHT model for simple direct commands, factual QA, and quick turns
  return GROQ_MODELS.LIGHT;
}

/**
 * Definition of executable tools supported by Focalyst AI
 */
export const GROQ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Creates a new task in the user planner when explicitly requested. Never call this without explicit user command or confirmation.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title or description of the task' },
          description: { type: 'string', description: 'Optional additional notes for the task' },
          due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
          due_time: { type: 'string', description: 'Due time in HH:MM:SS or HH:MM format' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority level' },
          start_time: { type: 'string', description: 'Optional start time string (e.g. 09:00 AM)' },
          end_time: { type: 'string', description: 'Optional end time string (e.g. 10:00 AM)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags array' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Marks an existing task as completed in the user planner.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'UUID of the task if known' },
          title: { type: 'string', description: 'Title of the task to complete if UUID is not known' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Updates an existing task in the planner.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'UUID of the task' },
          title: { type: 'string', description: 'New title' },
          due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Creates a new habit in the user habit tracker when explicitly requested. Never create without explicit confirmation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the habit' },
          frequency: { type: 'string', enum: ['daily', 'custom'], description: 'Habit frequency' },
          custom_days: { type: 'array', items: { type: 'integer' }, description: 'Array of day numbers 0=Sun..6=Sat' },
          icon: { type: 'string', description: 'Emoji icon for habit' },
          color: { type: 'string', description: 'Hex color string' },
          reminder_time: { type: 'string', description: 'Reminder time (e.g. 08:00:00)' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Creates a calendar event / reminder in the Plan tab Calendar for a specific date and time.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          day: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
          start_time: { type: 'string', description: 'Event start time, e.g. 08:00 AM' },
          end_time: { type: 'string', description: 'Event end time, e.g. 09:00 AM' },
          all_day: { type: 'boolean', description: 'Whether the event is all-day' },
        },
        required: ['title', 'day'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_countdown',
      description: 'Creates an event day countdown for a verified target date. Date must be confirmed before calling.',
      parameters: {
        type: 'object',
        properties: {
          event_name: { type: 'string', description: 'Name of the countdown event (e.g. Final Exam)' },
          target_date: { type: 'string', description: 'Exact target date in YYYY-MM-DD format' },
          color: { type: 'string', description: 'Hex color string for the countdown card' },
          icon: { type: 'string', description: 'Emoji icon for the event' },
        },
        required: ['event_name', 'target_date'],
      },
    },
  },
];

/**
 * Sanitizes and normalizes date strings passed by LLMs into valid YYYY-MM-DD or null.
 */
function sanitizeDate(rawDate: any, currentDateStr?: string): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const trimmed = rawDate.trim().toLowerCase();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') return null;

  const today = currentDateStr ? new Date(currentDateStr) : new Date();

  if (trimmed === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (trimmed === 'tomorrow') {
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  }

  // Strict YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Attempt parse
  const parsed = Date.parse(rawDate);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  return null;
}

/**
 * Sanitizes and normalizes time strings into valid HH:MM or HH:MM:SS format or null.
 */
function sanitizeTime(rawTime: any): string | null {
  if (!rawTime || typeof rawTime !== 'string') return null;
  const trimmed = rawTime.trim();
  if (!trimmed || ['null', 'undefined', 'none'].includes(trimmed.toLowerCase())) return null;

  // 12-hour AM/PM string handling: e.g. "9:00 AM", "5pm", "11:30 PM"
  const ampmMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === 'pm';

    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }

  // Valid 24-hour HH:MM:SS or HH:MM
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(':');
    const h = String(parseInt(parts[0], 10)).padStart(2, '0');
    const m = parts[1];
    const s = parts[2] || '00';
    return `${h}:${m}:${s}`;
  }

  return null;
}

/**
 * Extracts and cleans a task title from LLM arguments or voice transcripts.
 */
function extractTaskTitle(args: any): string {
  let title = (args.title || args.name || args.task || args.description || '').trim();
  if (!title) return 'New Task';

  // Strip conversational voice artifacts like "it's Chemistry", "name it Chemistry", "task called ..."
  title = title
    .replace(/^name\s+it\s+('|"|is)?/i, '')
    .replace(/^called\s+('|"|is)?/i, '')
    .replace(/^named\s+('|"|is)?/i, '')
    .replace(/^it['’]s\s+/i, '')
    .trim();

  // Strip wrapping quotes
  if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
    title = title.slice(1, -1).trim();
  }

  return title || 'New Task';
}

/**
 * Executes a tool against Supabase for the current user and returns the result.
 */
export async function executeTool(
  toolName: string,
  args: any,
  userId: string,
  context: AuthorizedUserContext
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (toolName) {
      case 'create_task': {
        const rawPriority = typeof args.priority === 'string' ? args.priority.toLowerCase().trim() : '';
        const priority = ['high', 'medium', 'low'].includes(rawPriority) ? rawPriority : 'medium';
        const title = extractTaskTitle(args);
        const todayStr = context?.system_clock?.current_local_date;

        const dueDate = sanitizeDate(args.due_date, todayStr);
        const dueTime = sanitizeTime(args.due_time);
        const startTime = sanitizeTime(args.start_time);
        const endTime = sanitizeTime(args.end_time);

        const payload: any = {
          user_id: userId,
          title,
          description: args.description?.trim() || null,
          due_date: dueDate,
          due_time: dueTime,
          priority,
          start_time: startTime,
          end_time: endTime,
          tags: Array.isArray(args.tags) ? args.tags : [],
          is_completed: false,
          position: 0,
        };

        const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
        if (error) throw error;

        // Invalidate Plan tab cache immediately so newly created task is visible instantly
        queryCache.invalidatePrefix(`user:${userId}:tasks`);
        queryCache.invalidatePrefix('user:');

        return { success: true, data: { id: data.id, title: data.title, due_date: data.due_date } };
      }

      case 'complete_task': {
        let taskId = args.task_id;
        if (!taskId && args.title) {
          const found = context.tasks.active_tasks.find(
            (t) => t.title.toLowerCase().trim() === args.title.toLowerCase().trim()
          );
          if (found) taskId = found.id;
        }

        if (!taskId) {
          return { success: false, error: 'Could not find a matching active task to complete.' };
        }

        const { error } = await supabase
          .from('tasks')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) throw error;
        await awardXP(8, 'Task Completed');
        return { success: true, data: { taskId, status: 'completed', xpAwarded: 8 } };
      }

      case 'update_task': {
        const updatePayload: any = {};
        if (args.title) updatePayload.title = args.title.trim();
        if (args.due_date) updatePayload.due_date = args.due_date;
        if (args.priority && ['high', 'medium', 'low'].includes(args.priority)) {
          updatePayload.priority = args.priority;
        }

        const { error } = await supabase
          .from('tasks')
          .update(updatePayload)
          .eq('id', args.task_id)
          .eq('user_id', userId);

        if (error) throw error;
        return { success: true, data: { taskId: args.task_id, updated: updatePayload } };
      }

      case 'create_habit': {
        if (!context.user.isProEntitled && context.habits.habit_items.length >= 2) {
          return {
            success: false,
            error: 'Free plan limit reached: Free accounts support up to 2 active habits. Upgrade to Pro for unlimited habits.',
          };
        }

        const isDaily = args.frequency !== 'custom';
        const habitPayload: any = {
          user_id: userId,
          name: (args.name || '').trim(),
          frequency: isDaily ? 'daily' : 'custom',
          custom_days: isDaily ? null : args.custom_days || [],
          icon: args.icon || '⭐',
          color: args.color || '#4a6c8c',
          reminder_time: args.reminder_time || '08:00:00',
          current_streak: 0,
          longest_streak: 0,
          is_active: true,
        };

        const { data, error } = await supabase.from('habits').insert([habitPayload]).select().single();
        if (error) throw error;
        return { success: true, data: { id: data.id, name: data.name } };
      }

      case 'create_calendar_event': {
        const payload: any = {
          user_id: userId,
          title: (args.title || '').trim(),
          day: args.day,
          start_time: args.start_time || '08:00 AM',
          end_time: args.end_time || '09:00 AM',
          all_day: Boolean(args.all_day),
          repeat: 'Never',
          repeat_mode: 'Never',
        };

        const { data, error } = await supabase.from('reminders').insert([payload]).select().single();
        if (error) throw error;
        return { success: true, data: { id: data.id, title: data.title, day: data.day } };
      }

      case 'create_countdown': {
        if (!context.user.isProEntitled) {
          if (context.countdowns.length >= 1) {
            return {
              success: false,
              error: 'Free plan limit reached: Free accounts support 1 active countdown. Upgrade to Pro for unlimited countdowns.',
            };
          }
          if (args.target_date) {
            const daysAway = Math.ceil(
              (new Date(args.target_date).getTime() - new Date(context.system_clock.current_local_date).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            if (daysAway > 30) {
              return {
                success: false,
                error: 'Free plan limit: Countdowns can only be set up to 30 days in advance on the Free tier. Upgrade to Pro for unrestricted dates.',
              };
            }
          }
        }

        const payload: any = {
          user_id: userId,
          event_name: (args.event_name || '').trim(),
          target_date: args.target_date,
          icon: args.icon || '📅',
          color: args.color || '#2563EB',
          is_active: true,
        };

        const { data, error } = await supabase.from('countdowns').insert([payload]).select().single();
        if (error) throw error;
        return { success: true, data: { id: data.id, event_name: data.event_name, target_date: data.target_date } };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Tool execution failed' };
  }
}

/**
 * Builds the complete system prompt injecting:
 * 1. Verbatim FOCALYST_AI_PERSONA (all 17 sections)
 * 2. Real-time authorized user context
 * 3. Enforced subscription restrictions (Section 15)
 * 4. Deterministic local date/time reference
 */
export function buildSystemPrompt(context: AuthorizedUserContext): string {
  const contextJson = JSON.stringify(context, null, 2);

  const habitItems = context.habits?.habit_items || [];
  const habitListSummary =
    habitItems.length > 0
      ? habitItems
          .map(
            (h: any) =>
              `- "${h.name}" (Current Streak: ${h.exact_current_streak_days ?? h.current_streak ?? 0} days, Total Completed Days: ${h.exact_total_completed_days_all_time ?? h.total_days ?? 0} days)`
          )
          .join('\n')
      : 'NONE (The user has 0 habits recorded).';

  const antiHallucinationGuardrail = `
====================================================================
STRICT ZERO-HALLUCINATION & DATA INTEGRITY RULE (CRITICAL):
====================================================================
1. You MUST ONLY cite exact numbers, task titles, habit names, streaks, total days, and focus minutes that literally appear inside the REAL-TIME AUTHORIZED CONTEXT JSON.
2. NEVER invent, estimate, extrapolate, or fabricate any statistics, percentages, durations, standard deviations, task names (such as "Project Report"), or historical 30-day counts.
3. Focalyst habits DO NOT track duration in minutes or standard deviation—they ONLY track completion status, current streak days, and total completed days.
4. If the user's total focus time is 0 minutes (0h 0m), or they have only 1 completed task, or a habit only has 1 completed day, state those exact real numbers honestly (e.g., "You currently have 0h 0m of logged focus time and 1 completed task this week" or "You just started your Yoga habit with a 1-day streak and 1 total day completed").
5. Summary metrics for convenience:
   - Active tasks count: ${context.summary_metrics?.exact_active_tasks_count ?? context.tasks.active_tasks.length}
   - Completed tasks (last 7 days): ${context.summary_metrics?.exact_completed_tasks_count_last_7_days ?? 0}
   - Logged focus time (last 7 days): ${context.summary_metrics?.exact_total_focus_minutes_last_7_days ?? '0h 0m'}

====================================================================
EXACT HABITS IN THIS USER'S ACCOUNT:
${habitListSummary}

CRITICAL HABIT EXISTENCE & ALIAS RULE:
- The list above contains 100% of the habits recorded in this user's account.
- If the user asks about a habit that is NOT in the list above (for example, asking about a "meditation" habit when their only habit is "Yoga"):
  1. NEVER pretend or agree that they have a habit by that unrecorded name!
  2. NEVER invent a streak (such as "14-day streak" or "22 out of 30 days")!
  3. State clearly: "You don't have a [requested name] habit recorded in Focalyst. Your currently tracked habit is [exact stored habit name(s) from list above]." If one of their existing habits (like "Yoga") is closely related, you may offer to analyze "Yoga" using ONLY Yoga's exact stored numbers from the list above.
====================================================================`;

  return `${antiHallucinationGuardrail}

${FOCALYST_AI_PERSONA}

====================================================================
REAL-TIME AUTHORIZED CONTEXT FOR THE CURRENT USER
====================================================================
${contextJson}

CRITICAL EXECUTION INSTRUCTIONS:
- You have been provided the user's authentic database state above.
- Today is ${context.system_clock.current_day_of_week}, ${context.system_clock.current_local_date} (User timezone: ${context.system_clock.user_timezone}).
- For explicit action requests (e.g. "Add a task for tomorrow", "Remind me to review notes at 8pm"): call create_task or create_calendar_event and reply with a concise 1-sentence confirmation only AFTER the database insert succeeds.
- For "How productive was I this week?" or "What should I focus on today?": provide an evidence-backed breakdown using real tasks, habits, focus time, XP, and level data from the context above.
- Never cite external books or authors. Never recommend medical supplements.
- Respect autonomy: If user asks for an exam/study plan, propose the day-by-day plan first and ask for confirmation before calling create_task.
- Respect subscription entitlements: if productivity_score_access is "restricted_free_plan", do not state or reconstruct any productivity score.
- CRITICAL TOOL RULE: You already have the user's complete productivity, task, habit, workout, and XP data in the system context above. ONLY call a tool/function if the user is explicitly asking to CREATE, UPDATE, COMPLETE, or DELETE a task, habit, or reminder. For all questions, summaries, reports, or coaching (e.g., 'How productive was I this week?', 'Tell me about my workout habit', 'What should I focus on?'), answer directly using the system context WITHOUT calling any tool, and NEVER say a task exceeds the limitations of your functions.

${antiHallucinationGuardrail}
`;
}

/**
 * Unified AI completion engine:
 * 1. Primary: OpenRouter (meta-llama/llama-3.1-8b-instruct or meta-llama/llama-3.3-70b-instruct)
 * 2. Automatic Zero-Cost Safety Backup: Google Gemini (gemini-3.8-flash) via official OpenAI-compatible endpoint
 */
export async function executeChatCompletion({
  messages,
  mode = 'heavy',
  tools,
  tool_choice,
  temperature = 0.15,
  max_tokens = 2048,
  response_format,
}: {
  messages: any[];
  mode?: 'light' | 'heavy';
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
}): Promise<{ data: any; modelUsed: string }> {
  await enforceAIRateLimit('chat');
  const safeMessages = boundChatMessages(messages);

  const primaryModel =
    mode === 'light' ? AI_MODELS.LIGHTWEIGHT : AI_MODELS.HEAVY_REASONING;

  const openRouterApiKey = getOpenRouterApiKey();
  const geminiApiKey = getGeminiApiKey();

  // 1. Primary Execution via OpenRouter (131k context window, no 7k ITPM 413 bottlenecks)
  if (openRouterApiKey) {
    try {
      const requestBody: Record<string, any> = {
        model: primaryModel,
        messages: safeMessages,
        temperature,
        max_tokens: mode === 'light' ? Math.min(max_tokens, 700) : Math.min(max_tokens, 1200),
        provider: {
          sort: 'throughput',
          allow_fallbacks: true,
        },
      };
      if (tools && tools.length > 0) requestBody.tools = tools;
      if (tool_choice) requestBody.tool_choice = tool_choice;
      if (response_format) requestBody.response_format = response_format;

      const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://focalyst.online',
          'X-Title': 'Focalyst',
        },
        body: JSON.stringify(requestBody),
      });

      if (openRouterRes.ok) {
        const data = await openRouterRes.json();
        if (data?.choices?.[0]?.message) {
          return { data, modelUsed: primaryModel };
        }
      }

      const errText = await openRouterRes.text();
      if (__DEV__) {
        console.warn(
          `[Focalyst AI] OpenRouter (${primaryModel}) returned ${openRouterRes.status}: ${errText}. Failing over to ${AI_MODELS.GEMINI_BACKUP}...`
        );
      }
    } catch (openRouterErr) {
      if (__DEV__) {
        console.warn(
          `[Focalyst AI] OpenRouter network error on ${primaryModel}. Failing over to ${AI_MODELS.GEMINI_BACKUP}:`,
          openRouterErr
        );
      }
    }
  }

  // 2. Automatic Zero-Cost Safety Backup: Google Gemini
  if (geminiApiKey) {
    const geminiModels = [AI_MODELS.GEMINI_BACKUP, 'gemini-2.5-flash'];
    for (const geminiModel of geminiModels) {
      try {
        const geminiBody: Record<string, any> = {
          model: geminiModel,
          messages: safeMessages,
          temperature,
          max_tokens: mode === 'light' ? Math.min(max_tokens, 700) : Math.min(max_tokens, 1200),
        };
        if (geminiModel === AI_MODELS.GEMINI_BACKUP) {
          geminiBody.reasoning_effort = 'low';
        }
        if (tools && tools.length > 0) geminiBody.tools = tools;
        if (tool_choice) geminiBody.tool_choice = tool_choice;
        if (response_format) geminiBody.response_format = response_format;

        const geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${geminiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(geminiBody),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          if (data?.choices?.[0]?.message) {
            return { data, modelUsed: `google/${geminiModel}` };
          }
        } else {
          const geminiErr = await geminiRes.text();
          if (__DEV__) {
            console.warn(`[Focalyst AI] Gemini backup (${geminiModel}) failed (${geminiRes.status}): ${geminiErr}`);
          }
        }
      } catch (geminiNetworkErr) {
        if (__DEV__) {
          console.warn(`[Focalyst AI] Gemini backup (${geminiModel}) network error:`, geminiNetworkErr);
        }
      }
    }
  }

  throw new Error('Focalyst AI is temporarily unreachable. Please check your internet connection and try again.');
}

/**
 * Backwards-compatible low-level completion wrapper delegating to OpenRouter + Gemini 3.8 Flash failover
 */
export async function generateGroqCompletion(
  preferredModel: string,
  payloadWithoutModel: Record<string, any>
): Promise<{ result: any; modelUsed: string }> {
  const mode: 'light' | 'heavy' = preferredModel === AI_MODELS.LIGHTWEIGHT ? 'light' : 'heavy';
  const { data, modelUsed } = await executeChatCompletion({
    messages: payloadWithoutModel.messages || [],
    mode,
    tools: payloadWithoutModel.tools,
    tool_choice: payloadWithoutModel.tool_choice,
    temperature: payloadWithoutModel.temperature ?? 0.15,
    max_tokens: payloadWithoutModel.max_tokens,
    response_format: payloadWithoutModel.response_format,
  });
  return { result: data, modelUsed };
}

/**
 * Main AI Completion Router:
 * 1. Primary: OpenRouter (meta-llama/llama-3.1-8b-instruct for fast tasks, meta-llama/llama-3.3-70b-instruct for heavy coaching/reports)
 * 2. Automatic Zero-Cost Safety Backup: Google Gemini (gemini-3.8-flash)
 */
/**
 * Helper to detect if a user message is an analytical/informational query vs a mutation command.
 * Analytical / informational queries already have full data in the system prompt context.
 */
export function shouldAttachTools(userMessage: string, tools?: any[]): boolean {
  if (!tools || tools.length === 0) return false;
  const lower = userMessage.toLowerCase().trim();
  const isPureQuestion =
    /^(how|what|why|when|who|where|tell me|show me|summarize|summary|analyze|review|explain|did i|am i)\b/.test(lower) &&
    !/\b(add|create|remind|set|schedule|delete|remove|mark|complete|log|update)\b/.test(lower);
  return !isPureQuestion;
}

export async function sendChatMessageToGroq(
  userMessageText: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userId: string,
  context: AuthorizedUserContext
): Promise<GroqChatResponse> {
  const selectedModel = routeModelForQuery(userMessageText, context);
  const mode: 'light' | 'heavy' = selectedModel === AI_MODELS.LIGHTWEIGHT ? 'light' : 'heavy';
  const systemPrompt = buildSystemPrompt(context);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessageText },
  ];

  const toolsExecuted: Array<{ name: string; args: any; result: any }> = [];
  const attachTools = shouldAttachTools(userMessageText, GROQ_TOOLS);

  let { data, modelUsed } = await executeChatCompletion({
    messages,
    mode,
    temperature: 0.15,
    max_tokens: 1500,
    tools: attachTools ? GROQ_TOOLS : undefined,
    tool_choice: attachTools ? 'auto' : undefined,
  });

  let choice = data?.choices?.[0];
  if (!choice) {
    throw new Error('Focalyst AI returned an empty response.');
  }

  let assistantMessage = choice.message;

  // AUTO-INTERCEPT LLAMA FUNCTION REFUSALS:
  // If Llama 3.x outputs a function-limitation refusal, automatically re-run without tools
  if (
    assistantMessage?.content &&
    (assistantMessage.content.includes('exceeds the limitations of the functions') ||
      assistantMessage.content.includes('not able to execute this task'))
  ) {
    console.warn('[Focalyst AI] Detected Llama 3 tool-call refusal. Re-running in pure text mode...');
    const retryRes = await executeChatCompletion({
      messages,
      mode,
      temperature: 0.15,
      max_tokens: 1500,
      tools: undefined,
      tool_choice: undefined,
    });
    if (retryRes?.data?.choices?.[0]?.message) {
      data = retryRes.data;
      modelUsed = retryRes.modelUsed;
      choice = data.choices[0];
      assistantMessage = choice.message;
    }
  }

  // Handle Tool Calls if the model requested any database mutation
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        args = {};
      }

      const executionResult = await executeTool(toolName, args, userId, context);
      toolsExecuted.push({
        name: toolName,
        args,
        result: executionResult,
      });

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolName,
        content: JSON.stringify(executionResult),
      });
    }

    // Wrap the follow-up LLM confirmation in a try/catch.
    // If the database mutation succeeded, never throw an error to the user!
    try {
      const { data: followUpData, modelUsed: followUpModelUsed } = await executeChatCompletion({
        messages,
        mode,
        temperature: 0.15,
        max_tokens: 1200,
      });

      const finalContent =
        followUpData?.choices?.[0]?.message?.content ||
        (toolsExecuted.some((t) => t.result?.success)
          ? `Action executed successfully.`
          : 'Action completed.');

      return {
        content: finalContent,
        modelUsed: followUpModelUsed,
        toolsExecuted,
      };
    } catch (followUpErr) {
      console.warn('[Focalyst AI] Follow-up LLM confirmation error after tool execution:', followUpErr);
      // Construct deterministic confirmation message
      const successfulTask = toolsExecuted.find((t) => t.name === 'create_task' && t.result?.success);
      const successfulEvent = toolsExecuted.find((t) => t.name === 'create_calendar_event' && t.result?.success);
      const successfulCountdown = toolsExecuted.find((t) => t.name === 'create_countdown' && t.result?.success);

      let deterministicMsg = 'Action executed successfully.';
      if (successfulTask?.result?.data?.title) {
        deterministicMsg = `Added "${successfulTask.result.data.title}" to your tasks.`;
      } else if (successfulEvent?.result?.data?.title) {
        deterministicMsg = `Added event "${successfulEvent.result.data.title}" to your calendar.`;
      } else if (successfulCountdown?.result?.data?.event_name) {
        deterministicMsg = `Added countdown for "${successfulCountdown.result.data.event_name}".`;
      }

      return {
        content: deterministicMsg,
        modelUsed,
        toolsExecuted,
      };
    }
  }

  // FALLBACK INTENT DETECTOR FOR VOICE / CASUAL TASK CREATION:
  // If the user said "Add task..." or "Added task..." or "Remind me to...", but the LLM did not call the function
  const isExplicitAddTaskIntent =
    /^(add|added|create|set)\s+(a\s+)?task\b/i.test(userMessageText.trim()) ||
    /^task\s*:\s*/i.test(userMessageText.trim()) ||
    /\badd (a )?task to\b/i.test(userMessageText.trim());

  if (isExplicitAddTaskIntent && toolsExecuted.length === 0) {
    try {
      let rawTitle = userMessageText
        .replace(/^(add|added|create|set)\s+(a\s+)?task\s+(named|called|to|for|it['’]s|:)?\s*/i, '')
        .replace(/^task\s*:\s*/i, '')
        .trim();
      
      if (rawTitle.length > 0) {
        const fallbackExec = await executeTool('create_task', { title: rawTitle }, userId, context);
        if (fallbackExec.success && fallbackExec.data) {
          toolsExecuted.push({
            name: 'create_task',
            args: { title: rawTitle },
            result: fallbackExec,
          });
          return {
            content: `Added "${fallbackExec.data.title}" to your tasks.`,
            modelUsed,
            toolsExecuted,
          };
        }
      }
    } catch (e) {
      console.warn('[Focalyst AI] Fallback task creation attempt failed:', e);
    }
  }

  return {
    content: assistantMessage.content || '',
    modelUsed,
    toolsExecuted: [],
  };
}

export const sendChatMessage = sendChatMessageToGroq;

/**
 * Universal Audio Base64 Loader:
 * 1. Primary: Native Expo SDK 57 File API
 * 2. Secondary fallback: fetch(audioUri) -> blob() -> FileReader
 */
async function readAudioUriAsRawBase64(audioUri: string): Promise<string> {
  const normalizedUri = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;

  try {
    const expoFile = new File(normalizedUri);
    if (expoFile.exists && expoFile.size > 500) {
      const b64 = await expoFile.base64();
      if (b64 && b64.length > 100) {
        return b64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
      }
    }
  } catch (e) {
    console.warn('[AudioBase64] File.base64 fallback to FileReader:', e);
  }

  const response = await fetch(normalizedUri);
  const blob = await response.blob();
  if (blob.size < 500) {
    throw new Error('Recorded audio file is too short or empty.');
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('FileReader produced empty audio'));
        return;
      }
      const rawBase64 = result.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
      resolve(rawBase64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

export const readAudioAsBase64 = readAudioUriAsRawBase64;

function extractGemini38Text(geminiData: any): string {
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part: any) => !part?.thought && typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('')
    .trim();
}

const SILENCE_ARTIFACTS = new Set([
  'no_speech',
  '[no_speech]',
  'silence',
  '[silence]',
  'thank you.',
  'thanks for watching.',
  'subtitles by the amara.org community',
  '.',
  '...',
]);

function sanitizeTranscriptText(raw: string): string {
  const cleaned = (raw || '').trim();
  if (!cleaned) return '';
  if (SILENCE_ARTIFACTS.has(cleaned.toLowerCase())) return '';
  return cleaned;
}

export async function transcribeVoiceAudio(audioUri: string): Promise<string> {
  await enforceAIRateLimit('voice');

  const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || getOpenRouterApiKey() || '';
  const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || getGeminiApiKey() || '';

  const base64Audio = await readAudioUriAsRawBase64(audioUri);
  if (base64Audio.length > MAX_AUDIO_BASE64_LENGTH) {
    throw new AIRateLimitError('Recording exceeds the 10-minute maximum length.');
  }
  const extMatch = audioUri.toLowerCase().match(/\.(m4a|mp4|wav|mp3|webm|ogg|flac|aac)$/);
  const audioFormat = extMatch ? extMatch[1] : 'm4a';

  // 1A. Primary: OpenRouter STT with Whisper Large V3 Turbo / V3
  if (openRouterKey) {
    const whisperModels = ['openai/whisper-large-v3-turbo', 'openai/whisper-large-v3'];

    for (const modelId of whisperModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://focalyst.online',
            'X-Title': 'Focalyst',
          },
          body: JSON.stringify({
            model: modelId,
            input_audio: {
              data: base64Audio,
              format: audioFormat,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const transcript = sanitizeTranscriptText(
            data?.text || data?.choices?.[0]?.message?.content || ''
          );
          if (transcript) return transcript;
        } else {
          const errText = await response.text();
          if (__DEV__) {
            console.warn(`[OpenRouter STT] ${modelId} status ${response.status}:`, errText);
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.warn(`[OpenRouter STT] ${modelId} error:`, err);
        }
      }
    }

    // 1B. OpenRouter Multimodal Chat Completions Audio Fallback (uses same OpenRouter key)
    try {
      const orChatAudioRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://focalyst.online',
          'X-Title': 'Focalyst',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Transcribe the spoken words in this audio recording into clean text. Output ONLY what the speaker said. If silence, output an empty string.',
                },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: base64Audio,
                    format: audioFormat,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (orChatAudioRes.ok) {
        const orData = await orChatAudioRes.json();
        const transcript = sanitizeTranscriptText(
          orData?.choices?.[0]?.message?.content || ''
        );
        if (transcript) return transcript;
      }
    } catch (orChatErr) {
      if (__DEV__) {
        console.warn('[OpenRouter Chat Audio Fallback] Error:', orChatErr);
      }
    }
  }

  // 2. Backup: Direct Google Gemini API (gemini-3.8-flash -> gemini-2.5-flash)
  if (geminiKey) {
    const geminiModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
    for (const geminiModel of geminiModels) {
      try {
        const payload: Record<string, any> = {
          contents: [
            {
              parts: [
                {
                  text: 'Transcribe the spoken words in this audio recording into clean text. Output ONLY what the speaker said. If silence, output an empty string.',
                },
                {
                  inline_data: {
                    mime_type: 'audio/mp4',
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
        };
        if (geminiModel === 'gemini-3.8-flash') {
          payload.generationConfig = {
            thinkingConfig: { thinkingLevel: 'LOW' },
          };
        }

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const transcript = sanitizeTranscriptText(extractGemini38Text(geminiData));
          if (transcript) return transcript;
        }
      } catch (err) {
        if (__DEV__) {
          console.warn(`[Gemini ${geminiModel} STT Backup] Error:`, err);
        }
      }
    }
  }

  throw new Error('Could not detect clear speech in the recording. Please speak clearly and try again.');
}

export const transcribeAudioWithOpenRouter = transcribeVoiceAudio;
export const transcribeAudioWithWhisper = transcribeVoiceAudio;
export const transcribeAudio = transcribeVoiceAudio;


