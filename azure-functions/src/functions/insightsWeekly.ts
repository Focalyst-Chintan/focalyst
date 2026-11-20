import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import { getPool } from '../shared/db';
import { callGemini } from '../shared/gemini';

interface WeeklyCalculationInput {
  userId: string;
  startDateIso: string;
  endDateIso: string;
  startDateStr: string;
  endDateStr: string;
}

export interface WeeklyInsightResult {
  userId: string;
  status: 'created' | 'skipped_existing' | 'error';
  score?: number;
  error?: string;
}

function getPreviousWeekBounds(): { startDate: Date; endDate: Date } {
  // Report is generated for the week ending on the current Sunday
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday
  
  const endDate = new Date(now);
  endDate.setUTCHours(23, 59, 59, 999);
  
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - 6);
  startDate.setUTCHours(0, 0, 0, 0);

  return { startDate, endDate };
}

function formatFocusTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function computeWeeklyInsights(context?: InvocationContext): Promise<WeeklyInsightResult[]> {
  const p = getPool();
  const { startDate, endDate } = getPreviousWeekBounds();
  const startDateIso = startDate.toISOString();
  const endDateIso = endDate.toISOString();
  const startDateStr = startDateIso.split('T')[0];
  const endDateStr = endDateIso.split('T')[0];

  const log = (msg: string) => {
    if (context) context.log(msg);
    else console.log(msg);
  };

  log(`[insightsWeekly] Computing weekly insights for window: ${startDateStr} to ${endDateStr}`);

  // Fetch active users from Azure PostgreSQL telemetry (daily_focus_activity, reports, ai_chat_logs)
  const usersRes = await p.query<{ user_id: string }>(
    `select distinct user_id from (
      select user_id from public.daily_focus_activity where date >= $1
      union
      select user_id from public.reports where start_date >= $2
      union
      select user_id from public.ai_chat_logs where created_at >= $3
    ) active_users limit 200`,
    [startDateStr, startDateIso, startDateIso]
  );

  const userIds = usersRes.rows.map((r) => r.user_id).filter(Boolean);
  log(`[insightsWeekly] Found ${userIds.length} active users to process.`);

  const results: WeeklyInsightResult[] = [];

  for (const userId of userIds) {
    try {
      // 1. Idempotency check: see if a report for this user and week already exists
      const existingRes = await p.query(
        `select id from public.reports where user_id = $1 and start_date = $2 and end_date = $3 limit 1`,
        [userId, startDateIso, endDateIso]
      );

      if (existingRes.rows.length > 0) {
        results.push({ userId, status: 'skipped_existing' });
        continue;
      }

      // 2. Fetch weekly focus activity
      const activityRes = await p.query<{
        total_focus: string;
        total_break: string;
        active_days: string;
      }>(
        `select 
          coalesce(sum(focus_time_minutes), 0)::int as total_focus,
          coalesce(sum(break_time_minutes), 0)::int as total_break,
          count(distinct date)::int as active_days
        from public.daily_focus_activity
        where user_id = $1 and date >= $2 and date <= $3`,
        [userId, startDateStr, endDateStr]
      );

      const totalFocusMinutes = Number(activityRes.rows[0]?.total_focus || 0);
      const activeDays = Number(activityRes.rows[0]?.active_days || 0);
      const focusTimeString = formatFocusTime(totalFocusMinutes);

      // Estimate habit consistency from active days (7 possible days)
      const habitConsistency = Math.min(100, Math.round((activeDays / 7) * 100));
      const habitConsistencyStr = `${habitConsistency}%`;

      // Approximate tasks completed from activity or default
      const estimatedTasks = Math.max(activeDays * 3, Math.round(totalFocusMinutes / 35));

      // Calculate productivity score
      const taskWeight = Math.min((estimatedTasks / 20) * 40, 40);
      const habitWeight = (habitConsistency / 100) * 35;
      const focusWeight = Math.min(((totalFocusMinutes / 60) / 10) * 25, 25);
      const score = Math.min(100, Math.max(10, Math.round(taskWeight + habitWeight + focusWeight)));

      // 3. Generate AI summary & Catalyst insights
      let weekSummaryText = `This week you logged ${focusTimeString} of focused work across ${activeDays} days, completing ${estimatedTasks} tasks with a habit consistency of ${habitConsistencyStr}.`;
      let catalystInsights = {
        pattern: 'Peak focus density concentrated in morning deep-work intervals.',
        weakness: 'Mid-week energy dips reduced active focus duration.',
        prescription: 'Anchor a 90-minute morning focus sprint before checking notifications.',
      };

      if (process.env.GEMINI_API_KEY) {
        try {
          const aiResponse = await callGemini({
            model: 'gemini-2.5-flash',
            systemInstruction: `You are the Focalyst AI Catalyst productivity analyst. Return JSON with:
"weekSummaryText": A personalized, motivating 2-3 sentence summary of the user's weekly focus and habits.
"catalystInsights": {
  "pattern": "Deep behavioral pattern identified",
  "weakness": "Root cause for mid-week drops",
  "prescription": "1 actionable behavioral prescription for next week"
}`,
            prompt: `User weekly telemetry:
- Focus time: ${focusTimeString} (${totalFocusMinutes} minutes)
- Active days: ${activeDays}/7
- Estimated tasks completed: ${estimatedTasks}
- Habit consistency: ${habitConsistencyStr}
- Productivity score: ${score}/100`,
            temperature: 0.4,
          });

          if (aiResponse.text) {
            const parsed = JSON.parse(aiResponse.text.replace(/```json|```/g, '').trim());
            if (parsed.weekSummaryText) weekSummaryText = parsed.weekSummaryText;
            if (parsed.catalystInsights) {
              catalystInsights = {
                pattern: parsed.catalystInsights.pattern || catalystInsights.pattern,
                weakness: parsed.catalystInsights.weakness || catalystInsights.weakness,
                prescription: parsed.catalystInsights.prescription || catalystInsights.prescription,
              };
            }
          }
        } catch (aiErr: any) {
          log(`[insightsWeekly] Gemini call fallback for user ${userId.substring(0, 8)}: ${aiErr?.message}`);
        }
      }

      // 4. Upsert into public.reports on Azure PostgreSQL
      await p.query(
        `insert into public.reports (
          user_id, start_date, end_date, score, focus_time, tasks_completed, habit_consistency, week_summary_text, catalyst_insights, created_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
        on conflict (user_id, start_date, end_date) do update set
          score = excluded.score,
          focus_time = excluded.focus_time,
          tasks_completed = excluded.tasks_completed,
          habit_consistency = excluded.habit_consistency,
          week_summary_text = excluded.week_summary_text,
          catalyst_insights = excluded.catalyst_insights`,
        [
          userId,
          startDateIso,
          endDateIso,
          score,
          focusTimeString,
          estimatedTasks,
          habitConsistencyStr,
          weekSummaryText,
          JSON.stringify(catalystInsights),
        ]
      );

      results.push({ userId, status: 'created', score });
      log(`[insightsWeekly] Report saved for user ${userId.substring(0, 8)} (Score: ${score})`);
    } catch (userErr: any) {
      log(`[insightsWeekly] Error for user ${userId}: ${userErr?.message}`);
      results.push({ userId, status: 'error', error: userErr?.message });
    }
  }

  return results;
}

export async function insightsWeeklyTimerHandler(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('[insightsWeeklyTimer] Timer trigger fired on Sunday.');
  const results = await computeWeeklyInsights(context);
  context.log(`[insightsWeeklyTimer] Completed processing. Results summary: ${results.length} users processed.`);
}

export async function insightsWeeklyHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const results = await computeWeeklyInsights(context);
    return {
      status: 200,
      jsonBody: {
        success: true,
        processedCount: results.length,
        results,
      },
    };
  } catch (err: any) {
    context.error('[insightsWeeklyHttp] Error:', err?.message || err);
    return {
      status: 500,
      jsonBody: { error: err?.message || 'Internal server error' },
    };
  }
}

// Sunday Timer Trigger: 18:00 UTC every Sunday ('0 0 18 * * 0')
app.timer('insightsWeeklyTimer', {
  schedule: '0 0 18 * * 0',
  handler: insightsWeeklyTimerHandler,
});

app.http('insightsWeeklyHttp', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'insights/weekly',
  handler: insightsWeeklyHttpHandler,
});
