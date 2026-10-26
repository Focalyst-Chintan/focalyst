'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';
import { localDateStr } from '@/lib/utils/date';

export interface FocusTodayData {
  minutes: number;
  sessionsCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useFocusToday(): FocusTodayData {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const today = localDateStr(new Date());

      const { data } = await supabase
        .from('daily_focus_activity')
        .select('focus_time_minutes, focus_minutes, sessions_completed')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      const mins = data?.focus_time_minutes ?? data?.focus_minutes ?? 0;
      const count = data?.sessions_completed ?? 0;
      setMinutes(mins);
      setSessionsCount(count);
    } catch (e) {
      console.warn('Error in useFocusToday:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchToday();

    const handleFocusUpdated = () => {
      fetchToday();
    };

    const handleWindowFocus = () => {
      fetchToday();
    };

    window.addEventListener('fx:focus-updated', handleFocusUpdated);
    window.addEventListener('focalyst:focus-updated', handleFocusUpdated);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('fx:focus-updated', handleFocusUpdated);
      window.removeEventListener('focalyst:focus-updated', handleFocusUpdated);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchToday]);

  return { minutes, sessionsCount, loading, refetch: fetchToday };
}
