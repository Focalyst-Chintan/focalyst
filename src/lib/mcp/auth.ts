import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { SUPABASE_ISSUER } from './config';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Used only to verify tokens (getClaims checks the signature against the project's JWKS)
const verifier = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

/**
 * Accepts only Supabase OAuth access tokens: issued by this project, role authenticated,
 * with a subject and a client_id claim. Normal app sessions have no client_id and are refused.
 */
export async function verifyMcpToken(_req: Request, bearer?: string): Promise<AuthInfo | undefined> {
  if (!bearer) return undefined;
  const { data, error } = await verifier.auth.getClaims(bearer);
  if (error || !data?.claims) return undefined;
  const c = data.claims as Record<string, unknown>;
  if (c.iss !== SUPABASE_ISSUER || c.role !== 'authenticated') return undefined;
  if (typeof c.sub !== 'string' || typeof c.client_id !== 'string') return undefined;
  if (typeof c.exp !== 'number' || c.exp * 1000 <= Date.now()) return undefined;
  return {
    token: bearer,
    clientId: c.client_id,
    scopes: typeof c.scope === 'string' ? c.scope.split(' ').filter(Boolean) : [],
    expiresAt: c.exp,
    extra: { userId: c.sub },
  };
}

/** Anon key plus the user's own OAuth token: RLS and the mcp_* functions enforce isolation. */
export function userClient(token: string): SupabaseClient {
  return createClient(URL_, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
