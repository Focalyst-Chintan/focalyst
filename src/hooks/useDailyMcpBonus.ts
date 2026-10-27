'use client';
import { useEffect } from 'react';
import { useSWRConfig } from 'swr';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { isPaidPlan, localDateKey } from '@/lib/featureGates';
import { useToast } from '@/components/desktop/ui/Toast';
import { MCP_DAILY_BONUS } from '@/lib/mcp/config';

/**
 * Claims the daily MCP bonus once per local day for Pro users.
 * Mount once in the signed-in app layout. The database checks Pro and the daily limit again.
 */
export function useDailyMcpBonus() {
  const { user, plan } = useAuth();
  const { mutate } = useSWRConfig();
  const { show } = useToast();
  const uid = user?.id ?? null;
  const pro = isPaidPlan(plan);

  useEffect(() => {
    if (!uid || !pro) return;
    const key = `fx-mcp-bonus-${localDateKey()}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }

    // The database allows one claim a day, so a repeated call just returns already_claimed
    const claim = async () => {
      const { data, error } = await createClient().rpc('mcp_claim_daily_bonus');
      // Network or server error: try again on the next visit
      if (error || !data) return;
      try {
        localStorage.setItem(key, '1');
      } catch {
        // storage unavailable
      }
      const res = data as { claimed?: boolean; amount?: number };
      if (!res.claimed) return;
      show(`+${res.amount ?? MCP_DAILY_BONUS} MCP credits added for opening Focalyst today`, 'success');
      mutate((k) => typeof k === 'string' && (k.startsWith('mcp:credits:') || k.startsWith('mcp:activity:')));
    };
    claim().catch(() => {});
    // show and mutate are stable enough; run once per user and plan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, pro]);
}
