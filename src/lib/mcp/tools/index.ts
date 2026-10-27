import 'server-only';
import type { McpServer } from '@modelcontextprotocol/server';
import { registerCreditTools } from './credits';
import { registerTodayTools } from './today';
import { registerTaskTools } from './tasks';
import { registerHabitTools } from './habits';
import { registerFocusTools } from './focus';
import { registerCountdownTools } from './countdowns';
import { registerNoteTools } from './notes';
import { registerReviewTools } from './review';

export function registerAllTools(server: McpServer, { writes }: { writes: boolean }) {
  registerTodayTools(server);
  registerTaskTools(server, { writes });
  registerHabitTools(server, { writes });
  registerFocusTools(server);
  registerCountdownTools(server, { writes });
  registerNoteTools(server);
  registerReviewTools(server);
  registerCreditTools(server);
}
