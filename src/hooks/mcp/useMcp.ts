'use client';
import type { OAuthGrant } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useData } from '@/lib/data/useData';
import { useAuth } from '@/context/AuthContext';

export type McpCredits = {
  has_account: boolean;
  is_pro: boolean;
  balance?: number;
  monthly_credits: number;
  daily_bonus: number;
  period_start?: string;
  period_end?: string;
  bonus_claimed_today?: boolean;
  plan?: string | null;
  /** Monthly and yearly plans only; null for lifetime */
  plan_renews_at?: string | null;
};

export type McpPrice = { tool: string; label: string; cost: number; is_write: boolean; sort: number };

export type McpLedgerRow = {
  id: string;
  kind: 'tool' | 'reset' | 'bonus' | 'adjustment';
  tool: string | null;
  client_id: string | null;
  delta: number;
  status: 'pending' | 'success' | 'refunded';
  created_at: string;
};

export type McpConnectionRow = {
  client_id: string;
  client_name: string | null;
  allow_writes: boolean;
  connected_at: string;
  last_used_at: string | null;
  call_count: number;
  revoked_at: string | null;
  client_host: string | null;
};

export type McpConnectedApp = {
  clientId: string;
  name: string;
  connectedAt: string;
  lastUsedAt: string | null;
  calls: number;
  allowWrites: boolean;
  host: string | null;
  logo: string | null;
};

function useUid() {
  const { user } = useAuth();
  return user?.id ?? null;
}

export function useMcpCredits() {
  const uid = useUid();
  return useData<McpCredits | null>(uid ? `mcp:credits:${uid}` : null, async () => {
    const { data, error } = await createClient().rpc('mcp_my_credits');
    if (error) throw error;
    return (data as McpCredits) ?? null;
  });
}

export function useMcpPrices() {
  const uid = useUid();
  return useData<McpPrice[]>(uid ? `mcp:prices:${uid}` : null, async () => {
    const { data, error } = await createClient()
      .from('mcp_tool_costs')
      .select('tool,label,cost,is_write,sort')
      .order('sort');
    if (error) throw error;
    return (data ?? []) as McpPrice[];
  });
}

export function useMcpActivity(limit: number) {
  const uid = useUid();
  return useData<McpLedgerRow[]>(uid ? `mcp:activity:${uid}:${limit}` : null, async () => {
    const { data, error } = await createClient()
      .from('mcp_credit_ledger')
      .select('id,kind,tool,client_id,delta,status,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as McpLedgerRow[];
  });
}

/**
 * Connected apps: Supabase OAuth grants are the source of truth for what is connected;
 * mcp_connections adds last used, call count and the "can make changes" flag.
 */
export function useMcpConnections() {
  const uid = useUid();
  return useData<{ apps: McpConnectedApp[]; names: Record<string, string> }>(
    uid ? `mcp:connections:${uid}` : null,
    async () => {
      const supabase = createClient();
      const [grantsRes, rowsRes] = await Promise.all([
        supabase.auth.oauth.listGrants(),
        supabase.from('mcp_connections').select('*'),
      ]);
      if (grantsRes.error) throw grantsRes.error;
      if (rowsRes.error) throw rowsRes.error;
      const grants = (grantsRes.data ?? []) as OAuthGrant[];
      const rows = new Map(((rowsRes.data ?? []) as McpConnectionRow[]).map((r) => [r.client_id, r]));

      const names: Record<string, string> = {};
      for (const r of rows.values()) if (r.client_name) names[r.client_id] = r.client_name;

      const apps: McpConnectedApp[] = [];
      for (const g of grants) {
        const id = g.client?.id;
        if (!id) continue;
        const row = rows.get(id);
        const name = g.client?.name?.trim() || row?.client_name || 'Unknown app';
        names[id] = name;
        // Revoked after this grant was made: the app is disconnected
        if (row?.revoked_at && new Date(row.revoked_at) >= new Date(g.granted_at)) continue;
        apps.push({
          clientId: id,
          name,
          connectedAt: g.granted_at,
          lastUsedAt: row?.last_used_at ?? null,
          calls: row?.call_count ?? 0,
          allowWrites: row?.allow_writes ?? true,
          host: row?.client_host ?? null,
          logo: g.client?.logo_uri || null,
        });
      }
      return { apps, names };
    }
  );
}
