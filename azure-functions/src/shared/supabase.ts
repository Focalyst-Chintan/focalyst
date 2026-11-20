import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Returns a cached Supabase Admin client using the service role key.
 * Bypasses RLS for backend newsletter operations.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is missing');
    }
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing');
    }

    adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
