import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../utils/supabase';

// Emitted after the daily bonus is granted so every MCP view refreshes.
export const MCP_CREDITS_CHANGED = 'mcpCreditsChanged';

export const MCP_CONNECTIONS_URL = 'https://focalyst.online/settings?tab=connections';

export type McpSummary = {
  isPro: boolean;
  /** False until the first app is connected; credits start then */
  hasAccount: boolean;
  balance: number | null;
  monthlyAllowance: number | null;
  refillDate: string | null;
  bonusClaimedToday: boolean;
  /** Display names of active connections */
  apps: string[];
};

const KNOWN_APPS: { pattern: RegExp; name: string }[] = [
  { pattern: /chatgpt|openai/i, name: 'ChatGPT' },
  { pattern: /claude|anthropic/i, name: 'Claude' },
  { pattern: /gemini|google/i, name: 'Gemini' },
];

/** Clean display name for a stored OAuth client name; unknown clients keep their stored name */
export function mcpAppDisplayName(raw: string | null | undefined): string {
  const name = raw?.trim() || '';
  return KNOWN_APPS.find((a) => a.pattern.test(name))?.name ?? (name || 'Unknown app');
}

/** "None", "ChatGPT", "ChatGPT, Claude", "ChatGPT, Claude +1" */
export function formatMcpApps(names: string[]): string {
  if (names.length === 0) return 'None';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "27 Nov" in the device's local time */
export function formatMcpDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** One read with the user's own session; throws on any failure so callers show "Unavailable" */
export async function fetchMcpSummary(): Promise<McpSummary> {
  const { data, error } = await supabase.rpc('get_mcp_credit_summary');
  if (error || !data) throw error ?? new Error('no data');
  const r = data as {
    is_pro?: boolean;
    has_account?: boolean;
    balance?: number | null;
    monthly_allowance?: number | null;
    refill_date?: string | null;
    bonus_claimed_today?: boolean;
    connected_apps?: { client_name: string | null }[];
  };
  const names = new Set((r.connected_apps ?? []).map((a) => mcpAppDisplayName(a.client_name)));
  return {
    isPro: !!r.is_pro,
    hasAccount: !!r.has_account,
    balance: num(r.balance),
    monthlyAllowance: num(r.monthly_allowance),
    refillDate: r.refill_date ?? null,
    bonusClaimedToday: !!r.bonus_claimed_today,
    apps: [...names].sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * MCP credits and connected apps for Pro users. Refetches when the screen regains focus,
 * when the app returns to the foreground (for example from the browser) and after a bonus grant.
 */
export function useMcpSummary(enabled: boolean) {
  const [state, setState] = useState<{ data: McpSummary | null; loading: boolean; error: boolean }>({
    data: null,
    loading: enabled,
    error: false,
  });
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    // Keep the last values on screen while refreshing; only the first load shows the loader
    setState((p) => ({ ...p, loading: p.data === null }));
    try {
      const data = await fetchMcpSummary();
      if (id === requestId.current) setState({ data, loading: false, error: false });
    } catch {
      if (id === requestId.current) setState((p) => ({ ...p, loading: false, error: p.data === null }));
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!enabled) return;
    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    const bonusSub = DeviceEventEmitter.addListener(MCP_CREDITS_CHANGED, () => refresh());
    return () => {
      appSub.remove();
      bonusSub.remove();
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
