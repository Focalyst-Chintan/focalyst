import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { must, PHONE_NOTE } from '../run';
import { daysBetween, todayIn } from '../time';
import { READ, dateSchema, defineTool, writeHints } from './shared';

export function registerCountdownTools(server: McpServer, { writes }: { writes: boolean }) {
  defineTool(
    server,
    'list_countdowns',
    {
      title: 'List countdowns',
      description:
        "List the user's active countdowns to upcoming dates such as exams or trips, with days left. Past countdowns are included only if asked.",
      inputSchema: z.object({ include_past: z.boolean().default(false) }),
      annotations: READ,
    },
    async (args, { sb, userId, tz }) => {
      const today = todayIn(tz);
      let q = sb
        .from('countdowns')
        .select('id, event_name, icon, target_date')
        .eq('user_id', userId)
        .eq('is_active', true);
      if (!args.include_past) q = q.gte('target_date', today);
      const rows = (must(await q.order('target_date', { ascending: true }).limit(50)) ?? []) as {
        id: string;
        event_name: string;
        icon: string | null;
        target_date: string;
      }[];
      return {
        countdowns: rows.map((c) => ({
          id: c.id,
          name: c.event_name,
          icon: c.icon,
          date: c.target_date,
          days_left: daysBetween(today, c.target_date),
        })),
      };
    }
  );

  if (!writes) return;

  defineTool(
    server,
    'create_countdown',
    {
      title: 'Add a countdown',
      description:
        'Add a countdown to a date that is today or later, such as an exam or a trip, with an optional emoji icon. Confirm the details with the user before calling.',
      inputSchema: z.object({
        name: z.string().trim().min(1).max(80),
        date: dateSchema.describe('YYYY-MM-DD, today or later'),
        icon: z.string().trim().max(16).optional().describe('One emoji'),
      }),
      annotations: writeHints(false),
    },
    async (args, { sb, callId }) => {
      const created = must(
        await sb.rpc('mcp_create_countdown', {
          p_call_id: callId,
          p_name: args.name,
          p_target_date: args.date,
          p_icon: args.icon || null,
        })
      );
      return { created, note: PHONE_NOTE };
    }
  );
}
