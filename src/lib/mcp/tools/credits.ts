import 'server-only';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import { MCP_DAILY_BONUS } from '../config';
import { must } from '../run';
import { localDate } from '../time';
import { READ, defineTool } from './shared';

export function registerCreditTools(server: McpServer) {
  defineTool(
    server,
    'get_credits',
    {
      title: 'Check Focalyst credits',
      description:
        "Check how many Focalyst MCP credits the user has left, when they refill and what each action costs. Use this when the user asks about credits or limits.",
      inputSchema: z.object({}),
      annotations: READ,
    },
    async (_args, { sb, tz, credits }) => {
      const [prices, cfg] = await Promise.all([
        sb.from('mcp_tool_costs').select('tool, label, cost').order('sort', { ascending: true }).limit(50),
        sb.from('mcp_config').select('daily_bonus').limit(1).maybeSingle(),
      ]);
      return {
        remaining: credits.balance,
        monthly_credits: credits.monthly,
        refills_on: localDate(credits.resetsAt, tz),
        daily_bonus: must(cfg)?.daily_bonus ?? MCP_DAILY_BONUS,
        prices: must(prices) ?? [],
      };
    }
  );
}
