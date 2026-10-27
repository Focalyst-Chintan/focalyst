import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthInfo, CallToolResult } from '@modelcontextprotocol/server';
import { userClient } from './auth';
import { MCP_DAILY_BONUS, MCP_PRO_MONTHLY_CREDITS } from './config';
import { localDate, safeTz, shortDateLabel } from './time';

export type ToolName =
  | 'get_credits'
  | 'get_today'
  | 'list_tasks'
  | 'list_habits'
  | 'get_habit_history'
  | 'get_focus_stats'
  | 'list_countdowns'
  | 'search_notes'
  | 'get_note'
  | 'get_weekly_review'
  | 'create_task'
  | 'complete_task'
  | 'create_habit'
  | 'log_habit'
  | 'create_countdown';

export type ToolCtx = {
  sb: SupabaseClient;
  userId: string;
  tz: string;
  callId: string;
  credits: { balance: number; monthly: number; resetsAt: string };
};

type BeginCall =
  | {
      ok: true;
      call_id: string;
      cost: number;
      balance: number;
      monthly_credits: number;
      resets_at: string;
      timezone: string;
    }
  | {
      ok: false;
      code: string;
      balance?: number;
      resets_at?: string;
      daily_bonus?: number;
      monthly_credits?: number;
    };

export const MSG = {
  signin: "Please reconnect Focalyst: sign-in has expired or isn't valid.",
  not_pro: 'Focalyst MCP is part of Focalyst Pro. The account owner can upgrade at focalyst.online/pricing.',
  rate_limited: "That's a lot of requests in one minute. Wait a moment, then try again.",
  revoked: 'This app was disconnected from Focalyst. Reconnect it from Focalyst settings → AI connections.',
  writes_off: 'This connection can only read. The user can allow changes in Focalyst settings → AI connections.',
  not_found: "I couldn't find that item in Focalyst. No credits were used.",
  server: "Focalyst couldn't complete that right now. No credits were used.",
} as const;

export const PHONE_NOTE =
  "It appears in the Focalyst phone app after a refresh. Phone reminders aren't set for items added here.";

/** A problem with the request that is safe to show to the user. */
export class McpUserError extends Error {}

/** Item missing or not owned by this user. */
export class McpNotFound extends Error {}

/** Every Supabase error is thrown, so a tool never returns partial data. */
export function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

function log(tool: string, userId: string, status: string, started: number) {
  console.log(`[mcp] tool=${tool} status=${status} ms=${Date.now() - started} user=${userId.slice(0, 8)}`);
}

function okResult(result: Record<string, unknown>): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
}

export function errorResult(msg: string): CallToolResult {
  return { content: [{ type: 'text', text: msg }], isError: true };
}

async function noCreditsMessage(
  sb: SupabaseClient,
  userId: string,
  b: { resets_at?: string; monthly_credits?: number; daily_bonus?: number }
) {
  const monthly = typeof b.monthly_credits === 'number' ? b.monthly_credits : MCP_PRO_MONTHLY_CREDITS;
  const bonus = typeof b.daily_bonus === 'number' ? b.daily_bonus : MCP_DAILY_BONUS;
  let tz = 'Asia/Kolkata';
  try {
    const user = await sb.from('users').select('timezone').eq('id', userId).maybeSingle();
    tz = safeTz(user.data?.timezone);
  } catch {
    // fall back to the default timezone
  }
  const when = b.resets_at ? shortDateLabel(b.resets_at, tz) : 'the next refill date';
  return `You've used all your Focalyst MCP credits for now. They refill to ${monthly.toLocaleString('en-US')} on ${when}. Opening Focalyst each day adds ${bonus} bonus credits.`;
}

async function messageFor(sb: SupabaseClient, userId: string, b: Extract<BeginCall, { ok: false }>) {
  switch (b.code) {
    case 'not_pro':
      return MSG.not_pro;
    case 'rate_limited':
      return MSG.rate_limited;
    case 'revoked':
      return MSG.revoked;
    case 'writes_off':
      return MSG.writes_off;
    case 'no_credits':
      return noCreditsMessage(sb, userId, b);
    default:
      // unauthenticated, not_oauth, unknown_tool
      return MSG.signin;
  }
}

function errCode(e: unknown): string {
  if (e instanceof McpUserError) return 'invalid_input';
  if (e instanceof McpNotFound) return 'not_found';
  const code = (e as { code?: unknown })?.code;
  return typeof code === 'string' && code ? code.slice(0, 40) : 'error';
}

function userMessage(e: unknown): string {
  if (e instanceof McpNotFound) return MSG.not_found;
  if (e instanceof McpUserError) return `${e.message} No credits were used.`;
  const err = e as { code?: string; message?: string };
  if (err?.code === 'P0002') return MSG.not_found;
  if (err?.code === '22023' && typeof err.message === 'string' && err.message.startsWith('mcp: ')) {
    const text = err.message.slice(5).trim();
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}. No credits were used.`;
  }
  return MSG.server;
}

/** The single wrapper every tool uses: charge credits, run, refund on failure. */
export async function runTool<T extends object>(
  tool: ToolName,
  authInfo: AuthInfo | undefined,
  fn: (ctx: ToolCtx) => Promise<T>
): Promise<CallToolResult> {
  const userId = typeof authInfo?.extra?.userId === 'string' ? authInfo.extra.userId : '';
  if (!authInfo || !userId) return errorResult(MSG.signin);
  const sb = userClient(authInfo.token);
  const started = Date.now();

  const { data, error } = await sb.rpc('mcp_begin_call', { p_tool: tool });
  const b = data as BeginCall | null;
  if (error || !b) {
    log(tool, userId, 'error', started);
    return errorResult(MSG.server);
  }
  if (!b.ok) {
    log(tool, userId, `denied:${b.code}`, started);
    return errorResult(await messageFor(sb, userId, b));
  }

  const tz = safeTz(b.timezone);
  try {
    const result = await fn({
      sb,
      userId,
      tz,
      callId: b.call_id,
      credits: { balance: b.balance, monthly: b.monthly_credits, resetsAt: b.resets_at },
    });
    await sb.rpc('mcp_end_call', { p_call_id: b.call_id, p_ok: true });
    log(tool, userId, 'ok', started);
    return okResult({
      ...result,
      timezone: tz,
      credits: { used: b.cost, remaining: b.balance, refills_on: localDate(b.resets_at, tz) },
    });
  } catch (e) {
    await sb.rpc('mcp_end_call', { p_call_id: b.call_id, p_ok: false, p_error: errCode(e) });
    log(tool, userId, 'error', started);
    return errorResult(userMessage(e));
  }
}
