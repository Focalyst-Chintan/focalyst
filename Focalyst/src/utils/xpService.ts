import { DeviceEventEmitter } from 'react-native';
import { supabase } from './supabase';
import { syncLevelBadges } from './badgeMilestones';
import {
  LEVEL_BENCHMARKS,
  getLevelFromXP,
  type LevelBenchmark,
} from './levelBenchmarks';

export { LEVEL_BENCHMARKS, getLevelFromXP, type LevelBenchmark };

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

    // 5. Persist level badges & trigger popup animation globally
    void syncLevelBadges(level, uid);
    DeviceEventEmitter.emit('showXpPopup', { amount, source });
  } catch (e) {
    console.warn('Error awarding XP:', e);
  }
}
