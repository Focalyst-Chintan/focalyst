import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/account/delete
 * 
 * Permanently deletes the authenticated user's account and all associated data.
 * Uses the admin client to bypass RLS and ensure complete data removal.
 * 
 * Tables deleted (in dependency order):
 *   ai_chat_logs, reports, notes, pomodoro_sessions, habit_logs, habits,
 *   subtasks, tasks, countdowns, subscriptions, waitlist, daily_focus_activity,
 *   users (profile row), and finally the auth.users record.
 */
export async function POST(req: Request) {
    try {
        // ── Authenticate the user ──
        let userId: string | null = null
        const supabase = await createServerSupabaseClient()

        // Try cookie-based session first
        const { data: { user: cookieUser } } = await supabase.auth.getUser()
        if (cookieUser) {
            userId = cookieUser.id
        }

        // Fallback: Bearer token (Capacitor native)
        if (!userId) {
            const authHeader = req.headers.get('Authorization')
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.substring(7)
                const { data: { user: jwtUser } } = await supabase.auth.getUser(token)
                if (jwtUser) {
                    userId = jwtUser.id
                }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // ── Delete all user data using admin client (bypasses RLS) ──
        const admin = createAdminClient()

        // Delete in dependency order — child tables first, then parent tables
        const tablesToDelete = [
            'ai_chat_logs',
            'reports',
            'daily_focus_activity',
            'pomodoro_sessions',
            'habit_logs',
            'habits',
            'subtasks',
            'tasks',
            'countdowns',
            'subscriptions',
            'waitlist',
            'notes',
        ]

        for (const table of tablesToDelete) {
            const { error } = await admin
                .from(table)
                .delete()
                .eq('user_id', userId)

            if (error) {
                // Log but continue — some tables may not exist or may already be empty
                console.error(`[ACCOUNT_DELETE] Error deleting from ${table}:`, error?.message)
            }
        }

        // Delete the users profile row
        const { error: profileError } = await admin
            .from('users')
            .delete()
            .eq('id', userId)

        if (profileError) {
            console.error('[ACCOUNT_DELETE] Error deleting user profile:', profileError?.message)
        }

        // Delete the Supabase Auth user (permanently removes auth record)
        const { error: authError } = await admin.auth.admin.deleteUser(userId)

        if (authError) {
            console.error('[ACCOUNT_DELETE] Error deleting auth user:', authError?.message)
            return NextResponse.json(
                { error: 'Account data deleted but auth removal failed. Contact support.' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, message: 'Account permanently deleted.' })

    } catch (error: unknown) {
        const correlationId = crypto.randomUUID();
        console.error(`[ACCOUNT_DELETE] [${correlationId}] Unexpected error:`, error);
        return NextResponse.json(
            { error: 'Failed to delete account. Please try again or contact support.', correlationId },
            { status: 500 }
        )
    }
}
