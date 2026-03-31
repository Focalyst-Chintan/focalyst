import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key.
 * Use ONLY in server-side API routes / webhooks.
 * Bypasses Row Level Security.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
}
