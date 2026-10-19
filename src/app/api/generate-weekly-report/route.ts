import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {


        // 1. Authenticate user
        const supabase = await createServerSupabaseClient();
        let { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const { data: { user: jwtUser } } = await supabase.auth.getUser(token);
                user = jwtUser;
            }
        }

        if (!user) {
            console.error('[WEEKLY_REPORT_API] Unauthorized request');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        const { data: profile } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single();

        const isFree = profile?.plan === 'free';

        // 2. Fetch the pre-generated report from Supabase (latest report)
        const { data: report, error: fetchError } = await supabase
            .from('reports')
            .select('score, focus_time, tasks_completed, habit_consistency, week_summary_text, catalyst_insights')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) {
            console.error('[WEEKLY_REPORT_API] Error fetching report:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch report from database' }, { status: 500 });
        }

        if (!report) {

            return NextResponse.json({ error: 'No weekly report found. It will be generated on Sunday.' }, { status: 404 });
        }



        // Map database columns to the frontend schema structure
        const reportData = {
            score: report.score,
            focusTime: report.focus_time,
            tasksCompleted: report.tasks_completed,
            habitConsistency: report.habit_consistency,
            weekSummaryText: report.week_summary_text,
            catalystInsights: {
                pattern: isFree ? '' : report.catalyst_insights?.pattern || '',
                weakness: isFree ? '' : report.catalyst_insights?.weakness || '',
                prescription: isFree ? '' : report.catalyst_insights?.prescription || '',
            }
        };

        return NextResponse.json(reportData);

    } catch (error: unknown) {
        const correlationId = crypto.randomUUID();
        console.error(`[WEEKLY_REPORT_API] [${correlationId}] Error:`, error);
        return NextResponse.json(
            { error: 'An error occurred while retrieving the report.', correlationId },
            { status: 500 }
        );
    }
}
