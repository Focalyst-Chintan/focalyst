import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { McpUserError, must, PHONE_NOTE } from '../run';
import { hhmm, localDateTime } from '../time';
import { clip } from '../text';
import { READ, dateSchema, defineTool, writeHints } from './shared';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  is_completed: boolean;
  completed_at: string | null;
};

export function registerTaskTools(server: McpServer, { writes }: { writes: boolean }) {
  defineTool(
    server,
    'list_tasks',
    {
      title: 'List tasks',
      description:
        "List the user's tasks, open by default, with optional due date range and priority filters. Use this when the user asks about specific tasks beyond today's overview.",
      inputSchema: z.object({
        status: z.enum(['open', 'completed', 'all']).default('open'),
        due_from: dateSchema.optional().describe('Earliest due date, YYYY-MM-DD'),
        due_to: dateSchema.optional().describe('Latest due date, YYYY-MM-DD'),
        priority: z.enum(['high', 'medium', 'low']).optional(),
        limit: z.number().int().min(1).max(50).default(25),
      }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      if (args.due_from && args.due_to && args.due_from > args.due_to) {
        throw new McpUserError('The start date must be on or before the end date.');
      }
      let q = sb
        .from('tasks')
        .select('id, title, description, due_date, due_time, priority, is_completed, completed_at')
        .eq('user_id', userId);
      if (args.status === 'open') q = q.eq('is_completed', false);
      if (args.status === 'completed') q = q.eq('is_completed', true);
      if (args.due_from) q = q.gte('due_date', args.due_from);
      if (args.due_to) q = q.lte('due_date', args.due_to);
      if (args.priority) q = q.eq('priority', args.priority);

      if (args.status === 'completed') {
        q = q.order('completed_at', { ascending: false, nullsFirst: false });
      } else {
        if (args.status === 'all') q = q.order('is_completed', { ascending: true });
        q = q.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      }

      const rows = (must(await q.limit(args.limit)) ?? []) as TaskRow[];
      if (args.status !== 'completed') {
        // Same due date: high, then medium, then low (sort is stable)
        rows.sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          if (a.due_date !== b.due_date) {
            if (a.due_date === null) return 1;
            if (b.due_date === null) return -1;
            return a.due_date < b.due_date ? -1 : 1;
          }
          return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
        });
      }

      return {
        tasks: rows.map((t) => ({
          id: t.id,
          title: t.title,
          description: clip(t.description, 300),
          due_date: t.due_date,
          due_time: hhmm(t.due_time),
          priority: t.priority,
          is_completed: t.is_completed,
          completed_at_local: localDateTime(t.completed_at, tz),
        })),
        count: rows.length,
      };
    }
  );

  if (!writes) return;

  defineTool(
    server,
    'create_task',
    {
      title: 'Add a task',
      description:
        "Add a task to the user's Focalyst task list, with an optional due date, time, priority and description. Confirm the details with the user before calling.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(200),
        due_date: dateSchema.optional().describe('YYYY-MM-DD in the user time zone'),
        due_time: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM, 24 hour')
          .optional()
          .describe('HH:MM, 24 hour'),
        priority: z.enum(['high', 'medium', 'low']).default('medium'),
        description: z.string().max(2000).optional(),
      }),
      annotations: writeHints(false),
    },
    async (args, { sb, callId }) => {
      const created = must(
        await sb.rpc('mcp_create_task', {
          p_call_id: callId,
          p_title: args.title,
          p_description: args.description ?? null,
          p_due_date: args.due_date ?? null,
          p_due_time: args.due_time ? `${args.due_time}:00` : null,
          p_priority: args.priority,
        })
      );
      return { created, note: PHONE_NOTE };
    }
  );

  defineTool(
    server,
    'complete_task',
    {
      title: 'Complete a task',
      description:
        'Mark one of the user\'s open tasks as completed, using its id from list_tasks or get_today. Confirm the details with the user before calling.',
      inputSchema: z.object({ task_id: z.uuid() }),
      annotations: writeHints(true),
    },
    async (args, { sb, callId }) => {
      const completed = must(await sb.rpc('mcp_complete_task', { p_call_id: callId, p_task_id: args.task_id }));
      return { completed, note: PHONE_NOTE };
    }
  );
}
