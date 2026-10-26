import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 300;

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        // Step 1: The Sunday Guardrail
        const today = new Date();
        const utcDay = today.getUTCDay(); // 0 is Sunday
        
        if (utcDay !== 0) {

            return NextResponse.json({ message: 'Skipped: Reports are only generated on Sundays.' });
        }

        // Step 2: Exact Date Range Math
        // endDate: Exactly 1 day before today (Saturday 23:59:59.999)
        const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1, 23, 59, 59, 999));
        // startDate: Exactly 7 days before today (previous Sunday 00:00:00.000)
        const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 7, 0, 0, 0, 0));



        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();
        const startDateStr = startDateISO.split('T')[0];
        const endDateStr = endDateISO.split('T')[0];

        // Step 3: Loop over all users and generate reports
        const supabaseAdmin = createAdminClient();
        
        // Fetch all users
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, plan');

        if (usersError) {
            console.error('[CRON_WEEKLY_REPORT] Error fetching users:', usersError);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        if (!users || users.length === 0) {

            return NextResponse.json({ message: 'No users to process.' });
        }


        
        const results = [];

        // Make sure we have either OpenRouter or Gemini API key
        const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

        if (!openRouterApiKey && !geminiApiKey) {
            console.error('[CRON_WEEKLY_REPORT] AI API key configuration is missing (need OPENROUTER_API_KEY or GEMINI_API_KEY)');
            return NextResponse.json({ error: 'API key configuration is missing' }, { status: 500 });
        }

        const google = geminiApiKey
            ? createGoogleGenerativeAI({ apiKey: geminiApiKey })
            : null;

        for (const user of users) {
            const userId = user.id;


            try {
                // Idempotency: check if report already exists for this user and this exact range
                const { data: existingReport, error: checkError } = await supabaseAdmin
                    .from('reports')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('start_date', startDateISO)
                    .eq('end_date', endDateISO)
                    .maybeSingle();

                if (checkError) {
                    console.error(`[CRON_WEEKLY_REPORT] Error checking existing report for user ${userId.substring(0, 8)}:`, checkError?.message);
                    results.push({ userId, status: 'error', reason: 'Existing check failed' });
                    continue;
                }

                if (existingReport) {

                    results.push({ userId, status: 'skipped', reason: 'Already exists' });
                    continue;
                }

                // Step 5: Handle New Users & Fetch Data (don't throw error if empty/short)
                const [tasksRes, habitsRes, logsRes, sessionsRes] = await Promise.all([
                    supabaseAdmin
                        .from('tasks')
                        .select('id, is_completed, status, due_date, completed_at')
                        .eq('user_id', userId)
                        .or(`created_at.gte.${startDateISO},completed_at.gte.${startDateISO},due_date.gte.${startDateStr}`),
                    supabaseAdmin
                        .from('habits')
                        .select('id, current_streak, longest_streak, frequency, custom_days')
                        .eq('user_id', userId)
                        .eq('is_active', true),
                    supabaseAdmin
                        .from('habit_logs')
                        .select('id, habit_id, completed_date')
                        .eq('user_id', userId)
                        .gte('completed_date', startDateStr)
                        .lte('completed_date', endDateStr),
                    supabaseAdmin
                        .from('pomodoro_sessions')
                        .select('id, focus_minutes, sets_completed, was_completed')
                        .eq('user_id', userId)
                        .gte('completed_at', startDateISO)
                        .lte('completed_at', endDateISO)
                ]);

                if (tasksRes.error) console.error(`[CRON_WEEKLY_REPORT] Tasks fetch error for user ${userId.substring(0, 8)}:`, tasksRes.error?.message);
                if (habitsRes.error) console.error(`[CRON_WEEKLY_REPORT] Habits fetch error for user ${userId.substring(0, 8)}:`, habitsRes.error?.message);
                if (logsRes.error) console.error(`[CRON_WEEKLY_REPORT] Habit logs fetch error for user ${userId.substring(0, 8)}:`, logsRes.error?.message);
                if (sessionsRes.error) console.error(`[CRON_WEEKLY_REPORT] Pomodoro sessions fetch error for user ${userId.substring(0, 8)}:`, sessionsRes.error?.message);

                const tasks = tasksRes.data || [];
                const habits = habitsRes.data || [];
                const habitLogs = logsRes.data || [];
                const sessions = sessionsRes.data || [];

                // Aggregate stats
                const totalTasks = tasks.length;
                let completedTasks = 0;
                let overdueTasks = 0;
                const skippedTasks = 0;

                tasks.forEach(t => {
                    if (t.is_completed) {
                        if (t.completed_at && new Date(t.completed_at) >= startDate) {
                            completedTasks++;
                        }
                    } else {
                        if (t.due_date && t.due_date < endDateStr) {
                            overdueTasks++;
                        }
                    }
                });

                // Habits stats
                let activeStreaks = 0;
                let brokenStreaks = 0;
                let expectedCompletions = 0;

                habits.forEach(h => {
                    activeStreaks += h.current_streak || 0;
                    if (h.current_streak === 0 && (h.longest_streak || 0) > 0) {
                        brokenStreaks++;
                    }
                    if (h.frequency === 'daily') {
                        expectedCompletions += 7;
                    } else if (h.frequency === 'custom' && h.custom_days) {
                        expectedCompletions += h.custom_days.length;
                    } else {
                        expectedCompletions += 7;
                    }
                });

                const completedLogsCount = habitLogs.length;
                const consistencyPercentage = expectedCompletions > 0 
                    ? Math.min(Math.round((completedLogsCount / expectedCompletions) * 100), 100)
                    : 0;

                // Focus stats
                let totalFocusMinutes = 0;
                const totalSessionsCount = sessions.length;
                let abandonedSessions = 0;

                sessions.forEach(s => {
                    totalFocusMinutes += (s.focus_minutes || 0) * (s.sets_completed || 0);
                    if (s.was_completed === false) {
                        abandonedSessions++;
                    }
                });

                const totalFocusHours = totalFocusMinutes / 60;
                const averageSessionLength = totalSessionsCount > 0 ? totalFocusMinutes / totalSessionsCount : 0;

                const formatFocusTime = (minutes: number) => {
                    const h = Math.floor(minutes / 60);
                    const m = Math.round(minutes % 60);
                    if (h === 0 && m === 0) return '0h';
                    if (h === 0) return `${m}m`;
                    if (m === 0) return `${h}h`;
                    return `${h}h ${m}m`;
                };

                const focusTimeString = formatFocusTime(totalFocusMinutes);

                // Dynamic productivity score
                const taskWeight = totalTasks > 0 ? (completedTasks / totalTasks) * 40 : 0;
                const habitWeight = (consistencyPercentage / 100) * 35;
                const focusWeight = Math.min((totalFocusHours / 10) * 25, 25);
                const calculatedScore = Math.round(taskWeight + habitWeight + focusWeight);

                const isZeroData = totalTasks === 0 && habits.length === 0 && totalFocusMinutes === 0;

                // Map plan to pro/free
                const plan = user.plan || 'free';
                const userPlan: 'free' | 'pro' = (plan === 'free') ? 'free' : 'pro';

                // Call Gemini
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
- Productivity Score Reference (calculated based on weights): ${calculatedScore}
- Tasks:
  - Total: ${totalTasks}
  - Completed: ${completedTasks}
  - Skipped: ${skippedTasks}
  - Overdue: ${overdueTasks}
- Habits:
  - Active Streak (Sum of active habits): ${activeStreaks}
  - Broken Streaks: ${brokenStreaks}
  - Consistency: ${consistencyPercentage}%
- Pomodoro Focus Sessions:
  - Total Focus Time: ${focusTimeString}
  - Average Session Length: ${averageSessionLength.toFixed(1)} mins
  - Abandoned Sessions: ${abandonedSessions}

Instructions:
1. "score" in the response should be the Productivity Score (0-100), you can use the reference ${calculatedScore} or refine it based on the data.
2. "focusTime" must match the formatted string "${focusTimeString}".
3. "tasksCompleted" must match ${completedTasks}.
4. "habitConsistency" must match "${consistencyPercentage}%".
5. The user is currently on the "${userPlan}" tier.
   - If the user tier is "free":
     * "weekSummaryText" must contain a comprehensive data-driven summary of the week incorporating 2-3 strengths, 2-3 weaknesses, and one memorable closing takeaway sentence.
     * "catalystInsights" MUST have empty strings ("") for pattern, weakness, and prescription.
   - If the user tier is "pro":
     * "weekSummaryText" must be "The Catalyst Insight"—one deeply personalized, human-sounding paragraph synthesizing their week.
     * "catalystInsights.pattern" must be the "Pattern Intelligence" (Identify deep recurring patterns, e.g., 'Habits break on high-task days').
     * "catalystInsights.weakness" must combine "Weakness Diagnosis" (root cause) and "Curated Solutions" (specific evidence-backed intervention using Atomic Habits/Deep Work).
     * "catalystInsights.prescription" must be the "Priority Prescription" (ranked list of 3 specific things to do differently next week).

${isZeroData ? `ALERT: The user has zero productivity data (0 tasks, 0 focus hours, 0 habits completed) recorded for this week. Please handle this gracefully. Write an encouraging, supportive, and motivational weekSummaryText emphasizing that it is okay to have rest/reflection weeks, and suggest small steps for next week. Set the score to 0.` : ''}

Generate a clean JSON matching the requested schema.`;

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

                let reportData: z.infer<typeof reportSchema> | null = null;

                // 1. Primary: OpenRouter (meta-llama/llama-3.3-70b-instruct)
                if (openRouterApiKey) {
                    try {
                        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openRouterApiKey}`,
                                'HTTP-Referer': 'https://focalyst.online',
                                'X-Title': 'Focalyst',
                            },
                            body: JSON.stringify({
                                model: 'meta-llama/llama-3.3-70b-instruct',
                                response_format: { type: 'json_object' },
                                temperature: 0.3,
                                messages: [
                                    { role: 'system', content: `${systemPrompt}\n\nRespond ONLY with a valid JSON object matching the requested schema with keys: score (number), focusTime (string), tasksCompleted (number), habitConsistency (string), weekSummaryText (string), and catalystInsights (object with pattern, weakness, prescription strings).` },
                                    { role: 'user', content: promptText },
                                ],
                            }),
                        });

                        if (openRouterRes.ok) {
                            const orJson = await openRouterRes.json();
                            const rawContent = orJson.choices?.[0]?.message?.content;
                            if (rawContent) {
                                const parsed = JSON.parse(rawContent);
                                const validated = reportSchema.safeParse(parsed);
                                if (validated.success) {
                                    reportData = validated.data;
                                }
                            }
                        } else {
                            console.warn(`[CRON_WEEKLY_REPORT] OpenRouter returned status ${openRouterRes.status}, falling back to Gemini 3.8 Flash...`);
                        }
                    } catch (orErr) {
                        console.warn('[CRON_WEEKLY_REPORT] OpenRouter request failed, falling back to Gemini 3.8 Flash:', orErr);
                    }
                }

                // 2. Fallback: Google Gemini (gemini-3.8-flash) if OpenRouter failed or not configured
                if (!reportData) {
                    if (!google) {
                        throw new Error('OpenRouter failed and GEMINI_API_KEY is not configured for fallback.');
                    }
                    const { object: geminiData } = await generateObject({
                        model: google('gemini-3.8-flash'),
                        schema: reportSchema,
                        system: systemPrompt,
                        prompt: promptText,
                    });
                    reportData = geminiData;
                }

                // Step 4: Idempotent Upsert (Preserve History without deleting previous weeks)
                const reportPayload = {
                    user_id: userId,
                    start_date: startDateISO,
                    end_date: endDateISO,
                    score: reportData.score,
                    focus_time: reportData.focusTime,
                    tasks_completed: reportData.tasksCompleted,
                    habit_consistency: reportData.habitConsistency,
                    week_summary_text: reportData.weekSummaryText,
                    catalyst_insights: reportData.catalystInsights,
                };

                const { error: upsertError } = await supabaseAdmin
                    .from('reports')
                    .upsert(reportPayload, {
                        onConflict: 'user_id,start_date,end_date',
                        ignoreDuplicates: true,
                    });

                if (upsertError) {
                    console.error(`[CRON_WEEKLY_REPORT] Error upserting report for user ${userId.substring(0, 8)}:`, upsertError?.message);
                    results.push({ userId, status: 'error', reason: 'Upsert failed' });
                } else {
                    results.push({ userId, status: 'success' });
                }

            } catch (userErr: unknown) {
                const errorMessage = userErr instanceof Error ? userErr.message : 'Unknown error';
                console.error(`[CRON_WEEKLY_REPORT] Error generating report for user ${userId.substring(0, 8)}:`, userErr instanceof Error ? userErr.message : 'Unknown');
                results.push({ userId, status: 'error', reason: errorMessage });
            }
        }


        return NextResponse.json({
            message: 'Cron job executed successfully.',
            period: { start: startDateISO, end: endDateISO },
            results
        });

    } catch (error: unknown) {
        const correlationId = crypto.randomUUID();
        console.error(`[CRON_WEEKLY_REPORT] [${correlationId}] Global Cron error:`, error);
        return NextResponse.json(
            { error: 'An error occurred during cron execution.', correlationId },
            { status: 500 }
        );
    }
}
