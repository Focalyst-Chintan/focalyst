import { Pool, type PoolConfig, type PoolClient } from 'pg';

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

export async function withUserDb<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getAzurePool();
  if (!p) throw new Error('AZURE_POSTGRES_URL is not configured');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw err;
  } finally {
    client.release();
  }
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
    'xp_logs',
    'notes',
    'countdowns',
    'reminders',
    'pomodoro_sessions',
    'subtasks',
    'tasks',
    'habit_logs',
    'habit_group_members',
    'habits',
    'habit_groups',
    'users',
  ];

  for (const table of tables) {
    try {
      if (table === 'users') {
        await p.query(`delete from public.users where id = $1`, [userId]);
      } else if (table === 'habit_groups') {
        await p.query(`delete from public.habit_groups where created_by = $1`, [userId]);
      } else {
        await p.query(`delete from public.${table} where user_id = $1`, [userId]);
      }
    } catch (err: any) {
      console.warn(`[azure-db:delete] Failed to delete from ${table}:`, err?.message);
    }
  }
}

// ============================================================================
// Core App Tables: Tasks, Habits, Habit Groups, Reminders, Sessions, Countdowns, Notes, Profile, XP
// ============================================================================

export interface TaskRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  status: string | null;
  position: number;
  category: string | null;
  time_estimate_minutes: number | null;
  actual_duration_minutes: number | null;
  streak_count: number;
  scheduled_date: string | null;
  recurrence_rule: string | null;
  is_starred: boolean;
}

export interface HabitRecord {
  id: string;
  user_id: string;
  name: string;
  frequency: string;
  custom_days: number[] | null;
  target_count: number;
  is_active: boolean;
  created_at: string;
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
  position: number;
  time_of_day: string | null;
  icon: string | null;
  group_id: string | null;
}

export interface HabitLogRecord {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string;
  created_at: string;
}

export interface HabitGroupRecord {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  max_members: number;
  created_at: string;
}

export interface HabitGroupMemberRecord {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  current_streak: number;
  longest_streak: number;
  habit_id: string | null;
}

export interface ReminderRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  repeat_pattern: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  is_starred: boolean;
}

export interface PomodoroSessionRecord {
  id: string;
  user_id: string;
  focus_minutes: number;
  break_minutes: number;
  sets_completed: number;
  task_id: string | null;
  was_completed: boolean;
  started_at: string;
  completed_at: string;
  notes: string | null;
  source: string;
  duration_minutes: number | null;
}

export interface CountdownRecord {
  id: string;
  user_id: string;
  event_name: string;
  target_date: string;
  icon: string | null;
  color: string | null;
  category: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface NoteRecord {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  color: string | null;
  source: string | null;
  type: string | null;
  audio_url: string | null;
}

export interface UserProfileRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_type: string | null;
  plan: string;
  plan_expires_at: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
  ai_message_count: number;
  last_message_date: string | null;
  total_xp: number;
  current_level: number;
  current_title: string;
  expo_push_token: string | null;
  task_reminders_enabled: boolean;
  habit_reminders_enabled: boolean;
  pomodoro_alerts_enabled: boolean;
  timezone: string | null;
  ai_voice_count: number;
  last_voice_date: string | null;
  billing_provider: string | null;
  polar_customer_id: string | null;
  newsletter_batch: number | null;
  last_newsletter_sent_at: string | null;
  deleted_at: string | null;
}

export interface XpLogRecord {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  created_at: string;
  idempotency_key: string | null;
}

// ----------------------------------------------------------------------------
// Tasks
// ----------------------------------------------------------------------------

export async function getTasksByUser(
  userId: string,
  options: {
    isCompleted?: boolean;
    dueFrom?: string;
    dueTo?: string;
    priority?: string;
    limit?: number;
  } = {}
): Promise<TaskRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.tasks where user_id = $1';
    const params: any[] = [userId];
    let idx = 2;

    if (options.isCompleted !== undefined) {
      sql += ` and is_completed = $${idx++}`;
      params.push(options.isCompleted);
    }
    if (options.dueFrom) {
      sql += ` and due_date >= $${idx++}`;
      params.push(options.dueFrom);
    }
    if (options.dueTo) {
      sql += ` and due_date <= $${idx++}`;
      params.push(options.dueTo);
    }
    if (options.priority) {
      sql += ` and priority = $${idx++}`;
      params.push(options.priority);
    }

    if (options.isCompleted) {
      sql += ' order by completed_at desc nulls last';
    } else {
      sql += ' order by due_date asc nulls last, created_at desc';
    }

    if (options.limit) {
      sql += ` limit $${idx++}`;
      params.push(options.limit);
    }

    const res = await client.query<TaskRecord>(sql, params);
    return res.rows;
  });
}

export async function upsertTask(
  userId: string,
  task: Partial<TaskRecord> & { title: string }
): Promise<TaskRecord> {
  return withUserDb(userId, async (client) => {
    const id = task.id || crypto.randomUUID();
    const isCompleted = task.is_completed ?? false;
    const completedAt = isCompleted ? (task.completed_at || new Date().toISOString()) : null;

    const res = await client.query<TaskRecord>(
      `insert into public.tasks (
        id, user_id, title, description, is_completed, due_date, due_time,
        priority, created_at, updated_at, completed_at, status, position,
        category, time_estimate_minutes, actual_duration_minutes, streak_count,
        scheduled_date, recurrence_rule, is_starred
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        coalesce($8, 'medium'), coalesce($9, now()), now(), $10, coalesce($11, 'todo'), coalesce($12, 0),
        $13, $14, $15, coalesce($16, 0),
        $17, $18, coalesce($19, false)
      )
      on conflict (id) do update set
        title = excluded.title,
        description = excluded.description,
        is_completed = excluded.is_completed,
        due_date = excluded.due_date,
        due_time = excluded.due_time,
        priority = excluded.priority,
        updated_at = now(),
        completed_at = excluded.completed_at,
        status = excluded.status,
        position = excluded.position,
        category = excluded.category,
        time_estimate_minutes = excluded.time_estimate_minutes,
        actual_duration_minutes = excluded.actual_duration_minutes,
        streak_count = excluded.streak_count,
        scheduled_date = excluded.scheduled_date,
        recurrence_rule = excluded.recurrence_rule,
        is_starred = excluded.is_starred
      returning *`,
      [
        id,
        userId,
        task.title,
        task.description ?? null,
        isCompleted,
        task.due_date ?? null,
        task.due_time ?? null,
        task.priority ?? 'medium',
        task.created_at ?? null,
        completedAt,
        task.status ?? 'todo',
        task.position ?? 0,
        task.category ?? null,
        task.time_estimate_minutes ?? null,
        task.actual_duration_minutes ?? null,
        task.streak_count ?? 0,
        task.scheduled_date ?? null,
        task.recurrence_rule ?? null,
        task.is_starred ?? false,
      ]
    );
    return res.rows[0];
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    const res = await client.query(`delete from public.tasks where id = $1 and user_id = $2`, [taskId, userId]);
    return (res.rowCount ?? 0) > 0;
  });
}

export async function updateTaskCompletion(
  userId: string,
  taskId: string,
  isCompleted: boolean
): Promise<TaskRecord | null> {
  return withUserDb(userId, async (client) => {
    const completedAt = isCompleted ? new Date().toISOString() : null;
    const status = isCompleted ? 'done' : 'todo';
    const res = await client.query<TaskRecord>(
      `update public.tasks
       set is_completed = $1, completed_at = $2, status = $3, updated_at = now()
       where id = $4 and user_id = $5
       returning *`,
      [isCompleted, completedAt, status, taskId, userId]
    );
    return res.rows[0] || null;
  });
}

// ----------------------------------------------------------------------------
// Habits & Habit Logs
// ----------------------------------------------------------------------------

export async function getHabitsByUser(userId: string, activeOnly = false): Promise<HabitRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.habits where user_id = $1';
    const params: any[] = [userId];
    if (activeOnly) {
      sql += ' and is_active = true';
    }
    sql += ' order by position asc, created_at asc';
    const res = await client.query<HabitRecord>(sql, params);
    return res.rows;
  });
}

export async function upsertHabit(
  userId: string,
  habit: Partial<HabitRecord> & { name: string }
): Promise<HabitRecord> {
  return withUserDb(userId, async (client) => {
    const id = habit.id || crypto.randomUUID();
    const res = await client.query<HabitRecord>(
      `insert into public.habits (
        id, user_id, name, frequency, custom_days, target_count,
        is_active, created_at, current_streak, longest_streak,
        last_completed, position, time_of_day, icon, group_id
      ) values (
        $1, $2, $3, coalesce($4, 'daily'), $5, coalesce($6, 1),
        coalesce($7, true), coalesce($8, now()), coalesce($9, 0), coalesce($10, 0),
        $11, coalesce($12, 0), $13, $14, $15
      )
      on conflict (id) do update set
        name = excluded.name,
        frequency = excluded.frequency,
        custom_days = excluded.custom_days,
        target_count = excluded.target_count,
        is_active = excluded.is_active,
        current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        last_completed = excluded.last_completed,
        position = excluded.position,
        time_of_day = excluded.time_of_day,
        icon = excluded.icon,
        group_id = excluded.group_id
      returning *`,
      [
        id,
        userId,
        habit.name,
        habit.frequency ?? 'daily',
        habit.custom_days ?? null,
        habit.target_count ?? 1,
        habit.is_active ?? true,
        habit.created_at ?? null,
        habit.current_streak ?? 0,
        habit.longest_streak ?? 0,
        habit.last_completed ?? null,
        habit.position ?? 0,
        habit.time_of_day ?? null,
        habit.icon ?? null,
        habit.group_id ?? null,
      ]
    );
    return res.rows[0];
  });
}

export async function deleteHabit(userId: string, habitId: string): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    await client.query('delete from public.habit_logs where habit_id = $1 and user_id = $2', [habitId, userId]);
    const res = await client.query('delete from public.habits where id = $1 and user_id = $2', [habitId, userId]);
    return (res.rowCount ?? 0) > 0;
  });
}

export async function logHabit(
  userId: string,
  habitId: string,
  completedDate?: string
): Promise<HabitLogRecord> {
  return withUserDb(userId, async (client) => {
    const date = completedDate || new Date().toISOString().slice(0, 10);
    const id = crypto.randomUUID();
    const res = await client.query<HabitLogRecord>(
      `insert into public.habit_logs (id, habit_id, user_id, completed_date, created_at)
       values ($1, $2, $3, $4, now())
       on conflict (id) do update set completed_date = excluded.completed_date
       returning *`,
      [id, habitId, userId, date]
    );
    return res.rows[0];
  });
}

export async function deleteHabitLog(
  userId: string,
  habitId: string,
  completedDate: string
): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    const res = await client.query(
      `delete from public.habit_logs where habit_id = $1 and user_id = $2 and completed_date = $3`,
      [habitId, userId, completedDate]
    );
    return (res.rowCount ?? 0) > 0;
  });
}

export async function getHabitLogsByUser(
  userId: string,
  sinceDate?: string,
  habitIds?: string[]
): Promise<HabitLogRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.habit_logs where user_id = $1';
    const params: any[] = [userId];
    let idx = 2;
    if (sinceDate) {
      sql += ` and completed_date >= $${idx++}`;
      params.push(sinceDate);
    }
    if (habitIds && habitIds.length > 0) {
      sql += ` and habit_id = any($${idx++})`;
      params.push(habitIds);
    }
    sql += ' order by completed_date desc';
    const res = await client.query<HabitLogRecord>(sql, params);
    return res.rows;
  });
}

// ----------------------------------------------------------------------------
// Habit Groups
// ----------------------------------------------------------------------------

export async function getHabitGroupsByUser(userId: string): Promise<any[]> {
  return withUserDb(userId, async (client) => {
    const res = await client.query(
      `select g.*, gm.habit_id, gm.joined_at, gm.current_streak as member_streak
       from public.habit_groups g
       join public.habit_group_members gm on g.id = gm.group_id
       where gm.user_id = $1
       order by g.created_at desc`,
      [userId]
    );
    return res.rows;
  });
}

export async function getHabitGroupById(groupId: string): Promise<any | null> {
  const p = getAzurePool();
  if (!p) return null;
  const groupRes = await p.query('select * from public.habit_groups where id = $1 limit 1', [groupId]);
  if (!groupRes.rows[0]) return null;
  const membersRes = await p.query(
    `select gm.*, u.full_name, u.avatar_url, u.email
     from public.habit_group_members gm
     left join public.users u on gm.user_id = u.id
     where gm.group_id = $1
     order by gm.joined_at asc`,
    [groupId]
  );
  return {
    ...groupRes.rows[0],
    members: membersRes.rows,
  };
}

export async function createHabitGroup(
  userId: string,
  name: string,
  maxMembers = 5
): Promise<HabitGroupRecord> {
  return withUserDb(userId, async (client) => {
    const id = crypto.randomUUID();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const res = await client.query<HabitGroupRecord>(
      `insert into public.habit_groups (id, name, invite_code, created_by, max_members, created_at)
       values ($1, $2, $3, $4, $5, now())
       returning *`,
      [id, name, inviteCode, userId, maxMembers]
    );
    await client.query(
      `insert into public.habit_group_members (id, group_id, user_id, joined_at)
       values ($1, $2, $3, now())`,
      [crypto.randomUUID(), id, userId]
    );
    return res.rows[0];
  });
}

export async function joinHabitGroup(
  userId: string,
  inviteCode: string,
  habitId?: string
): Promise<HabitGroupMemberRecord> {
  return withUserDb(userId, async (client) => {
    const groupRes = await client.query<HabitGroupRecord>(
      `select * from public.habit_groups where upper(invite_code) = upper($1) limit 1`,
      [inviteCode.trim()]
    );
    const group = groupRes.rows[0];
    if (!group) throw new Error('Habit group not found with that invite code');

    const countRes = await client.query('select count(*)::int as count from public.habit_group_members where group_id = $1', [group.id]);
    if (countRes.rows[0].count >= group.max_members) {
      throw new Error('Habit group is already full');
    }

    const memberId = crypto.randomUUID();
    const res = await client.query<HabitGroupMemberRecord>(
      `insert into public.habit_group_members (id, group_id, user_id, habit_id, joined_at)
       values ($1, $2, $3, $4, now())
       on conflict (group_id, user_id) do update set habit_id = coalesce(excluded.habit_id, habit_group_members.habit_id)
       returning *`,
      [memberId, group.id, userId, habitId ?? null]
    );
    return res.rows[0];
  });
}

export async function leaveHabitGroup(userId: string, groupId: string): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    const res = await client.query(
      `delete from public.habit_group_members where group_id = $1 and user_id = $2`,
      [groupId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  });
}

// ----------------------------------------------------------------------------
// Reminders / Calendar
// ----------------------------------------------------------------------------

export async function getRemindersByUser(
  userId: string,
  options: { isCompleted?: boolean; fromDate?: string; toDate?: string; limit?: number } = {}
): Promise<ReminderRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.reminders where user_id = $1';
    const params: any[] = [userId];
    let idx = 2;

    if (options.isCompleted !== undefined) {
      sql += ` and is_completed = $${idx++}`;
      params.push(options.isCompleted);
    }
    if (options.fromDate) {
      sql += ` and scheduled_at >= $${idx++}`;
      params.push(options.fromDate);
    }
    if (options.toDate) {
      sql += ` and scheduled_at <= $${idx++}`;
      params.push(options.toDate);
    }

    sql += ' order by scheduled_at asc';
    if (options.limit) {
      sql += ` limit $${idx++}`;
      params.push(options.limit);
    }

    const res = await client.query<ReminderRecord>(sql, params);
    return res.rows;
  });
}

export async function upsertReminder(
  userId: string,
  reminder: Partial<ReminderRecord> & { title: string }
): Promise<ReminderRecord> {
  return withUserDb(userId, async (client) => {
    const id = reminder.id || crypto.randomUUID();
    const res = await client.query<ReminderRecord>(
      `insert into public.reminders (
        id, user_id, title, description, scheduled_at, repeat_pattern,
        is_completed, created_at, updated_at, is_starred
      ) values (
        $1, $2, $3, $4, coalesce($5, now()), $6,
        coalesce($7, false), coalesce($8, now()), now(), coalesce($9, false)
      )
      on conflict (id) do update set
        title = excluded.title,
        description = excluded.description,
        scheduled_at = excluded.scheduled_at,
        repeat_pattern = excluded.repeat_pattern,
        is_completed = excluded.is_completed,
        updated_at = now(),
        is_starred = excluded.is_starred
      returning *`,
      [
        id,
        userId,
        reminder.title,
        reminder.description ?? null,
        reminder.scheduled_at ?? null,
        reminder.repeat_pattern ?? null,
        reminder.is_completed ?? false,
        reminder.created_at ?? null,
        reminder.is_starred ?? false,
      ]
    );
    return res.rows[0];
  });
}

export async function deleteReminder(userId: string, reminderId: string): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    const res = await client.query('delete from public.reminders where id = $1 and user_id = $2', [reminderId, userId]);
    return (res.rowCount ?? 0) > 0;
  });
}

// ----------------------------------------------------------------------------
// Pomodoro Sessions
// ----------------------------------------------------------------------------

export async function getPomodoroSessionsByUser(
  userId: string,
  options: { gte?: string; lt?: string; limit?: number } = {}
): Promise<PomodoroSessionRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.pomodoro_sessions where user_id = $1';
    const params: any[] = [userId];
    let idx = 2;

    if (options.gte) {
      sql += ` and started_at >= $${idx++}`;
      params.push(options.gte);
    }
    if (options.lt) {
      sql += ` and started_at < $${idx++}`;
      params.push(options.lt);
    }

    sql += ' order by started_at desc';
    if (options.limit) {
      sql += ` limit $${idx++}`;
      params.push(options.limit);
    }

    const res = await client.query<PomodoroSessionRecord>(sql, params);
    return res.rows;
  });
}

export async function insertPomodoroSession(
  userId: string,
  session: Partial<PomodoroSessionRecord> & { duration_minutes?: number; focus_minutes?: number }
): Promise<PomodoroSessionRecord> {
  return withUserDb(userId, async (client) => {
    const id = session.id || crypto.randomUUID();
    const focusMins = session.focus_minutes ?? session.duration_minutes ?? 25;
    const durationMins = session.duration_minutes ?? focusMins;
    const startedAt = session.started_at || new Date().toISOString();
    const completedAt = session.completed_at || new Date().toISOString();

    const res = await client.query<PomodoroSessionRecord>(
      `insert into public.pomodoro_sessions (
        id, user_id, focus_minutes, break_minutes, sets_completed,
        task_id, was_completed, started_at, completed_at, notes,
        source, duration_minutes
      ) values (
        $1, $2, $3, coalesce($4, 0), coalesce($5, 1),
        $6, coalesce($7, true), $8, $9, $10,
        coalesce($11, 'web'), $12
      )
      on conflict (id) do update set
        focus_minutes = excluded.focus_minutes,
        break_minutes = excluded.break_minutes,
        sets_completed = excluded.sets_completed,
        task_id = excluded.task_id,
        was_completed = excluded.was_completed,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        notes = excluded.notes,
        source = excluded.source,
        duration_minutes = excluded.duration_minutes
      returning *`,
      [
        id,
        userId,
        focusMins,
        session.break_minutes ?? 0,
        session.sets_completed ?? 1,
        session.task_id ?? null,
        session.was_completed ?? true,
        startedAt,
        completedAt,
        session.notes ?? null,
        session.source ?? 'web',
        durationMins,
      ]
    );
    return res.rows[0];
  });
}

// ----------------------------------------------------------------------------
// Countdowns
// ----------------------------------------------------------------------------

export async function getCountdownsByUser(
  userId: string,
  activeOnly = false
): Promise<CountdownRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.countdowns where user_id = $1';
    const params: any[] = [userId];
    if (activeOnly) {
      sql += ' and is_active = true';
    }
    sql += ' order by target_date asc';
    const res = await client.query<CountdownRecord>(sql, params);
    return res.rows;
  });
}

export async function upsertCountdown(
  userId: string,
  countdown: Partial<CountdownRecord> & { event_name: string; target_date: string }
): Promise<CountdownRecord> {
  return withUserDb(userId, async (client) => {
    const id = countdown.id || crypto.randomUUID();
    const res = await client.query<CountdownRecord>(
      `insert into public.countdowns (
        id, user_id, event_name, target_date, icon,
        color, category, is_active, notes, created_at
      ) values (
        $1, $2, $3, $4, $5,
        $6, $7, coalesce($8, true), $9, coalesce($10, now())
      )
      on conflict (id) do update set
        event_name = excluded.event_name,
        target_date = excluded.target_date,
        icon = excluded.icon,
        color = excluded.color,
        category = excluded.category,
        is_active = excluded.is_active,
        notes = excluded.notes
      returning *`,
      [
        id,
        userId,
        countdown.event_name,
        countdown.target_date,
        countdown.icon ?? null,
        countdown.color ?? null,
        countdown.category ?? null,
        countdown.is_active ?? true,
        countdown.notes ?? null,
        countdown.created_at ?? null,
      ]
    );
    return res.rows[0];
  });
}

export async function deleteCountdown(userId: string, countdownId: string): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    const res = await client.query('delete from public.countdowns where id = $1 and user_id = $2', [countdownId, userId]);
    return (res.rowCount ?? 0) > 0;
  });
}

// ----------------------------------------------------------------------------
// Notes
// ----------------------------------------------------------------------------

export async function getNotesByUser(
  userId: string,
  options: { isPinned?: boolean; isArchived?: boolean; search?: string; limit?: number } = {}
): Promise<NoteRecord[]> {
  return withUserDb(userId, async (client) => {
    let sql = 'select * from public.notes where user_id = $1';
    const params: any[] = [userId];
    let idx = 2;

    if (options.isPinned !== undefined) {
      sql += ` and is_pinned = $${idx++}`;
      params.push(options.isPinned);
    }
    if (options.isArchived !== undefined) {
      sql += ` and is_archived = $${idx++}`;
      params.push(options.isArchived);
    }
    if (options.search) {
      sql += ` and (title ilike $${idx} or content ilike $${idx})`;
      params.push(`%${options.search}%`);
      idx++;
    }

    sql += ' order by is_pinned desc, updated_at desc';
    if (options.limit) {
      sql += ` limit $${idx++}`;
      params.push(options.limit);
    }

    const res = await client.query<NoteRecord>(sql, params);
    return res.rows;
  });
}

export async function getNoteById(userId: string, noteId: string): Promise<NoteRecord | null> {
  return withUserDb(userId, async (client) => {
    const res = await client.query<NoteRecord>(
      'select * from public.notes where id = $1 and user_id = $2 limit 1',
      [noteId, userId]
    );
    return res.rows[0] || null;
  });
}

export async function upsertNote(
  userId: string,
  note: Partial<NoteRecord> & { title: string }
): Promise<NoteRecord> {
  return withUserDb(userId, async (client) => {
    const id = note.id || crypto.randomUUID();
    const res = await client.query<NoteRecord>(
      `insert into public.notes (
        id, user_id, title, content, tags, is_pinned,
        is_archived, created_at, updated_at, color, source, type, audio_url
      ) values (
        $1, $2, $3, coalesce($4, ''), $5, coalesce($6, false),
        coalesce($7, false), coalesce($8, now()), now(), $9, coalesce($10, 'native_ios'), coalesce($11, 'note'), $12
      )
      on conflict (id) do update set
        title = excluded.title,
        content = excluded.content,
        tags = excluded.tags,
        is_pinned = excluded.is_pinned,
        is_archived = excluded.is_archived,
        updated_at = now(),
        color = excluded.color,
        source = excluded.source,
        type = excluded.type,
        audio_url = excluded.audio_url
      returning *`,
      [
        id,
        userId,
        note.title,
        note.content ?? '',
        note.tags ?? null,
        note.is_pinned ?? false,
        note.is_archived ?? false,
        note.created_at ?? null,
        note.color ?? null,
        note.source ?? 'native_ios',
        note.type ?? 'note',
        note.audio_url ?? null,
      ]
    );
    return res.rows[0];
  });
}

export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  return withUserDb(userId, async (client) => {
    const res = await client.query('delete from public.notes where id = $1 and user_id = $2', [noteId, userId]);
    return (res.rowCount ?? 0) > 0;
  });
}

// ----------------------------------------------------------------------------
// User Profile
// ----------------------------------------------------------------------------

export async function getUserProfile(userId: string): Promise<UserProfileRecord | null> {
  const p = getAzurePool();
  if (!p) return null;
  const res = await p.query<UserProfileRecord>('select * from public.users where id = $1 limit 1', [userId]);
  return res.rows[0] || null;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfileRecord>
): Promise<UserProfileRecord | null> {
  return withUserDb(userId, async (client) => {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (key === 'id') continue;
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }

    if (fields.length === 0) {
      const existing = await client.query<UserProfileRecord>('select * from public.users where id = $1', [userId]);
      return existing.rows[0] || null;
    }

    fields.push(`updated_at = now()`);
    values.push(userId);

    const sql = `update public.users set ${fields.join(', ')} where id = $${idx} returning *`;
    const res = await client.query<UserProfileRecord>(sql, values);
    return res.rows[0] || null;
  });
}

export async function awardUserXp(
  userId: string,
  amount: number,
  source: string,
  idempotencyKey?: string
): Promise<{ total_xp: number; current_level: number }> {
  return withUserDb(userId, async (client) => {
    if (idempotencyKey) {
      const existing = await client.query('select id from public.xp_logs where idempotency_key = $1 limit 1', [idempotencyKey]);
      if (existing.rows.length > 0) {
        const u = await client.query<UserProfileRecord>('select total_xp, current_level from public.users where id = $1', [userId]);
        return { total_xp: u.rows[0]?.total_xp ?? 0, current_level: u.rows[0]?.current_level ?? 1 };
      }
    }

    await client.query(
      `insert into public.xp_logs (id, user_id, amount, source, created_at, idempotency_key)
       values ($1, $2, $3, $4, now(), $5)`,
      [crypto.randomUUID(), userId, amount, source, idempotencyKey ?? null]
    );

    const updateRes = await client.query<UserProfileRecord>(
      `update public.users
       set total_xp = coalesce(total_xp, 0) + $1,
           current_level = greatest(1, floor((coalesce(total_xp, 0) + $1) / 500) + 1),
           updated_at = now()
       where id = $2
       returning total_xp, current_level`,
      [amount, userId]
    );

    return {
      total_xp: updateRes.rows[0]?.total_xp ?? 0,
      current_level: updateRes.rows[0]?.current_level ?? 1,
    };
  });
}

