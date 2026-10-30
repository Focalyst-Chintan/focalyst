import { useCallback, useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { supabase } from '../src/utils/supabase';
import { useUser } from '../src/utils/UserContext';
import { MCP_CREDITS_CHANGED } from '../src/hooks/useMcpStatus';

const MIN_INTERVAL_MS = 60_000;

/**
 * Asks the server for today's MCP bonus on launch and whenever the app returns to the foreground.
 * The server grants it at most once a day across the website and the app; the app never adds credits.
 * Pro users only. Renders nothing.
 */
export default function McpDailyBonus() {
  const { user, profile } = useUser();
  const isPro = !!profile?.isPro;
  const lastCallRef = useRef(0);

  const claim = useCallback(async () => {
    if (!user || !isPro) return;
    const now = Date.now();
    if (now - lastCallRef.current < MIN_INTERVAL_MS) return;
    lastCallRef.current = now;
    try {
      const { data, error } = await supabase.rpc('claim_daily_mcp_bonus');
      // Not granted, offline or failed: stay silent and try again on the next foreground
      if (error || !(data as { granted?: boolean } | null)?.granted) return;
      const amount = (data as { amount?: number }).amount ?? 0;
      DeviceEventEmitter.emit('showXpPopup', {
        amount,
        badge: `+${amount} MCP`,
        source: 'Daily credits',
        queue: true,
      });
      DeviceEventEmitter.emit(MCP_CREDITS_CHANGED);
    } catch {
      // ignore
    }
  }, [user, isPro]);

  useEffect(() => {
    claim();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') claim();
    });
    return () => sub.remove();
  }, [claim]);

  return null;
}
