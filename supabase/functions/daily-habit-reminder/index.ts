// ============================================================
// Supabase Edge Function: daily-habit-reminder
// Sends push notifications to users who haven't logged any
// habit today, respecting their timezone (fires at ~8:00 PM local).
//
// Cron Schedule: */30 * * * * (every 30 minutes — function filters by TZ)
// Deploy: supabase functions deploy daily-habit-reminder
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

/**
 * Checks if a user's local time is within the 8:00 PM window (±30 min).
 * Returns true if the user's current local hour is between 19:30 and 20:30.
 */
function isWithin8PMWindow(timezone: string): boolean {
  try {
    const now = new Date();
    // Get the current time in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    const totalMinutes = hour * 60 + minute;
    // Window: 19:30 (1170 min) to 20:29 (1229 min)
    return totalMinutes >= 1170 && totalMinutes <= 1229;
  } catch {
    // Invalid timezone — skip this user
    return false;
  }
}

/**
 * Get today's date string (YYYY-MM-DD) in a given timezone.
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now); // Returns YYYY-MM-DD format
  } catch {
    // Fallback to UTC date
    return new Date().toISOString().split('T')[0];
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Step 1: Fetch all users with habit reminders enabled and a push token
    const { data: eligibleUsers, error: userError } = await supabase
      .from('users')
      .select('id, expo_push_token, timezone')
      .eq('habit_reminders_enabled', true)
      .not('expo_push_token', 'is', null);

    if (userError) {
      console.error('Error querying users:', userError.message);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('No eligible users found.');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No eligible users' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Filter to users whose local time is in the 8:00 PM window
    const usersIn8PMWindow = eligibleUsers.filter((u) => {
      if (!u.timezone) return false;
      if (!u.expo_push_token?.startsWith('ExponentPushToken')) return false;
      return isWithin8PMWindow(u.timezone);
    });

    if (usersIn8PMWindow.length === 0) {
      console.log('No users currently in the 8:00 PM timezone window.');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No users in 8PM window' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${usersIn8PMWindow.length} user(s) in the 8:00 PM window.`);

    // Step 3: For each user in the window, check if they have active habits
    // and whether they've logged any habit today
    const messages: PushMessage[] = [];

    for (const user of usersIn8PMWindow) {
      try {
        // Check for active habits
        const { data: activeHabits, error: habitError } = await supabase
          .from('habits')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (habitError || !activeHabits || activeHabits.length === 0) {
          // No active habits — skip
          continue;
        }

        // Check if any habit was logged today (in user's timezone)
        const todayStr = getTodayInTimezone(user.timezone!);
        const { data: todayLogs, error: logError } = await supabase
          .from('habit_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('completed_date', todayStr)
          .limit(1);

        if (logError) {
          console.error(`Error checking habit logs for user ${user.id}:`, logError.message);
          continue;
        }

        // If the user has NOT logged any habit today → send reminder
        if (!todayLogs || todayLogs.length === 0) {
          messages.push({
            to: user.expo_push_token!,
            title: '🔥 Habit Reminder',
            body: "Don't break your streak! Remember to log your habits before the day ends.",
            sound: 'default',
            data: { type: 'habit_reminder' },
          });
        }
      } catch (err) {
        console.error(`Error processing user ${user.id}:`, err);
      }
    }

    if (messages.length === 0) {
      console.log('All eligible users have already logged habits today.');
      return new Response(
        JSON.stringify({ sent: 0, message: 'All users have logged habits' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Send push notifications via Expo Push API
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

    console.log(`Total habit reminders sent: ${totalSent}`);

    return new Response(
      JSON.stringify({
        sent: totalSent,
        usersInWindow: usersIn8PMWindow.length,
        remindersNeeded: messages.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error in daily-habit-reminder:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
