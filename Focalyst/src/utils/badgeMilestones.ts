import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { LEVEL_BENCHMARKS, type LevelBenchmark } from './levelBenchmarks';

export interface LevelBadgePalette {
  baseFill: string;
  innerBevel: string;
  rimHighlight: string;
  bottomEdge: string;
  numberFill: string;
  accentGlow: string;
}

export interface LevelBadgeDefinition extends LevelBenchmark {
  badgeKey: string;
  palette: LevelBadgePalette;
}

export interface StreakBadgeDefinition {
  days: number;
  badgeKey: string;
  label: string;
}

export const LEVEL_BADGE_PALETTES: Record<number, LevelBadgePalette> = {
  1: {
    baseFill: '#22B8CF',
    innerBevel: '#15AABF',
    rimHighlight: '#66D9E8',
    bottomEdge: '#0B7285',
    numberFill: '#084C5A',
    accentGlow: '#22B8CF',
  },
  2: {
    baseFill: '#FA5252',
    innerBevel: '#F03E3E',
    rimHighlight: '#FF8787',
    bottomEdge: '#C92A2A',
    numberFill: '#7F1D1D',
    accentGlow: '#FA5252',
  },
  3: {
    baseFill: '#82C91E',
    innerBevel: '#74B816',
    rimHighlight: '#A9E34B',
    bottomEdge: '#5C940D',
    numberFill: '#365314',
    accentGlow: '#82C91E',
  },
  4: {
    baseFill: '#9775FA',
    innerBevel: '#845EF7',
    rimHighlight: '#B197FC',
    bottomEdge: '#5F3DC4',
    numberFill: '#3B1D8E',
    accentGlow: '#9775FA',
  },
  5: {
    baseFill: '#FAB005',
    innerBevel: '#F59F00',
    rimHighlight: '#FFD43B',
    bottomEdge: '#E67700',
    numberFill: '#7C2D12',
    accentGlow: '#FAB005',
  },
  6: {
    baseFill: '#20C997',
    innerBevel: '#12B886',
    rimHighlight: '#63E6BE',
    bottomEdge: '#087F5B',
    numberFill: '#064E3B',
    accentGlow: '#20C997',
  },
  7: {
    baseFill: '#E64980',
    innerBevel: '#D6336C',
    rimHighlight: '#F783AC',
    bottomEdge: '#A61E4D',
    numberFill: '#6B1032',
    accentGlow: '#E64980',
  },
  8: {
    baseFill: '#339AF0',
    innerBevel: '#228BE6',
    rimHighlight: '#74C0FC',
    bottomEdge: '#1864AB',
    numberFill: '#0C3B6E',
    accentGlow: '#339AF0',
  },
  9: {
    baseFill: '#FF7A1A',
    innerBevel: '#F76707',
    rimHighlight: '#FFA94D',
    bottomEdge: '#C2410C',
    numberFill: '#7C2D12',
    accentGlow: '#FF7A1A',
  },
  10: {
    baseFill: '#5C7CFA',
    innerBevel: '#4C6EF5',
    rimHighlight: '#91A7FF',
    bottomEdge: '#364FC7',
    numberFill: '#1E2D7D',
    accentGlow: '#5C7CFA',
  },
  11: {
    baseFill: '#12B886',
    innerBevel: '#0CA678',
    rimHighlight: '#38D9A9',
    bottomEdge: '#087F5B',
    numberFill: '#044E38',
    accentGlow: '#12B886',
  },
  12: {
    baseFill: '#F03E3E',
    innerBevel: '#E03131',
    rimHighlight: '#FF6B6B',
    bottomEdge: '#9F1239',
    numberFill: '#5E0B22',
    accentGlow: '#F03E3E',
  },
  13: {
    baseFill: '#CC5DE8',
    innerBevel: '#BE4BDB',
    rimHighlight: '#E599F7',
    bottomEdge: '#862E9C',
    numberFill: '#4A1259',
    accentGlow: '#CC5DE8',
  },
  14: {
    baseFill: '#FFD43B',
    innerBevel: '#FCC419',
    rimHighlight: '#FFE066',
    bottomEdge: '#B45309',
    numberFill: '#713F12',
    accentGlow: '#FFD43B',
  },
  15: {
    baseFill: '#1951FC',
    innerBevel: '#0B2CB1',
    rimHighlight: '#6FA4FF',
    bottomEdge: '#03195B',
    numberFill: '#FFFFFF',
    accentGlow: '#38BDF8',
  },
};

export const LEVEL_BADGES: LevelBadgeDefinition[] = LEVEL_BENCHMARKS.map((lvl) => ({
  ...lvl,
  badgeKey: `level_${lvl.level}`,
  palette: LEVEL_BADGE_PALETTES[lvl.level] || LEVEL_BADGE_PALETTES[1],
}));

export const STREAK_MILESTONES: readonly number[] = [
  3, 7, 14, 21, 30, 50, 100, 180, 365,
];

export const STREAK_BADGES: StreakBadgeDefinition[] = STREAK_MILESTONES.map((days) => ({
  days,
  badgeKey: `streak_${days}`,
  label: `${days}-day streak`,
}));

export type UnlockedBadgeMap = Record<string, string>;

const STORAGE_PREFIX = 'focalyst_unlocked_badges_v1';

function getStorageKey(userId?: string): string {
  return userId ? `${STORAGE_PREFIX}_${userId}` : STORAGE_PREFIX;
}

export async function getLocalUnlockedBadges(userId?: string): Promise<UnlockedBadgeMap> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveLocalUnlockedBadges(
  badges: UnlockedBadgeMap,
  userId?: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(badges));
  } catch {
    // ignore storage errors
  }
}

interface PendingBadgeRow {
  user_id: string;
  badge_key: string;
  badge_type: 'level' | 'streak';
  threshold: number;
  unlocked_at: string;
}

async function persistBadgesToSupabase(rows: PendingBadgeRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    await supabase
      .from('user_badges')
      .upsert(rows, { onConflict: 'user_id,badge_key', ignoreDuplicates: true });
  } catch {
    // Gracefully fall back to AsyncStorage if table is not yet migrated or offline
  }
}

export async function syncLevelBadges(
  currentLevel: number,
  userId?: string
): Promise<UnlockedBadgeMap> {
  const safeLevel = Math.max(1, Math.min(15, Math.floor(Number(currentLevel) || 1)));
  const existing = await getLocalUnlockedBadges(userId);
  const now = new Date().toISOString();
  const next: UnlockedBadgeMap = { ...existing };
  const newRows: PendingBadgeRow[] = [];
  const staleKeys: string[] = [];

  for (const badge of LEVEL_BADGES) {
    if (badge.level <= safeLevel) {
      if (!next[badge.badgeKey]) {
        next[badge.badgeKey] = now;
        if (userId) {
          newRows.push({
            user_id: userId,
            badge_key: badge.badgeKey,
            badge_type: 'level',
            threshold: badge.level,
            unlocked_at: now,
          });
        }
      }
    } else if (next[badge.badgeKey]) {
      delete next[badge.badgeKey];
      staleKeys.push(badge.badgeKey);
    }
  }

  if (newRows.length > 0 || staleKeys.length > 0) {
    await saveLocalUnlockedBadges(next, userId);
  }
  if (newRows.length > 0) {
    await persistBadgesToSupabase(newRows);
  }
  if (userId && staleKeys.length > 0) {
    try {
      await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', userId)
        .in('badge_key', staleKeys);
    } catch {
      // Gracefully ignore if offline or table not migrated
    }
  }
  return next;
}

export async function syncStreakBadges(
  maxStreakDays: number,
  userId?: string
): Promise<UnlockedBadgeMap> {
  const safeStreak = Math.max(0, Math.floor(Number(maxStreakDays) || 0));
  const existing = await getLocalUnlockedBadges(userId);
  if (safeStreak < STREAK_MILESTONES[0]) return existing;

  const now = new Date().toISOString();
  const next: UnlockedBadgeMap = { ...existing };
  const newRows: PendingBadgeRow[] = [];

  for (const badge of STREAK_BADGES) {
    if (badge.days <= safeStreak && !next[badge.badgeKey]) {
      next[badge.badgeKey] = now;
      if (userId) {
        newRows.push({
          user_id: userId,
          badge_key: badge.badgeKey,
          badge_type: 'streak',
          threshold: badge.days,
          unlocked_at: now,
        });
      }
    }
  }

  await saveLocalUnlockedBadges(next, userId);
  if (newRows.length > 0) {
    await persistBadgesToSupabase(newRows);
  }
  return next;
}

export async function loadAllUserBadges(
  userId?: string,
  currentLevel = 1,
  maxHabitStreak = 0
): Promise<UnlockedBadgeMap> {
  const merged: UnlockedBadgeMap = { ...(await getLocalUnlockedBadges(userId)) };

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_key, unlocked_at')
        .eq('user_id', userId);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (
            row.badge_key &&
            (!merged[row.badge_key] || row.unlocked_at < merged[row.badge_key])
          ) {
            merged[row.badge_key] = row.unlocked_at;
          }
        }
        await saveLocalUnlockedBadges(merged, userId);
      }
    } catch {
      // Fall back to AsyncStorage
    }
  }

  const afterLevels = await syncLevelBadges(currentLevel, userId);
  const afterStreaks = await syncStreakBadges(maxHabitStreak, userId);

  return {
    ...afterLevels,
    ...afterStreaks,
  };
}
