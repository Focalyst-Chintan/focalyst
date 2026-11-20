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
  console.log('--- Starting Core App Tables Migration: Supabase -> Azure PostgreSQL ---');

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

  // 1. users (Profiles)
  try {
    const rows = await fetchAllSupabaseRows('users');
    let migrated = 0;
    for (const r of rows) {
      // Also populate auth.users stub so any direct FK to auth.users is satisfied
      await pgClient.query(
        `insert into auth.users (id, email) values ($1, $2)
         on conflict (id) do update set email = excluded.email`,
        [r.id, r.email || null]
      );

      const res = await pgClient.query(
        `insert into public.users (
          id, email, full_name, avatar_url, profile_type, plan, plan_expires_at,
          onboarding_done, created_at, updated_at, ai_message_count, last_message_date,
          total_xp, current_level, current_title, expo_push_token, task_reminders_enabled,
          habit_reminders_enabled, pomodoro_alerts_enabled, timezone, ai_voice_count,
          last_voice_date, billing_provider, polar_customer_id, newsletter_batch,
          last_newsletter_sent_at, deleted_at
        ) values (
          $1, $2, $3, $4, $5, coalesce($6, 'free'), $7,
          coalesce($8, false), coalesce($9, now()), coalesce($10, now()), coalesce($11, 0), coalesce($12, now()),
          coalesce($13, 0), coalesce($14, 1), coalesce($15, 'Ignition'), $16, coalesce($17, true),
          coalesce($18, true), coalesce($19, true), $20, coalesce($21, 0),
          $22, $23, $24, $25,
          $26, $27
        )
        on conflict (id) do update set
          email = excluded.email,
          full_name = excluded.full_name,
          avatar_url = excluded.avatar_url,
          profile_type = excluded.profile_type,
          plan = excluded.plan,
          plan_expires_at = excluded.plan_expires_at,
          onboarding_done = excluded.onboarding_done,
          updated_at = excluded.updated_at,
          ai_message_count = excluded.ai_message_count,
          last_message_date = excluded.last_message_date,
          total_xp = excluded.total_xp,
          current_level = excluded.current_level,
          current_title = excluded.current_title,
          expo_push_token = excluded.expo_push_token,
          task_reminders_enabled = excluded.task_reminders_enabled,
          habit_reminders_enabled = excluded.habit_reminders_enabled,
          pomodoro_alerts_enabled = excluded.pomodoro_alerts_enabled,
          timezone = excluded.timezone,
          ai_voice_count = excluded.ai_voice_count,
          last_voice_date = excluded.last_voice_date,
          billing_provider = excluded.billing_provider,
          polar_customer_id = excluded.polar_customer_id,
          newsletter_batch = excluded.newsletter_batch,
          last_newsletter_sent_at = excluded.last_newsletter_sent_at,
          deleted_at = excluded.deleted_at`,
        [
          r.id,
          r.email || null,
          r.full_name || null,
          r.avatar_url || null,
          r.profile_type || null,
          r.plan || 'free',
          r.plan_expires_at || null,
          r.onboarding_done ?? false,
          r.created_at || null,
          r.updated_at || null,
          r.ai_message_count ?? 0,
          r.last_message_date || null,
          r.total_xp ?? 0,
          r.current_level ?? 1,
          r.current_title || 'Ignition',
          r.expo_push_token || null,
          r.task_reminders_enabled ?? true,
          r.habit_reminders_enabled ?? true,
          r.pomodoro_alerts_enabled ?? true,
          r.timezone || null,
          r.ai_voice_count ?? 0,
          r.last_voice_date || null,
          r.billing_provider || null,
          r.polar_customer_id || null,
          r.newsletter_batch ?? null,
          r.last_newsletter_sent_at || null,
          r.deleted_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.users');
    results.push({ table: 'users', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('users migration error:', err);
  }

  // 2. habit_groups (before habit_group_members)
  try {
    const rows = await fetchAllSupabaseRows('habit_groups');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.habit_groups (
          id, name, invite_code, created_by, max_members, created_at
        ) values (
          $1, coalesce($2, 'Focus Pod'), $3, $4, coalesce($5, 5), coalesce($6, now())
        )
        on conflict (id) do update set
          name = excluded.name,
          invite_code = excluded.invite_code,
          created_by = excluded.created_by,
          max_members = excluded.max_members`,
        [
          r.id,
          r.name || 'Focus Pod',
          r.invite_code || null,
          r.created_by || null,
          r.max_members ?? 5,
          r.created_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.habit_groups');
    results.push({ table: 'habit_groups', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('habit_groups migration error:', err);
  }

  // 3. habits (before habit_logs & habit_group_members)
  try {
    const rows = await fetchAllSupabaseRows('habits');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.habits (
          id, user_id, name, icon, frequency, custom_days, reminder_time,
          current_streak, longest_streak, is_active, position, created_at,
          updated_at, color, start_date, end_date, duration_minutes
        ) values (
          $1, $2, $3, $4, coalesce($5, 'daily'), $6, $7,
          coalesce($8, 0), coalesce($9, 0), coalesce($10, true), coalesce($11, 0), coalesce($12, now()),
          coalesce($13, now()), coalesce($14, '#3B82F6'), $15, $16, coalesce($17, 30)
        )
        on conflict (id) do update set
          name = excluded.name,
          icon = excluded.icon,
          frequency = excluded.frequency,
          custom_days = excluded.custom_days,
          reminder_time = excluded.reminder_time,
          current_streak = excluded.current_streak,
          longest_streak = excluded.longest_streak,
          is_active = excluded.is_active,
          position = excluded.position,
          updated_at = excluded.updated_at,
          color = excluded.color,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          duration_minutes = excluded.duration_minutes`,
        [
          r.id,
          r.user_id,
          r.name,
          r.icon || null,
          r.frequency || 'daily',
          r.custom_days || null,
          r.reminder_time || null,
          r.current_streak ?? 0,
          r.longest_streak ?? 0,
          r.is_active ?? true,
          r.position ?? 0,
          r.created_at || null,
          r.updated_at || null,
          r.color || '#3B82F6',
          r.start_date || null,
          r.end_date || null,
          r.duration_minutes ?? 30,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.habits');
    results.push({ table: 'habits', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('habits migration error:', err);
  }

  // 4. tasks (before subtasks and pomodoro_sessions)
  try {
    const rows = await fetchAllSupabaseRows('tasks');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.tasks (
          id, user_id, title, description, due_date, due_time, priority,
          is_flagged, is_completed, completed_at, reminder_time, tags,
          created_at, updated_at, position, start_time, end_time
        ) values (
          $1, $2, $3, $4, $5, $6, coalesce($7, 'medium'),
          coalesce($8, false), coalesce($9, false), $10, $11, $12,
          coalesce($13, now()), coalesce($14, now()), coalesce($15, 0), $16, $17
        )
        on conflict (id) do update set
          title = excluded.title,
          description = excluded.description,
          due_date = excluded.due_date,
          due_time = excluded.due_time,
          priority = excluded.priority,
          is_flagged = excluded.is_flagged,
          is_completed = excluded.is_completed,
          completed_at = excluded.completed_at,
          reminder_time = excluded.reminder_time,
          tags = excluded.tags,
          updated_at = excluded.updated_at,
          position = excluded.position,
          start_time = excluded.start_time,
          end_time = excluded.end_time`,
        [
          r.id,
          r.user_id,
          r.title,
          r.description || null,
          r.due_date || null,
          r.due_time || null,
          r.priority || 'medium',
          r.is_flagged ?? false,
          r.is_completed ?? false,
          r.completed_at || null,
          r.reminder_time || null,
          r.tags || null,
          r.created_at || null,
          r.updated_at || null,
          r.position ?? 0,
          r.start_time || null,
          r.end_time || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.tasks');
    results.push({ table: 'tasks', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('tasks migration error:', err);
  }

  // 5. subtasks
  try {
    const rows = await fetchAllSupabaseRows('subtasks');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.subtasks (
          id, task_id, user_id, title, is_completed, completed_at, position, created_at
        ) values (
          $1, $2, $3, $4, coalesce($5, false), $6, coalesce($7, 0), coalesce($8, now())
        )
        on conflict (id) do update set
          title = excluded.title,
          is_completed = excluded.is_completed,
          completed_at = excluded.completed_at,
          position = excluded.position`,
        [
          r.id,
          r.task_id,
          r.user_id,
          r.title,
          r.is_completed ?? false,
          r.completed_at || null,
          r.position ?? 0,
          r.created_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.subtasks');
    results.push({ table: 'subtasks', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('subtasks migration error:', err);
  }

  // 6. habit_logs (disable trigger during bulk insert, then recalculate streaks)
  try {
    await pgClient.query('alter table public.habit_logs disable trigger trg_habit_logs_recalculate_streak;');
    const rows = await fetchAllSupabaseRows('habit_logs');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.habit_logs (
          id, habit_id, user_id, completed_date, created_at
        ) values (
          $1, $2, $3, coalesce($4, current_date), coalesce($5, now())
        )
        on conflict (id) do update set
          completed_date = excluded.completed_date`,
        [
          r.id,
          r.habit_id,
          r.user_id,
          r.completed_date || null,
          r.created_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    await pgClient.query('alter table public.habit_logs enable trigger trg_habit_logs_recalculate_streak;');
    // Recalculate habit streaks
    try {
      await pgClient.query('select public.recalculate_all_habit_streaks();');
    } catch (e: any) {
      console.warn('Recalculate habit streaks notice:', e.message);
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.habit_logs');
    results.push({ table: 'habit_logs', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('habit_logs migration error:', err);
  }

  // 7. habit_group_members
  try {
    const rows = await fetchAllSupabaseRows('habit_group_members');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.habit_group_members (
          id, group_id, user_id, habit_id, joined_at
        ) values (
          $1, $2, $3, $4, coalesce($5, now())
        )
        on conflict (id) do update set
          group_id = excluded.group_id,
          habit_id = excluded.habit_id,
          joined_at = excluded.joined_at`,
        [
          r.id,
          r.group_id,
          r.user_id,
          r.habit_id || null,
          r.joined_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.habit_group_members');
    results.push({ table: 'habit_group_members', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('habit_group_members migration error:', err);
  }

  // 8. pomodoro_sessions (Focus Sessions)
  try {
    const rows = await fetchAllSupabaseRows('pomodoro_sessions');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.pomodoro_sessions (
          id, user_id, task_id, focus_minutes, break_minutes, sets_planned,
          sets_completed, was_completed, started_at, completed_at, created_at
        ) values (
          $1, $2, $3, coalesce($4, 25), coalesce($5, 5), coalesce($6, 4),
          coalesce($7, 0), coalesce($8, true), $9, coalesce($10, now()), coalesce($11, now())
        )
        on conflict (id) do update set
          task_id = excluded.task_id,
          focus_minutes = excluded.focus_minutes,
          break_minutes = excluded.break_minutes,
          sets_planned = excluded.sets_planned,
          sets_completed = excluded.sets_completed,
          was_completed = excluded.was_completed,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at`,
        [
          r.id,
          r.user_id,
          r.task_id || null,
          r.focus_minutes ?? 25,
          r.break_minutes ?? 5,
          r.sets_planned ?? 4,
          r.sets_completed ?? 0,
          r.was_completed ?? true,
          r.started_at || null,
          r.completed_at || null,
          r.created_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.pomodoro_sessions');
    results.push({ table: 'pomodoro_sessions', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('pomodoro_sessions migration error:', err);
  }

  // 9. reminders (Calendar Events)
  try {
    const rows = await fetchAllSupabaseRows('reminders');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.reminders (
          id, user_id, title, all_day, start_time, end_time, repeat,
          created_at, day, reminder_date, repeat_mode, custom_frequency,
          custom_every, custom_unit, timezone, is_active, updated_at,
          color, tag, is_completed, is_starred, description
        ) values (
          $1, $2, $3, coalesce($4, false), coalesce($5, '08:00 AM'), $6, coalesce($7, 'Never'),
          coalesce($8, now()), $9, $10, coalesce($11, 'Never'), $12,
          $13, $14, coalesce($15, 'Asia/Kolkata'), coalesce($16, true), coalesce($17, now()),
          coalesce($18, '#2B6BFF'), coalesce($19, 'Personal'), coalesce($20, false), coalesce($21, false), $22
        )
        on conflict (id) do update set
          title = excluded.title,
          all_day = excluded.all_day,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          repeat = excluded.repeat,
          day = excluded.day,
          reminder_date = excluded.reminder_date,
          repeat_mode = excluded.repeat_mode,
          custom_frequency = excluded.custom_frequency,
          custom_every = excluded.custom_every,
          custom_unit = excluded.custom_unit,
          timezone = excluded.timezone,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at,
          color = excluded.color,
          tag = excluded.tag,
          is_completed = excluded.is_completed,
          is_starred = excluded.is_starred,
          description = excluded.description`,
        [
          r.id,
          r.user_id,
          r.title,
          r.all_day ?? false,
          r.start_time || '08:00 AM',
          r.end_time || null,
          r.repeat || 'Never',
          r.created_at || null,
          r.day || null,
          r.reminder_date || null,
          r.repeat_mode || 'Never',
          r.custom_frequency || null,
          r.custom_every ?? null,
          r.custom_unit || null,
          r.timezone || 'Asia/Kolkata',
          r.is_active ?? true,
          r.updated_at || null,
          r.color || '#2B6BFF',
          r.tag || 'Personal',
          r.is_completed ?? false,
          r.is_starred ?? false,
          r.description || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.reminders');
    results.push({ table: 'reminders', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('reminders migration error:', err);
  }

  // 10. countdowns
  try {
    const rows = await fetchAllSupabaseRows('countdowns');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.countdowns (
          id, user_id, event_name, target_date, icon, color, is_active, created_at
        ) values (
          $1, $2, $3, $4, $5, coalesce($6, '#FF751F'), coalesce($7, true), coalesce($8, now())
        )
        on conflict (id) do update set
          event_name = excluded.event_name,
          target_date = excluded.target_date,
          icon = excluded.icon,
          color = excluded.color,
          is_active = excluded.is_active`,
        [
          r.id,
          r.user_id,
          r.event_name,
          r.target_date,
          r.icon || null,
          r.color || '#FF751F',
          r.is_active ?? true,
          r.created_at || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.countdowns');
    results.push({ table: 'countdowns', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('countdowns migration error:', err);
  }

  // 11. notes
  try {
    const rows = await fetchAllSupabaseRows('notes');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.notes (
          id, user_id, title, content, content_text, tags, is_deleted,
          created_at, updated_at, is_favourite, is_favorite, folder,
          note_type, transcript, duration_seconds, transcription_status,
          summary_status, transcription_error, summary_error, speech_locale,
          source, type, audio_url
        ) values (
          $1, $2, coalesce($3, 'Untitled Note'), $4, $5, $6, coalesce($7, false),
          coalesce($8, now()), coalesce($9, now()), coalesce($10, false), coalesce($11, false), $12,
          coalesce($13, 'text'), $14, coalesce($15, 0), coalesce($16, 'idle'::public.process_status_tier),
          coalesce($17, 'idle'::public.process_status_tier), $18, $19, coalesce($20, 'en-US'),
          coalesce($21, 'native_ios'), coalesce($22, 'note'), $23
        )
        on conflict (id) do update set
          title = excluded.title,
          content = excluded.content,
          content_text = excluded.content_text,
          tags = excluded.tags,
          is_deleted = excluded.is_deleted,
          updated_at = excluded.updated_at,
          is_favourite = excluded.is_favourite,
          is_favorite = excluded.is_favorite,
          folder = excluded.folder,
          note_type = excluded.note_type,
          transcript = excluded.transcript,
          duration_seconds = excluded.duration_seconds,
          transcription_status = excluded.transcription_status,
          summary_status = excluded.summary_status,
          transcription_error = excluded.transcription_error,
          summary_error = excluded.summary_error,
          speech_locale = excluded.speech_locale,
          source = excluded.source,
          type = excluded.type,
          audio_url = excluded.audio_url`,
        [
          r.id,
          r.user_id,
          r.title || 'Untitled Note',
          r.content || null,
          r.content_text || null,
          r.tags || null,
          r.is_deleted ?? false,
          r.created_at || null,
          r.updated_at || null,
          r.is_favourite ?? false,
          r.is_favorite ?? false,
          r.folder || null,
          r.note_type || 'text',
          r.transcript || null,
          r.duration_seconds ?? 0,
          r.transcription_status || 'idle',
          r.summary_status || 'idle',
          r.transcription_error || null,
          r.summary_error || null,
          r.speech_locale || 'en-US',
          r.source || 'native_ios',
          r.type || 'note',
          r.audio_url || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.notes');
    results.push({ table: 'notes', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('notes migration error:', err);
  }

  // 12. xp_logs
  try {
    const rows = await fetchAllSupabaseRows('xp_logs');
    let migrated = 0;
    for (const r of rows) {
      const res = await pgClient.query(
        `insert into public.xp_logs (
          id, user_id, amount, source, created_at, idempotency_key
        ) values (
          $1, $2, $3, $4, coalesce($5, now()), $6
        )
        on conflict (id) do update set
          amount = excluded.amount,
          source = excluded.source,
          idempotency_key = excluded.idempotency_key`,
        [
          r.id,
          r.user_id,
          r.amount,
          r.source || 'unknown',
          r.created_at || null,
          r.idempotency_key || null,
        ]
      );
      if ((res.rowCount ?? 0) > 0) migrated++;
    }
    const countRes = await pgClient.query('select count(*)::int as total from public.xp_logs');
    results.push({ table: 'xp_logs', sourceCount: rows.length, migratedCount: migrated, azureTotal: countRes.rows[0].total });
  } catch (err: any) {
    console.error('xp_logs migration error:', err);
  }

  await pgClient.end();

  console.log('\n======================================================');
  console.log('   CORE TABLES MIGRATION SUMMARY (SUPABASE -> AZURE)  ');
  console.log('======================================================');
  console.table(
    results.map((r) => ({
      Table: r.table,
      'Supabase Rows': r.sourceCount,
      Migrated: r.migratedCount,
      'Azure Total': r.azureTotal,
      Parity: r.sourceCount === r.azureTotal ? '✓ 100%' : `Diff: ${r.azureTotal - r.sourceCount}`,
    }))
  );
  console.log('======================================================\n');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
