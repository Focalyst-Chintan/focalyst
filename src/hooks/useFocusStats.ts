'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { onDataChanged } from '@/lib/events';
import { localDateStr, parseYMDToLocalNoon } from '@/lib/utils/date';

// fromYMD/toYMD are inclusive LOCAL days ('YYYY-MM-DD')
export function useFocusStats(fromYMD: string, toYMD: string) {
  const [state, setState] = useState({
    totalMinutes: 0,
    sessions: 0,
    byDay: {} as Record<string, number>,
    byHour: Array(24).fill(0) as number[],
    rows: [] as any[],
    loading: true,
  });

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // 1) local range -> ISO timestamps
      // fromYMD start at 00:00:00 local
      const [fromY, fromM, fromD] = fromYMD.split('-').map(Number);
      const startLocal = new Date(fromY, fromM - 1, fromD, 0, 0, 0, 0);
      const startIso = startLocal.toISOString();

      // endExclusive = day after toYMD at 00:00:00 local
      const [toY, toM, toD] = toYMD.split('-').map(Number);
      const endExclusiveLocal = new Date(toY, toM - 1, toD + 1, 0, 0, 0, 0);
      const endExclusiveIso = endExclusiveLocal.toISOString();

      // 2) Query pomodoro_sessions where started_at >= start and < endExclusive
      const { data: rows, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', startIso)
        .lt('started_at', endExclusiveIso)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error in useFocusStats query:', error);
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // 3) Dedupe rows by id
      const seen = new Set<string>();
      const deduped: any[] = [];
      (rows || []).forEach((r: any) => {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          deduped.push(r);
        }
      });

      // 4) Compute totals, byDay, and byHour mapping
      let totalMinutes = 0;
      const byDay: Record<string, number> = {};
      const byHour = Array(24).fill(0);

      deduped.forEach((r: any) => {
        const mins = Number(r.focus_minutes) || 0;
        totalMinutes += mins;

        // Local date and hour of this session
        const sessionDate = new Date(r.started_at || r.created_at);
        const rowDateStr = localDateStr(sessionDate);
        byDay[rowDateStr] = (byDay[rowDateStr] || 0) + mins;

        const hour = sessionDate.getHours();
        if (hour >= 0 && hour < 24) {
          byHour[hour] += mins;
        }
      });

      setState({
        totalMinutes,
        sessions: deduped.length,
        byDay,
        byHour,
        rows: deduped,
        loading: false,
      });
    } catch (err) {
      console.error('Error in useFocusStats:', err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [fromYMD, toYMD]);

  useEffect(() => {
    load();
    const off = onDataChanged(['focus'], load);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      off();
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return { ...state, refetch: load };
}
