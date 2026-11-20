import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[match[1]] = val;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const postgresUrl = process.env.AZURE_POSTGRES_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}
if (!postgresUrl) {
  console.error('Missing AZURE_POSTGRES_URL in .env.local');
  process.exit(1);
}

function getClientConfig(connStr: string) {
  const match = connStr.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/);
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

interface TableMigrationResult {
  table: string;
  sourceCount: number;
  migratedCount: number;
  azureTotal: number;
}

async function migrate() {
  console.log('--- Starting Telemetry & AI Migration: Supabase -> Azure PostgreSQL ---');

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const clientConfig = getClientConfig(postgresUrl!);
  const pgClient = new Client({
    ...clientConfig,
    ssl: { rejectUnauthorized: false },
  });
  await pgClient.connect();
  console.log('✓ Connected to Azure Database for PostgreSQL');

  const results: TableMigrationResult[] = [];

  // Helper for paginated fetch from Supabase
  async function fetchAllSupabaseRows(table: string): Promise<any[]> {
    const pageSize = 1000;
    let page = 0;
    let allRows: any[] = [];
    while (true) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase.from(table).select('*').range(from, to);
      if (error) {
        // Table might not exist or error occurred
        console.warn(`[${table}] Supabase fetch notice: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    return allRows;
  }

  // 1. ai_chat_logs
  try {
    const rows = await fetchAllSupabaseRows('ai_chat_logs');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.ai_chat_logs (
          id, user_id, role, content, tab_context, tokens_used, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (id) do nothing`,
        [
          r.id,
          r.user_id,
          r.role,
          r.content,
          r.tab_context || null,
          r.tokens_used || null,
          r.created_at || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.ai_chat_logs');
    results.push({ table: 'ai_chat_logs', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('ai_chat_logs migration error:', err.message);
  }

  // 2. user_ai_usage (from Supabase users table)
  try {
    const { data: userRows, error: userErr } = await supabase
      .from('users')
      .select('id, ai_message_count, last_message_date')
      .gt('ai_message_count', 0);
    let inserted = 0;
    const sourceRows = userRows || [];
    for (const r of sourceRows) {
      const res = await pgClient.query(
        `insert into public.user_ai_usage (
          user_id, ai_message_count, last_message_date, updated_at
        ) values ($1, $2, $3, now())
        on conflict (user_id) do nothing`,
        [
          r.id,
          r.ai_message_count || 0,
          r.last_message_date || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.user_ai_usage');
    results.push({ table: 'user_ai_usage', sourceCount: sourceRows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('user_ai_usage migration error:', err.message);
  }

  // 3. mcp_config
  try {
    const rows = await fetchAllSupabaseRows('mcp_config');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.mcp_config (
          id, monthly_credits, daily_bonus, calls_per_minute
        ) values ($1, $2, $3, $4)
        on conflict (id) do nothing`,
        [
          r.id ?? true,
          r.monthly_credits ?? 500,
          r.daily_bonus ?? 10,
          r.calls_per_minute ?? 30,
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    // Ensure default config exists if none in Supabase
    await pgClient.query(
      `insert into public.mcp_config (id, monthly_credits, daily_bonus, calls_per_minute)
       values (true, 500, 10, 30)
       on conflict (id) do nothing`
    );
    const countRes = await pgClient.query('select count(*)::int as total from public.mcp_config');
    results.push({ table: 'mcp_config', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('mcp_config migration error:', err.message);
  }

  // 4. mcp_tool_costs
  try {
    const rows = await fetchAllSupabaseRows('mcp_tool_costs');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.mcp_tool_costs (
          tool, label, cost, is_write, sort
        ) values ($1, $2, $3, $4, $5)
        on conflict (tool) do nothing`,
        [r.tool, r.label, r.cost ?? 0, r.is_write ?? false, r.sort ?? 10]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.mcp_tool_costs');
    results.push({ table: 'mcp_tool_costs', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('mcp_tool_costs migration error:', err.message);
  }

  // 5. mcp_credit_accounts
  try {
    const rows = await fetchAllSupabaseRows('mcp_credit_accounts');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.mcp_credit_accounts (
          user_id, balance, anchor_at, period_start, period_end, last_bonus_date, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (user_id) do nothing`,
        [
          r.user_id,
          r.balance ?? 500,
          r.anchor_at || new Date().toISOString(),
          r.period_start || new Date().toISOString(),
          r.period_end || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          r.last_bonus_date || null,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.mcp_credit_accounts');
    results.push({ table: 'mcp_credit_accounts', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('mcp_credit_accounts migration error:', err.message);
  }

  // 6. mcp_credit_ledger
  try {
    const rows = await fetchAllSupabaseRows('mcp_credit_ledger');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.mcp_credit_ledger (
          id, user_id, kind, tool, client_id, delta, status, error_code, balance_after, created_at, finished_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        on conflict (id) do nothing`,
        [
          r.id,
          r.user_id,
          r.kind,
          r.tool || null,
          r.client_id || null,
          r.delta ?? 0,
          r.status || 'success',
          r.error_code || null,
          r.balance_after ?? 0,
          r.created_at || new Date().toISOString(),
          r.finished_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.mcp_credit_ledger');
    results.push({ table: 'mcp_credit_ledger', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('mcp_credit_ledger migration error:', err.message);
  }

  // 7. mcp_connections
  try {
    const rows = await fetchAllSupabaseRows('mcp_connections');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.mcp_connections (
          id, user_id, client_id, client_name, allow_writes, connected_at, last_used_at, call_count, revoked_at, client_host, created_at
        ) values (
          coalesce($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $6
        )
        on conflict (user_id, client_id) do nothing`,
        [
          r.id || null,
          r.user_id,
          r.client_id,
          r.client_name || null,
          r.allow_writes ?? false,
          r.connected_at || new Date().toISOString(),
          r.last_used_at || null,
          r.call_count ?? 0,
          r.revoked_at || null,
          r.client_host || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.mcp_connections');
    results.push({ table: 'mcp_connections', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('mcp_connections migration error:', err.message);
  }

  // 8. mcp_daily_bonus_claims
  try {
    const rows = await fetchAllSupabaseRows('mcp_daily_bonus_claims');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.mcp_daily_bonus_claims (
          user_id, claim_day, claimed_at
        ) values ($1, $2, $3)
        on conflict (user_id, claim_day) do nothing`,
        [r.user_id, r.claim_day, r.claimed_at || new Date().toISOString()]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.mcp_daily_bonus_claims');
    results.push({ table: 'mcp_daily_bonus_claims', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('mcp_daily_bonus_claims migration error:', err.message);
  }

  // 9. blocking_sessions
  try {
    const rows = await fetchAllSupabaseRows('blocking_sessions');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.blocking_sessions (
          id, user_id, local_session_id, pomodoro_session_id, kind, level, started_at, ended_at,
          planned_sets, completed_sets, ended_early, attempts_count, unlocks_count, emergency_used, interrupted, platform, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $7)
        on conflict (id) do nothing`,
        [
          r.id,
          r.user_id,
          r.local_session_id || null,
          r.pomodoro_session_id || null,
          r.kind,
          r.level,
          r.started_at,
          r.ended_at || null,
          r.planned_sets || null,
          r.completed_sets || null,
          r.ended_early ?? false,
          r.attempts_count ?? 0,
          r.unlocks_count ?? 0,
          r.emergency_used ?? false,
          r.interrupted ?? false,
          r.platform || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.blocking_sessions');
    results.push({ table: 'blocking_sessions', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('blocking_sessions migration error:', err.message);
  }

  // 10. blocking_events
  try {
    const rows = await fetchAllSupabaseRows('blocking_events');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.blocking_events (
          session_id, user_id, type, app_label, app_key, minute_into_block, reason, unlock_minutes, at, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        on conflict do nothing`,
        [
          r.session_id,
          r.user_id,
          r.type,
          r.app_label || null,
          r.app_key || null,
          r.minute_into_block || null,
          r.reason || null,
          r.unlock_minutes || null,
          r.at,
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.blocking_events');
    results.push({ table: 'blocking_events', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('blocking_events migration error:', err.message);
  }

  // 11. blocking_settings
  try {
    const rows = await fetchAllSupabaseRows('blocking_settings');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.blocking_settings (
          user_id, level, unblock_on_breaks, notify_lock_unlock, android_blocklist, android_allowlist, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id) do nothing`,
        [
          r.user_id,
          r.level || null,
          r.unblock_on_breaks ?? null,
          r.notify_lock_unlock ?? null,
          r.android_blocklist || null,
          r.android_allowlist || null,
          r.updated_at || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.blocking_settings');
    results.push({ table: 'blocking_settings', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('blocking_settings migration error:', err.message);
  }

  // 12. daily_focus_activity
  try {
    const rows = await fetchAllSupabaseRows('daily_focus_activity');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.daily_focus_activity (
          id, user_id, date, focus_time_minutes, break_time_minutes, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id, date) do nothing`,
        [
          r.id,
          r.user_id,
          r.date,
          r.focus_time_minutes ?? 0,
          r.break_time_minutes ?? 0,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.daily_focus_activity');
    results.push({ table: 'daily_focus_activity', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('daily_focus_activity migration error:', err.message);
  }

  // 13. reports
  try {
    const rows = await fetchAllSupabaseRows('reports');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.reports (
          id, user_id, start_date, end_date, score, focus_time, tasks_completed,
          habit_consistency, week_summary_text, catalyst_insights, seen_by_user, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        on conflict (id) do nothing`,
        [
          r.id,
          r.user_id,
          r.start_date,
          r.end_date,
          r.score ?? 0,
          r.focus_time || '0m',
          r.tasks_completed ?? 0,
          r.habit_consistency || '0%',
          r.week_summary_text || '',
          r.catalyst_insights ? JSON.stringify(r.catalyst_insights) : '{}',
          r.seen_by_user ?? false,
          r.created_at || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.reports');
    results.push({ table: 'reports', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('reports migration error:', err.message);
  }

  // 14. onboarding_profiles
  try {
    const rows = await fetchAllSupabaseRows('onboarding_profiles');
    let inserted = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.onboarding_profiles (
          user_id, version, platform, acquisition_source, life_stage,
          distractions, distracting_apps, daily_phone_hours, focus_drift_minutes,
          best_focus_time, daily_focus_goal_minutes, reminder_time,
          notifications_allowed, blocking_set_up, starter_habits, pending_countdown,
          report, answers, completed_at, created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20, $21
        )
        on conflict (user_id) do nothing`,
        [
          r.user_id,
          r.version ?? 2,
          r.platform || 'web',
          r.acquisition_source || null,
          r.life_stage || null,
          r.distractions ? JSON.stringify(r.distractions) : '[]',
          r.distracting_apps ? JSON.stringify(r.distracting_apps) : '[]',
          r.daily_phone_hours ?? null,
          r.focus_drift_minutes ?? null,
          r.best_focus_time || null,
          r.daily_focus_goal_minutes ?? null,
          r.reminder_time || null,
          r.notifications_allowed ?? false,
          r.blocking_set_up ?? false,
          r.starter_habits ? JSON.stringify(r.starter_habits) : '[]',
          r.pending_countdown ? JSON.stringify(r.pending_countdown) : null,
          r.report ? JSON.stringify(r.report) : null,
          r.answers ? JSON.stringify(r.answers) : null,
          r.completed_at || null,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString(),
        ]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.onboarding_profiles');
    results.push({ table: 'onboarding_profiles', sourceCount: rows.length, migratedCount: inserted, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('onboarding_profiles migration error:', err.message);
  }

  await pgClient.end();

  console.log('\n--- Telemetry & AI Migration Summary Table ---');
  console.table(results);
}

migrate().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
