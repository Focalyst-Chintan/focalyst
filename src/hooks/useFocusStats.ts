'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/lib/data/useData';
import { localDateStr } from '@/lib/utils/date';

export interface FocusStatsResult {
  totalMinutes: number;
  sessions: number;
  byDay: Record<string, number>;
  byHour: number[];
  rows: any[];
  loading: boolean;
  refetch: () => Promise<any>;
}

// fromYMD/toYMD are inclusive LOCAL days ('YYYY-MM-DD')
export function useFocusStats(fromYMD: string, toYMD: string): FocusStatsResult {
  const { user } = useAuth();

  const fetcher = useCallback(async () => {
    if (!user) {
      return {
        totalMinutes: 0,
        sessions: 0,
        byDay: {} as Record<string, number>,
        byHour: Array(24).fill(0) as number[],
        rows: [] as any[],
      };
    }

    const supabase = createClient();

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
      .select('id, user_id, focus_minutes, started_at, created_at')
      .eq('user_id', user.id)
      .gte('started_at', startIso)
      .lt('started_at', endExclusiveIso)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error in useFocusStats query:', error);
      throw error;
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

    return {
      totalMinutes,
      sessions: deduped.length,
      byDay,
      byHour,
      rows: deduped,
    };
  }, [user, fromYMD, toYMD]);

  const key = user ? `focus:${user.id}:${fromYMD}:${toYMD}` : null;
  const { data, isLoading, mutate } = useData(key, fetcher);

  return {
    totalMinutes: data?.totalMinutes ?? 0,
    sessions: data?.sessions ?? 0,
    byDay: data?.byDay ?? {},
    byHour: data?.byHour ?? Array(24).fill(0),
    rows: data?.rows ?? [],
    loading: isLoading,
    refetch: mutate,
  };
}
