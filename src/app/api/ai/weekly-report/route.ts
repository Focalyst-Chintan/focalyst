import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { completeJSON } from '@/lib/ai/providers';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

const reportSchema = z.object({
  score: z.number().min(0).max(100),
  focusTime: z.string(),
  tasksCompleted: z.number().nonnegative(),
  habitConsistency: z.string(),
  weekSummaryText: z.string(),
  catalystInsights: z.object({
    pattern: z.string(),
    weakness: z.string(),
    prescription: z.string(),
  }),
});

function getWeekBounds(weekStartParam?: string): { startDate: Date; endDate: Date } {
  if (weekStartParam) {
    const start = new Date(weekStartParam);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return { startDate: start, endDate: end };
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 is Sunday
  const lastSunday = new Date(now);
  lastSunday.setUTCDate(now.getUTCDate() - dayOfWeek);
  lastSunday.setUTCHours(0, 0, 0, 0);

  // Completed week: Previous Sunday to Saturday
  const endDate = new Date(
    Date.UTC(lastSunday.getUTCFullYear(), lastSunday.getUTCMonth(), lastSunday.getUTCDate() - 1, 23, 59, 59, 999)
  );
  const startDate = new Date(
    Date.UTC(lastSunday.getUTCFullYear(), lastSunday.getUTCMonth(), lastSunday.getUTCDate() - 7, 0, 0, 0, 0)
  );

  return { startDate, endDate };
}

function formatFocusTime(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { user, supabase } = auth;

  try {
    const body = await req.json().catch(() => ({}));
    const { startDate, endDate } = getWeekBounds(body.weekStart);

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();
    const startDateStr = startDateISO.split('T')[0];
    const endDateStr = endDateISO.split('T')[0];

    // Fetch user profile
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    const isPro = profile?.plan && profile.plan !== 'free';
    const userPlan: 'free' | 'pro' = isPro ? 'pro' : 'free';

    // 1. Check if report for this week already exists
    const { data: existingReport } = await supabase
      .from('reports')
      .select('score, focus_time, tasks_completed, habit_consistency, week_summary_text, catalyst_insights, start_date, end_date')
      .eq('user_id', user.id)
      .eq('start_date', startDateISO)
      .eq('end_date', endDateISO)
      .maybeSingle();

    if (existingReport) {
      const insights = existingReport.catalyst_insights || {};
      return NextResponse.json(
        {
          score: existingReport.score,
          focusTime: existingReport.focus_time,
          tasksCompleted: existingReport.tasks_completed,
          habitConsistency: existingReport.habit_consistency,
          weekSummaryText: existingReport.week_summary_text,
          catalystInsights: {
            pattern: isPro ? insights.pattern || '' : '',
            weakness: isPro ? insights.weakness || '' : '',
            prescription: isPro ? insights.prescription || '' : '',
          },
          startDate: existingReport.start_date,
          endDate: existingReport.end_date,
        },
        { status: 200, headers: cors }
      );
    }

    // 2. Aggregate user's weekly metrics with user's client (RLS preserved)
    const [tasksRes, habitsRes, habitLogsRes, sessionsRes, notesCountRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, is_completed, status, due_date')
        .eq('user_id', user.id)
        .or(`created_at.gte.${startDateISO},completed_at.gte.${startDateISO},due_date.gte.${startDateStr}`),
      supabase
        .from('habits')
        .select('id, current_streak')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('habit_logs')
        .select('id, habit_id, completed_date')
        .eq('user_id', user.id)
        .gte('completed_date', startDateStr)
        .lte('completed_date', endDateStr),
      supabase
        .from('pomodoro_sessions')
        .select('id, focus_minutes')
        .eq('user_id', user.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO),
      supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO),
    ]);

    const tasks = tasksRes.data || [];
    const habits = habitsRes.data || [];
    const habitLogs = habitLogsRes.data || [];
    const sessions = sessionsRes.data || [];
    const notesCount = notesCountRes.count ?? 0;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.is_completed || t.status === 'completed').length;
    const skippedTasks = tasks.filter((t: any) => t.status === 'skipped').length;
    const overdueTasks = tasks.filter((t: any) => !t.is_completed && t.due_date && t.due_date < endDateStr).length;

    const totalPossibleLogs = habits.length * 7;
    const completedLogsCount = habitLogs.length;
    const consistencyPercentage = totalPossibleLogs > 0
      ? Math.min(100, Math.round((completedLogsCount / totalPossibleLogs) * 100))
      : 0;
    const activeStreaks = habits.reduce((acc: number, h: any) => acc + (h.current_streak || 0), 0);

    const totalFocusMinutes = sessions.reduce((acc: number, s: any) => acc + (s.focus_minutes || 0), 0);
    const focusTimeString = formatFocusTime(totalFocusMinutes);

    const taskWeight = totalTasks > 0 ? (completedTasks / totalTasks) * 40 : 0;
    const habitWeight = (consistencyPercentage / 100) * 35;
    const focusWeight = Math.min(((totalFocusMinutes / 60) / 10) * 25, 25);
    const calculatedScore = Math.round(taskWeight + habitWeight + focusWeight);

    const systemPrompt = `You are the Focalyst AI Catalyst, an elite productivity coach and behavioral scientist. Analyze the provided user data (tasks, habits, focus hours) and generate a weekly report.
Rules for Free Tier Data (Always Generate):
Calculate a Productivity Score (0-100) weighted: Tasks 40% / Habits 35% / Focus 25%.
Identify 2-3 Strengths (data-driven, what went well).
Identify 2-3 Weaknesses (factual, non-judgmental, e.g., 'Focus hours dropped on Wednesday').
Write one memorable closing takeaway sentence.
Rules for Catalyst Premium Data (Only generate if userPlan === 'pro'):
Pattern Intelligence: Identify deep recurring patterns (e.g., 'Habits break on high-task days').
Strength Amplifiers: Explain why a strength worked using chronobiology or peak performance timing.
Weakness Diagnosis: Provide the probable root cause for the weaknesses.
Curated Solutions: For each weakness, provide 1 specific, evidence-backed intervention using frameworks like Atomic Habits (James Clear), Deep Work (Cal Newport), or Ultradian rhythms.
Priority Prescription: A ranked list of 3 specific things to do differently next week.
The Catalyst Insight: One deeply personalized, human-sounding paragraph synthesizing their week.`;

    const promptText = `Here is the user's weekly raw data from the past 7 days:
- User Tier: ${userPlan}
- Productivity Score Reference: ${calculatedScore}
- Tasks: Total: ${totalTasks}, Completed: ${completedTasks}, Skipped: ${skippedTasks}, Overdue: ${overdueTasks}
- Habits: Active Streaks: ${activeStreaks}, Consistency: ${consistencyPercentage}%
- Pomodoro Focus Time: ${focusTimeString} (${sessions.length} sessions)
- Notes Written: ${notesCount}

Instructions:
1. "score" in response should be integer 0-100.
2. "focusTime" must match "${focusTimeString}".
3. "tasksCompleted" must match ${completedTasks}.
4. "habitConsistency" must match "${consistencyPercentage}%".
5. User tier is "${userPlan}".
   - If "free":
     * "weekSummaryText": comprehensive summary with 2-3 strengths, 2-3 weaknesses, and closing takeaway.
     * "catalystInsights": pattern, weakness, and prescription MUST be empty strings ("").
   - If "pro":
     * "weekSummaryText": The Catalyst Insight (deeply personalized human-sounding paragraph).
     * "catalystInsights.pattern": Pattern Intelligence.
     * "catalystInsights.weakness": Root cause diagnosis and curated intervention.
     * "catalystInsights.prescription": Priority prescription for next week.

Respond with valid JSON.`;

    const schemaHint = `{
  "score": ${calculatedScore},
  "focusTime": "${focusTimeString}",
  "tasksCompleted": ${completedTasks},
  "habitConsistency": "${consistencyPercentage}%",
  "weekSummaryText": "string",
  "catalystInsights": {
    "pattern": "string",
    "weakness": "string",
    "prescription": "string"
  }
}`;

    // Attempt generation via completeJSON with 1 retry on zod validation error
    let reportData: z.infer<typeof reportSchema> | null = null;
    let attempts = 0;

    while (attempts < 2 && !reportData) {
      attempts++;
      try {
        const result = await completeJSON(systemPrompt, promptText, schemaHint, 42000);
        const parsed = reportSchema.safeParse(result.data);
        if (parsed.success) {
          reportData = parsed.data;
        } else {
          console.warn(`[ai:weekly-report] Zod validation failed attempt ${attempts}:`, parsed.error.issues);
        }
      } catch (genErr: any) {
        console.error('[ai:weekly-report]', 'providers', 500, genErr?.message || 'completeJSON error');
      }
    }

    if (!reportData) {
      // Deterministic fallback report if AI generation fails
      reportData = {
        score: calculatedScore,
        focusTime: focusTimeString,
        tasksCompleted: completedTasks,
        habitConsistency: `${consistencyPercentage}%`,
        weekSummaryText: `This week you completed ${completedTasks} tasks and logged ${focusTimeString} of focused work with ${consistencyPercentage}% habit consistency. Keep building your daily momentum step by step.`,
        catalystInsights: {
          pattern: isPro ? 'Your peak focus concentration aligns with early task execution.' : '',
          weakness: isPro ? 'Mid-week task scheduling experienced minor delays.' : '',
          prescription: isPro ? 'Schedule primary deep work blocks before midday.' : '',
        },
      };
    }

    // Save to reports table
    const reportPayload = {
      user_id: user.id,
      start_date: startDateISO,
      end_date: endDateISO,
      score: reportData.score,
      focus_time: reportData.focusTime,
      tasks_completed: reportData.tasksCompleted,
      habit_consistency: reportData.habitConsistency,
      week_summary_text: reportData.weekSummaryText,
      catalyst_insights: reportData.catalystInsights,
    };

    const { error: upsertErr } = await supabase
      .from('reports')
      .upsert(reportPayload, { onConflict: 'user_id,start_date,end_date' });

    if (upsertErr) {
      console.error('[ai:weekly-report]', 'supabase', 500, upsertErr.message);
    }

    return NextResponse.json(
      {
        score: reportData.score,
        focusTime: reportData.focusTime,
        tasksCompleted: reportData.tasksCompleted,
        habitConsistency: reportData.habitConsistency,
        weekSummaryText: reportData.weekSummaryText,
        catalystInsights: {
          pattern: isPro ? reportData.catalystInsights.pattern : '',
          weakness: isPro ? reportData.catalystInsights.weakness : '',
          prescription: isPro ? reportData.catalystInsights.prescription : '',
        },
        startDate: startDateISO,
        endDate: endDateISO,
      },
      { status: 200, headers: cors }
    );
  } catch (err: any) {
    console.error('[ai:weekly-report]', 'server', 500, err?.message || 'Report error');
    return NextResponse.json(
      { error: 'Your report could not be created right now. Please try again in a few minutes.' },
      { status: 500, headers: cors }
    );
  }
}
