import { DeviceEventEmitter } from 'react-native';
import { supabase } from './supabase';

export interface LevelBenchmark {
  level: number;
  title: string;
  xp: number;
}

export const LEVEL_BENCHMARKS: LevelBenchmark[] = [
  { level: 1, title: 'Ignition', xp: 0 },
  { level: 2, title: 'Momentum', xp: 100 },
  { level: 3, title: 'Builder', xp: 300 },
  { level: 4, title: 'Practitioner', xp: 700 },
  { level: 5, title: 'Disciplined', xp: 1400 },
  { level: 6, title: 'Focused', xp: 2500 },
  { level: 7, title: 'Flow', xp: 4000 },
  { level: 8, title: 'Operator', xp: 6500 },
  { level: 9, title: 'Achiever', xp: 9500 },
  { level: 10, title: 'Strategist', xp: 13500 },
  { level: 11, title: 'Mastery', xp: 19000 },
  { level: 12, title: 'Elite', xp: 26000 },
  { level: 13, title: 'Apex', xp: 36000 },
  { level: 14, title: 'Legend', xp: 50000 },
  { level: 15, title: 'Limitless', xp: 70000 },
];

/**
 * Derives current_level and current_title from a given total XP value.
 */
export function getLevelFromXP(totalXp: number): { level: number; title: string } {
  let result = LEVEL_BENCHMARKS[0];
  for (let i = LEVEL_BENCHMARKS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_BENCHMARKS[i].xp) {
      result = LEVEL_BENCHMARKS[i];
      break;
    }
  }
  return { level: result.level, title: result.title };
}

/**
 * Awards XP to the current user.
 *
 * 1. Inserts a row into xp_logs.
 * 2. Additively updates total_xp on the users table.
 * 3. Recalculates current_level and current_title.
 * 4. Triggers the global XP popup via DeviceEventEmitter.
 */
const awardedIdempotencyKeys = new Set<string>();

export async function awardXP(amount: number, source: string, idempotencyKey?: string): Promise<void> {
  try {
    if (idempotencyKey) {
      if (awardedIdempotencyKeys.has(idempotencyKey)) {
        return;
      }
      awardedIdempotencyKeys.add(idempotencyKey);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid || amount <= 0) return;

    // 1. Insert XP log entry
    const logPayload: any = {
      user_id: uid,
      amount,
      source,
    };
    if (idempotencyKey) {
      logPayload.idempotency_key = idempotencyKey;
    }

    try {
      await supabase.from('xp_logs').insert([logPayload]);
    } catch (insertErr) {
      // Fallback if idempotency_key column is not in schema
      try {
        await supabase.from('xp_logs').insert([{
          user_id: uid,
          amount,
          source,
        }]);
      } catch {}
    }

    // 2. Fetch current total_xp and additively increment
    const { data: userData } = await supabase
      .from('users')
      .select('total_xp')
      .eq('id', uid)
      .single();

    const currentXP = (userData as any)?.total_xp || 0;
    const newTotalXP = currentXP + amount;

    // 3. Recalculate level and title
    const { level, title } = getLevelFromXP(newTotalXP);

    // 4. Update user row with new totals
    await supabase
      .from('users')
      .update({
        total_xp: newTotalXP,
        current_level: level,
        current_title: title,
      })
      .eq('id', uid);

    // 5. Trigger popup animation globally
    DeviceEventEmitter.emit('showXpPopup', { amount, source });
  } catch (e) {
    console.warn('Error awarding XP:', e);
  }
}
