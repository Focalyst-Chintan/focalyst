// ============================================================
// Supabase Edge Function: check-unfinished-tasks
// Sends push notifications to users who have unfinished tasks
// older than 24 hours that have no reminder_time set.
//
// Cron Schedule: 0 */6 * * * (every 6 hours)
// Deploy: supabase functions deploy check-unfinished-tasks
// Secrets required: SUPABASE_SERVICE_ROLE_KEY (auto-provided by Supabase)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default' | null;
  data?: Record<string, unknown>;
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Find tasks that are:
    // - Not completed
    // - No reminder_time set (haven't already been reminded)
    // - Created more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleTasks, error: taskError } = await supabase
      .from('tasks')
      .select('user_id')
      .eq('is_completed', false)
      .is('reminder_time', null)
      .lte('created_at', twentyFourHoursAgo);

    if (taskError) {
      console.error('Error querying stale tasks:', taskError.message);
      return new Response(JSON.stringify({ error: taskError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!staleTasks || staleTasks.length === 0) {
      console.log('No stale tasks found — no notifications to send.');
      return new Response(JSON.stringify({ sent: 0, message: 'No stale tasks found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate by user_id — one notification per user
    const uniqueUserIds = [...new Set(staleTasks.map((t) => t.user_id))];

    // Fetch users who have task reminders enabled and a valid push token
    const { data: eligibleUsers, error: userError } = await supabase
      .from('users')
      .select('id, expo_push_token')
      .in('id', uniqueUserIds)
      .eq('task_reminders_enabled', true)
      .not('expo_push_token', 'is', null);

    if (userError) {
      console.error('Error querying eligible users:', userError.message);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('No eligible users with push tokens found.');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No eligible users with push tokens' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build Expo push notification messages
    const messages: PushMessage[] = eligibleUsers
      .filter((u) => u.expo_push_token && u.expo_push_token.startsWith('ExponentPushToken'))
      .map((u) => ({
        to: u.expo_push_token!,
        title: '📋 Outstanding Tasks',
        body: 'You have outstanding tasks left to finish! Open Focalyst to clear them out.',
        sound: 'default' as const,
        data: { type: 'unfinished_tasks' },
      }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No valid push tokens to send to' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send in batches of 100 (Expo Push API limit)
    let totalSent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);

      const response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Expo Push API error (batch ${i / 100 + 1}):`, errorText);
      } else {
        const result = await response.json();
        console.log(`Batch ${i / 100 + 1} sent successfully:`, JSON.stringify(result));
        totalSent += batch.length;
      }
    }

    console.log(`Total push notifications sent: ${totalSent}`);

    return new Response(
      JSON.stringify({ sent: totalSent, eligibleUsers: eligibleUsers.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error in check-unfinished-tasks:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
