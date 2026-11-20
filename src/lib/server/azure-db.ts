import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;

export function parseAzureConnectionString(connStr: string): PoolConfig {
  // If the password contains unencoded special characters like '@' or '#'
  // (e.g. postgresql://focalystadmin:F0c@lyst#Db2026!x9Z@focalyst-db-prod-02...)
  // standard URL parsing splits at the first '@' causing hostname to become 'lyst'.
  // We use regex to robustly parse the last '@' as the delimiter before the host.
  const regex = /^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/;
  const match = connStr.match(regex);
  if (match) {
    const [, user, password, host, port, database] = match;
    return {
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
    };
  }

  return { connectionString: connStr };
}

export function getAzurePool(): Pool | null {
  const connectionString = process.env.AZURE_POSTGRES_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    const config = parseAzureConnectionString(connectionString);
    pool = new Pool({
      ...config,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
  }

  return pool;
}

// ============================================================================
// Voice Notes
// ============================================================================

export interface VoiceNoteRecord {
  id: string;
  user_id: string;
  title: string;
  audio_blob_url: string | null;
  audio_url: string | null;
  duration_seconds: number;
  transcript: string | null;
  raw_transcript: string | null;
  summary: string | null;
  extracted_tasks: any;
  local_uri: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertVoiceNoteInput {
  id?: string;
  user_id: string;
  title?: string;
  audio_blob_url?: string | null;
  audio_url?: string | null;
  duration_seconds?: number;
  transcript?: string | null;
  raw_transcript?: string | null;
  summary?: string | null;
  extracted_tasks?: any;
  local_uri?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function insertVoiceNote(input: InsertVoiceNoteInput): Promise<VoiceNoteRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const query = `
    insert into public.voice_notes (
      id,
      user_id,
      title,
      audio_blob_url,
      audio_url,
      duration_seconds,
      transcript,
      raw_transcript,
      summary,
      extracted_tasks,
      local_uri,
      created_at,
      updated_at
    ) values (
      coalesce($1, gen_random_uuid()),
      $2,
      coalesce($3, 'Voice Note'),
      $4,
      coalesce($5, $4),
      coalesce($6, 0),
      $7,
      coalesce($8, $7),
      $9,
      coalesce($10, '[]'::jsonb),
      $11,
      coalesce($12, now()),
      coalesce($13, now())
    )
    on conflict (id) do update set
      title = excluded.title,
      audio_blob_url = coalesce(excluded.audio_blob_url, voice_notes.audio_blob_url),
      audio_url = coalesce(excluded.audio_url, voice_notes.audio_url),
      duration_seconds = excluded.duration_seconds,
      transcript = excluded.transcript,
      raw_transcript = coalesce(excluded.raw_transcript, voice_notes.raw_transcript),
      summary = excluded.summary,
      extracted_tasks = excluded.extracted_tasks,
      local_uri = coalesce(excluded.local_uri, voice_notes.local_uri),
      updated_at = now()
    returning *;
  `;

  const values = [
    input.id || null,
    input.user_id,
    input.title || null,
    input.audio_blob_url || null,
    input.audio_url || null,
    input.duration_seconds || 0,
    input.transcript || null,
    input.raw_transcript || null,
    input.summary || null,
    input.extracted_tasks ? JSON.stringify(input.extracted_tasks) : null,
    input.local_uri || null,
    input.created_at || null,
    input.updated_at || null,
  ];

  const res = await p.query<VoiceNoteRecord>(query, values);
  return res.rows[0];
}

export async function getVoiceNotesByUser(
  userId: string,
  limit: number = 50
): Promise<VoiceNoteRecord[]> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<VoiceNoteRecord>(
    `select * from public.voice_notes
      where user_id = $1
      order by created_at desc
      limit $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getVoiceNoteById(
  id: string,
  userId: string
): Promise<VoiceNoteRecord | null> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<VoiceNoteRecord>(
    `select * from public.voice_notes
      where id = $1 and user_id = $2
      limit 1`,
    [id, userId]
  );
  return res.rows[0] || null;
}

export async function deleteVoiceNoteById(
  id: string,
  userId: string
): Promise<boolean> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query(
    `delete from public.voice_notes
      where id = $1 and user_id = $2`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

// ============================================================================
// Focalyst AI: Chat Logs & Message Limits
// ============================================================================

export interface AiChatLogRecord {
  id: string;
  user_id: string;
  role: string;
  content: string;
  tab_context: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface InsertAiChatLogInput {
  id?: string;
  user_id: string;
  role: string;
  content: string;
  tab_context?: string | null;
  tokens_used?: number | null;
  created_at?: string;
}

export async function insertAiChatLog(input: InsertAiChatLogInput): Promise<AiChatLogRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<AiChatLogRecord>(
    `insert into public.ai_chat_logs (
      id, user_id, role, content, tab_context, tokens_used, created_at
    ) values (
      coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6, coalesce($7, now())
    ) returning *;`,
    [
      input.id || null,
      input.user_id,
      input.role,
      input.content,
      input.tab_context || null,
      input.tokens_used || null,
      input.created_at || null,
    ]
  );
  return res.rows[0];
}

export async function insertAiChatLogs(inputs: InsertAiChatLogInput[]): Promise<AiChatLogRecord[]> {
  const out: AiChatLogRecord[] = [];
  for (const input of inputs) {
    out.push(await insertAiChatLog(input));
  }
  return out;
}

export async function getTodayAiMessageCount(userId: string, startOfDayIso: string): Promise<number> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<{ count: string }>(
    `select count(*)::text as count
     from public.ai_chat_logs
     where user_id = $1 and role = 'user' and created_at >= $2`,
    [userId, startOfDayIso]
  );
  return parseInt(res.rows[0]?.count || '0', 10);
}

export async function incrementUserAiUsage(userId: string): Promise<void> {
  const p = getAzurePool();
  if (!p) return;

  await p.query(
    `insert into public.user_ai_usage (user_id, ai_message_count, last_message_date, updated_at)
     values ($1, 1, now(), now())
     on conflict (user_id) do update set
       ai_message_count = user_ai_usage.ai_message_count + 1,
       last_message_date = now(),
       updated_at = now()`,
    [userId]
  );
}

export async function getUserAiUsage(userId: string): Promise<{ ai_message_count: number; last_message_date: string } | null> {
  const p = getAzurePool();
  if (!p) return null;

  const res = await p.query<{ ai_message_count: number; last_message_date: string }>(
    `select ai_message_count, last_message_date from public.user_ai_usage where user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

// ============================================================================
// MCP: Model Context Protocol Server Credits & Ledger
// ============================================================================

export interface McpCreditAccountRecord {
  user_id: string;
  balance: number;
  anchor_at: string;
  period_start: string;
  period_end: string;
  last_bonus_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface McpConfigRecord {
  id: boolean;
  monthly_credits: number;
  daily_bonus: number;
  calls_per_minute: number;
}

export interface McpToolCostRecord {
  tool: string;
  label: string;
  cost: number;
  is_write: boolean;
  sort: number;
}

export interface McpLedgerRecord {
  id: string;
  user_id: string;
  kind: string;
  tool: string | null;
  client_id: string | null;
  delta: number;
  status: string;
  error_code: string | null;
  balance_after: number;
  created_at: string;
  finished_at: string | null;
}

export interface McpConnectionRecord {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string | null;
  allow_writes: boolean;
  connected_at: string;
  last_used_at: string | null;
  call_count: number;
  revoked_at: string | null;
  client_host: string | null;
  created_at: string;
}

export async function getMcpConfig(): Promise<McpConfigRecord> {
  const p = getAzurePool();
  if (!p) return { id: true, monthly_credits: 500, daily_bonus: 10, calls_per_minute: 30 };

  const res = await p.query<McpConfigRecord>(`select * from public.mcp_config limit 1`);
  return res.rows[0] || { id: true, monthly_credits: 500, daily_bonus: 10, calls_per_minute: 30 };
}

export async function getMcpToolCosts(): Promise<McpToolCostRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  const res = await p.query<McpToolCostRecord>(`select * from public.mcp_tool_costs order by sort asc`);
  return res.rows;
}

export async function getMcpCreditAccount(userId: string): Promise<McpCreditAccountRecord | null> {
  const p = getAzurePool();
  if (!p) return null;

  const res = await p.query<McpCreditAccountRecord>(
    `select * from public.mcp_credit_accounts where user_id = $1 limit 1`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function ensureMcpCreditAccount(userId: string, defaultBalance = 500): Promise<McpCreditAccountRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<McpCreditAccountRecord>(
    `insert into public.mcp_credit_accounts (
      user_id, balance, anchor_at, period_start, period_end, created_at, updated_at
    ) values (
      $1, $2, now(), now(), now() + interval '30 days', now(), now()
    )
    on conflict (user_id) do update set
      updated_at = now()
    returning *;`,
    [userId, defaultBalance]
  );
  return res.rows[0];
}

export async function logMcpCreditTransaction(input: {
  id?: string;
  user_id: string;
  kind: string;
  tool?: string | null;
  client_id?: string | null;
  delta: number;
  status?: string;
  error_code?: string | null;
  balance_after: number;
  finished_at?: string | null;
}): Promise<McpLedgerRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<McpLedgerRecord>(
    `insert into public.mcp_credit_ledger (
      id, user_id, kind, tool, client_id, delta, status, error_code, balance_after, created_at, finished_at
    ) values (
      coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6, coalesce($7, 'success'), $8, $9, now(), $10
    ) returning *;`,
    [
      input.id || null,
      input.user_id,
      input.kind,
      input.tool || null,
      input.client_id || null,
      input.delta,
      input.status || 'success',
      input.error_code || null,
      input.balance_after,
      input.finished_at || null,
    ]
  );
  return res.rows[0];
}

export async function claimDailyMcpBonus(
  userId: string,
  claimDay: string,
  bonusAmount = 10
): Promise<{ granted: boolean; amount: number; balance: number }> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  // Check if claimed already today
  const existing = await p.query(
    `select 1 from public.mcp_daily_bonus_claims where user_id = $1 and claim_day = $2`,
    [userId, claimDay]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    const acct = await getMcpCreditAccount(userId);
    return { granted: false, amount: 0, balance: acct?.balance ?? 500 };
  }

  // Insert claim
  await p.query(
    `insert into public.mcp_daily_bonus_claims (user_id, claim_day, claimed_at)
     values ($1, $2, now())
     on conflict do nothing`,
    [userId, claimDay]
  );

  // Update account
  const updatedAcctRes = await p.query<McpCreditAccountRecord>(
    `insert into public.mcp_credit_accounts (user_id, balance, last_bonus_date, updated_at)
     values ($1, 500 + $2, $3, now())
     on conflict (user_id) do update set
       balance = mcp_credit_accounts.balance + $2,
       last_bonus_date = $3,
       updated_at = now()
     returning *;`,
    [userId, bonusAmount, claimDay]
  );
  const newBalance = updatedAcctRes.rows[0]?.balance ?? 510;

  // Log in ledger
  await logMcpCreditTransaction({
    user_id: userId,
    kind: 'bonus',
    delta: bonusAmount,
    status: 'success',
    balance_after: newBalance,
  });

  return { granted: true, amount: bonusAmount, balance: newBalance };
}

export async function getMcpCreditSummary(userId: string, isPro: boolean) {
  const p = getAzurePool();
  const cfg = await getMcpConfig();
  if (!p) {
    return {
      has_account: false,
      is_pro: isPro,
      balance: 500,
      monthly_credits: cfg.monthly_credits,
      daily_bonus: cfg.daily_bonus,
    };
  }

  const acct = await getMcpCreditAccount(userId);
  const todayStr = new Date().toISOString().split('T')[0];

  const bonusRes = await p.query(
    `select 1 from public.mcp_daily_bonus_claims where user_id = $1 and claim_day = $2`,
    [userId, todayStr]
  );
  const bonusClaimedToday = (bonusRes.rowCount ?? 0) > 0;

  return {
    has_account: !!acct,
    is_pro: isPro,
    balance: acct?.balance ?? cfg.monthly_credits,
    monthly_credits: cfg.monthly_credits,
    daily_bonus: cfg.daily_bonus,
    period_start: acct?.period_start ?? null,
    period_end: acct?.period_end ?? null,
    bonus_claimed_today: bonusClaimedToday,
  };
}

export async function getMcpActivity(userId: string, limit = 50): Promise<McpLedgerRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  const res = await p.query<McpLedgerRecord>(
    `select * from public.mcp_credit_ledger
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getMcpConnections(userId: string): Promise<McpConnectionRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  const res = await p.query<McpConnectionRecord>(
    `select * from public.mcp_connections
     where user_id = $1
     order by connected_at desc`,
    [userId]
  );
  return res.rows;
}

export async function upsertMcpConnection(input: {
  user_id: string;
  client_id: string;
  client_name?: string | null;
  allow_writes?: boolean;
  client_host?: string | null;
}): Promise<McpConnectionRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<McpConnectionRecord>(
    `insert into public.mcp_connections (
      user_id, client_id, client_name, allow_writes, client_host, connected_at, last_used_at, call_count
    ) values (
      $1, $2, $3, coalesce($4, false), $5, now(), now(), 1
    )
    on conflict (user_id, client_id) do update set
      client_name = coalesce(excluded.client_name, mcp_connections.client_name),
      allow_writes = coalesce(excluded.allow_writes, mcp_connections.allow_writes),
      client_host = coalesce(excluded.client_host, mcp_connections.client_host),
      last_used_at = now(),
      call_count = mcp_connections.call_count + 1
    returning *;`,
    [input.user_id, input.client_id, input.client_name || null, input.allow_writes ?? false, input.client_host || null]
  );
  return res.rows[0];
}

// ============================================================================
// App Blocking: Distraction Unblock Count & Reason Logs
// ============================================================================

export interface BlockingSessionRecord {
  id: string;
  user_id: string;
  local_session_id: string | null;
  pomodoro_session_id: string | null;
  kind: string;
  level: string;
  started_at: string;
  ended_at: string | null;
  planned_sets: number | null;
  completed_sets: number | null;
  ended_early: boolean;
  attempts_count: number;
  unlocks_count: number;
  emergency_used: boolean;
  interrupted: boolean;
  platform: string | null;
  created_at: string;
}

export interface BlockingEventRecord {
  id: number;
  session_id: string;
  user_id: string;
  type: string;
  app_label: string | null;
  app_key: string | null;
  minute_into_block: number | null;
  reason: string | null;
  unlock_minutes: number | null;
  at: string;
  created_at: string;
}

export interface BlockingSettingsRecord {
  user_id: string;
  level: string | null;
  unblock_on_breaks: boolean | null;
  notify_lock_unlock: boolean | null;
  android_blocklist: string[] | null;
  android_allowlist: string[] | null;
  updated_at: string;
}

export async function insertBlockingSession(session: {
  id?: string;
  user_id: string;
  local_session_id?: string | null;
  pomodoro_session_id?: string | null;
  kind: string;
  level: string;
  started_at: string;
  ended_at?: string | null;
  planned_sets?: number | null;
  completed_sets?: number | null;
  ended_early?: boolean;
  attempts_count?: number;
  unlocks_count?: number;
  emergency_used?: boolean;
  interrupted?: boolean;
  platform?: string | null;
}): Promise<BlockingSessionRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<BlockingSessionRecord>(
    `insert into public.blocking_sessions (
      id, user_id, local_session_id, pomodoro_session_id, kind, level,
      started_at, ended_at, planned_sets, completed_sets, ended_early,
      attempts_count, unlocks_count, emergency_used, interrupted, platform, created_at
    ) values (
      coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6,
      $7, $8, $9, $10, coalesce($11, false),
      coalesce($12, 0), coalesce($13, 0), coalesce($14, false), coalesce($15, false), $16, coalesce($7, now())
    )
    on conflict (id) do update set
      ended_at = excluded.ended_at,
      completed_sets = excluded.completed_sets,
      ended_early = excluded.ended_early,
      attempts_count = excluded.attempts_count,
      unlocks_count = excluded.unlocks_count,
      emergency_used = excluded.emergency_used,
      interrupted = excluded.interrupted
    returning *;`,
    [
      session.id || null,
      session.user_id,
      session.local_session_id || null,
      session.pomodoro_session_id || null,
      session.kind,
      session.level,
      session.started_at,
      session.ended_at || null,
      session.planned_sets || null,
      session.completed_sets || null,
      session.ended_early ?? false,
      session.attempts_count ?? 0,
      session.unlocks_count ?? 0,
      session.emergency_used ?? false,
      session.interrupted ?? false,
      session.platform || null,
    ]
  );
  return res.rows[0];
}

export async function insertBlockingEvents(
  events: Array<{
    session_id: string;
    user_id: string;
    type: string;
    app_label?: string | null;
    app_key?: string | null;
    minute_into_block?: number | null;
    reason?: string | null;
    unlock_minutes?: number | null;
    at: string;
  }>
): Promise<void> {
  const p = getAzurePool();
  if (!p || events.length === 0) return;

  for (const e of events) {
    await p.query(
      `insert into public.blocking_events (
        session_id, user_id, type, app_label, app_key, minute_into_block, reason, unlock_minutes, at, created_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [
        e.session_id,
        e.user_id,
        e.type,
        e.app_label || null,
        e.app_key || null,
        e.minute_into_block || null,
        e.reason || null,
        e.unlock_minutes || null,
        e.at,
      ]
    );
  }
}

export async function getBlockingSessions(userId: string, limit = 100): Promise<BlockingSessionRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  const res = await p.query<BlockingSessionRecord>(
    `select * from public.blocking_sessions
     where user_id = $1
     order by started_at desc
     limit $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getBlockingEvents(userId: string, limit = 200): Promise<BlockingEventRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  const res = await p.query<BlockingEventRecord>(
    `select * from public.blocking_events
     where user_id = $1
     order by at desc
     limit $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function upsertBlockingSettings(settings: {
  user_id: string;
  level?: string | null;
  unblock_on_breaks?: boolean | null;
  notify_lock_unlock?: boolean | null;
  android_blocklist?: string[] | null;
  android_allowlist?: string[] | null;
}): Promise<BlockingSettingsRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<BlockingSettingsRecord>(
    `insert into public.blocking_settings (
      user_id, level, unblock_on_breaks, notify_lock_unlock, android_blocklist, android_allowlist, updated_at
    ) values ($1, $2, $3, $4, $5, $6, now())
    on conflict (user_id) do update set
      level = excluded.level,
      unblock_on_breaks = excluded.unblock_on_breaks,
      notify_lock_unlock = excluded.notify_lock_unlock,
      android_blocklist = excluded.android_blocklist,
      android_allowlist = excluded.android_allowlist,
      updated_at = now()
    returning *;`,
    [
      settings.user_id,
      settings.level || null,
      settings.unblock_on_breaks ?? null,
      settings.notify_lock_unlock ?? null,
      settings.android_blocklist || null,
      settings.android_allowlist || null,
    ]
  );
  return res.rows[0];
}

export async function getBlockingSettings(userId: string): Promise<BlockingSettingsRecord | null> {
  const p = getAzurePool();
  if (!p) return null;

  const res = await p.query<BlockingSettingsRecord>(
    `select * from public.blocking_settings where user_id = $1 limit 1`,
    [userId]
  );
  return res.rows[0] || null;
}

// ============================================================================
// Insights: Daily Focus Activity, Weekly Reports & Onboarding Profiles
// ============================================================================

export interface DailyFocusActivityRecord {
  id: string;
  user_id: string;
  date: string;
  focus_time_minutes: number;
  break_time_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportRecord {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  score: number;
  focus_time: string;
  tasks_completed: number;
  habit_consistency: string;
  week_summary_text: string;
  catalyst_insights: any;
  seen_by_user: boolean;
  created_at: string;
}

export interface OnboardingProfileRecord {
  user_id: string;
  version: number;
  platform: string;
  acquisition_source: string | null;
  life_stage: string | null;
  distractions: any;
  distracting_apps: any;
  daily_phone_hours: number | null;
  focus_drift_minutes: number | null;
  best_focus_time: string | null;
  daily_focus_goal_minutes: number | null;
  reminder_time: string | null;
  notifications_allowed: boolean;
  blocking_set_up: boolean;
  starter_habits: any;
  pending_countdown: any;
  report: any;
  answers: any;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function upsertDailyFocusActivity(activity: {
  id?: string;
  user_id: string;
  date: string;
  focus_time_minutes?: number;
  break_time_minutes?: number;
}): Promise<DailyFocusActivityRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<DailyFocusActivityRecord>(
    `insert into public.daily_focus_activity (
      id, user_id, date, focus_time_minutes, break_time_minutes, created_at, updated_at
    ) values (
      coalesce($1, gen_random_uuid()), $2, $3, coalesce($4, 0), coalesce($5, 0), now(), now()
    )
    on conflict (user_id, date) do update set
      focus_time_minutes = excluded.focus_time_minutes,
      break_time_minutes = excluded.break_time_minutes,
      updated_at = now()
    returning *;`,
    [
      activity.id || null,
      activity.user_id,
      activity.date,
      activity.focus_time_minutes ?? 0,
      activity.break_time_minutes ?? 0,
    ]
  );
  return res.rows[0];
}

export async function getDailyFocusActivity(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyFocusActivityRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  if (startDate && endDate) {
    const res = await p.query<DailyFocusActivityRecord>(
      `select * from public.daily_focus_activity
       where user_id = $1 and date >= $2 and date <= $3
       order by date desc`,
      [userId, startDate, endDate]
    );
    return res.rows;
  }

  const res = await p.query<DailyFocusActivityRecord>(
    `select * from public.daily_focus_activity
     where user_id = $1
     order by date desc
     limit 30`,
    [userId]
  );
  return res.rows;
}

export async function getWeeklyReport(
  userId: string,
  startDateIso: string,
  endDateIso: string
): Promise<WeeklyReportRecord | null> {
  const p = getAzurePool();
  if (!p) return null;

  const res = await p.query<WeeklyReportRecord>(
    `select * from public.reports
     where user_id = $1 and start_date = $2 and end_date = $3
     limit 1`,
    [userId, startDateIso, endDateIso]
  );
  return res.rows[0] || null;
}

export async function upsertWeeklyReport(report: {
  id?: string;
  user_id: string;
  start_date: string;
  end_date: string;
  score: number;
  focus_time: string;
  tasks_completed: number;
  habit_consistency: string;
  week_summary_text: string;
  catalyst_insights: any;
  seen_by_user?: boolean;
}): Promise<WeeklyReportRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<WeeklyReportRecord>(
    `insert into public.reports (
      id, user_id, start_date, end_date, score, focus_time, tasks_completed,
      habit_consistency, week_summary_text, catalyst_insights, seen_by_user, created_at
    ) values (
      coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11, false), now()
    )
    on conflict (user_id, start_date, end_date) do update set
      score = excluded.score,
      focus_time = excluded.focus_time,
      tasks_completed = excluded.tasks_completed,
      habit_consistency = excluded.habit_consistency,
      week_summary_text = excluded.week_summary_text,
      catalyst_insights = excluded.catalyst_insights,
      seen_by_user = excluded.seen_by_user
    returning *;`,
    [
      report.id || null,
      report.user_id,
      report.start_date,
      report.end_date,
      report.score,
      report.focus_time,
      report.tasks_completed,
      report.habit_consistency,
      report.week_summary_text,
      JSON.stringify(report.catalyst_insights || {}),
      report.seen_by_user ?? false,
    ]
  );
  return res.rows[0];
}

export async function getReportsByUser(userId: string, limit = 20): Promise<WeeklyReportRecord[]> {
  const p = getAzurePool();
  if (!p) return [];

  const res = await p.query<WeeklyReportRecord>(
    `select * from public.reports
     where user_id = $1
     order by start_date desc
     limit $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function upsertOnboardingProfile(profile: {
  user_id: string;
  version?: number;
  platform?: string;
  acquisition_source?: string | null;
  life_stage?: string | null;
  distractions?: any;
  distracting_apps?: any;
  daily_phone_hours?: number | null;
  focus_drift_minutes?: number | null;
  best_focus_time?: string | null;
  daily_focus_goal_minutes?: number | null;
  reminder_time?: string | null;
  notifications_allowed?: boolean;
  blocking_set_up?: boolean;
  starter_habits?: any;
  pending_countdown?: any;
  report?: any;
  answers?: any;
  completed_at?: string | null;
}): Promise<OnboardingProfileRecord> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');

  const res = await p.query<OnboardingProfileRecord>(
    `insert into public.onboarding_profiles (
      user_id, version, platform, acquisition_source, life_stage,
      distractions, distracting_apps, daily_phone_hours, focus_drift_minutes,
      best_focus_time, daily_focus_goal_minutes, reminder_time,
      notifications_allowed, blocking_set_up, starter_habits, pending_countdown,
      report, answers, completed_at, created_at, updated_at
    ) values (
      $1, coalesce($2, 2), coalesce($3, 'web'), $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12,
      coalesce($13, false), coalesce($14, false), $15, $16,
      $17, $18, $19, now(), now()
    )
    on conflict (user_id) do update set
      version = excluded.version,
      platform = excluded.platform,
      acquisition_source = excluded.acquisition_source,
      life_stage = excluded.life_stage,
      distractions = excluded.distractions,
      distracting_apps = excluded.distracting_apps,
      daily_phone_hours = excluded.daily_phone_hours,
      focus_drift_minutes = excluded.focus_drift_minutes,
      best_focus_time = excluded.best_focus_time,
      daily_focus_goal_minutes = excluded.daily_focus_goal_minutes,
      reminder_time = excluded.reminder_time,
      notifications_allowed = excluded.notifications_allowed,
      blocking_set_up = excluded.blocking_set_up,
      starter_habits = excluded.starter_habits,
      pending_countdown = excluded.pending_countdown,
      report = excluded.report,
      answers = excluded.answers,
      completed_at = excluded.completed_at,
      updated_at = now()
    returning *;`,
    [
      profile.user_id,
      profile.version ?? 2,
      profile.platform || 'web',
      profile.acquisition_source || null,
      profile.life_stage || null,
      profile.distractions ? JSON.stringify(profile.distractions) : '[]',
      profile.distracting_apps ? JSON.stringify(profile.distracting_apps) : '[]',
      profile.daily_phone_hours ?? null,
      profile.focus_drift_minutes ?? null,
      profile.best_focus_time || null,
      profile.daily_focus_goal_minutes ?? null,
      profile.reminder_time || null,
      profile.notifications_allowed ?? false,
      profile.blocking_set_up ?? false,
      profile.starter_habits ? JSON.stringify(profile.starter_habits) : '[]',
      profile.pending_countdown ? JSON.stringify(profile.pending_countdown) : null,
      profile.report ? JSON.stringify(profile.report) : null,
      profile.answers ? JSON.stringify(profile.answers) : null,
      profile.completed_at || null,
    ]
  );
  return res.rows[0];
}

export async function getOnboardingProfile(userId: string): Promise<OnboardingProfileRecord | null> {
  const p = getAzurePool();
  if (!p) return null;

  const res = await p.query<OnboardingProfileRecord>(
    `select * from public.onboarding_profiles where user_id = $1 limit 1`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function deleteUserDataFromAzure(userId: string): Promise<void> {
  const p = getAzurePool();
  if (!p) return;

  const tables = [
    'blocking_events',
    'blocking_sessions',
    'blocking_settings',
    'mcp_credit_ledger',
    'mcp_daily_bonus_claims',
    'mcp_connections',
    'mcp_credit_accounts',
    'ai_chat_logs',
    'user_ai_usage',
    'reports',
    'daily_focus_activity',
    'onboarding_profiles',
    'voice_notes',
  ];

  for (const table of tables) {
    try {
      await p.query(`delete from public.${table} where user_id = $1`, [userId]);
    } catch (err: any) {
      console.warn(`[azure-db:delete] Failed to delete from ${table}:`, err?.message);
    }
  }
}

