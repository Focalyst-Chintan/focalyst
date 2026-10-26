import 'server-only';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function supabaseFor(req: NextRequest): Promise<SupabaseClient> {
  const bearer = req.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    return createClient(URL_, ANON, {
      global: { headers: { Authorization: bearer } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  const store = await cookies();
  return createServerClient(URL_, ANON, { cookies: { getAll: () => store.getAll(), setAll: () => {} } });
}

export async function requireUser(req: NextRequest): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const supabase = await supabaseFor(req);
  const { data: { user } } = await supabase.auth.getUser(); // verified with Supabase, never getSession() on the server
  return user ? { user, supabase } : null;
}

// Same-site browser requests only. Requests with no Origin header (server to server) are allowed;
// the route still requires a logged-in user.
export function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  if (origin === 'capacitor://localhost' || origin === 'https://localhost' || origin === 'http://localhost') {
    return true;
  }
  try {
    return new URL(origin).host === req.nextUrl.host || /^(www\.)?focalyst\.online$/.test(new URL(origin).host)
      || (process.env.NODE_ENV !== 'production' && new URL(origin).hostname === 'localhost');
  } catch { return false; }
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowed = originAllowed(req);
  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

