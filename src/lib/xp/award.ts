import { createClient } from '@/lib/supabase';
import { emitDataChanged } from '@/lib/events';
import { getLevelFromXp } from './levels';

const inFlightXp = new Set<string>();

/**
 * Awards XP to the current user matching mobile app xpService.ts:
 * 1. Inserts a row into xp_logs.
 * 2. Additively updates total_xp on the users table.
 * 3. Recalculates current_level and current_title using mobile benchmark table.
 * 4. Emits emitDataChanged('focus') to trigger UI updates.
 */
export async function awardXP(
  amount: number,
  source: string,
  idempotencyKey?: string
): Promise<void> {
  if (amount <= 0) return;

  if (idempotencyKey) {
    if (inFlightXp.has(idempotencyKey)) return;
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(`xp_${idempotencyKey}`)) {
        return;
      }
    } catch {}
    inFlightXp.add(idempotencyKey);
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;

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
    } catch {
      try {
        await supabase.from('xp_logs').insert([
          {
            user_id: uid,
            amount,
            source,
          },
        ]);
      } catch {}
    }

    // 2. Fetch current total_xp and additively increment
    const { data: userData } = await supabase
      .from('users')
      .select('total_xp')
      .eq('id', uid)
      .maybeSingle();

    const currentXP = Number((userData as any)?.total_xp || 0);
    const newTotalXP = currentXP + amount;

    // 3. Recalculate level and title
    const { level, title } = getLevelFromXp(newTotalXP);

    // 4. Update user row with new totals
    await supabase
      .from('users')
      .update({
        total_xp: newTotalXP,
        current_level: level,
        current_title: title,
      })
      .eq('id', uid);

    if (idempotencyKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`xp_${idempotencyKey}`, '1');
      } catch {}
    }

    // 5. Emit data changed event so level UIs refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fx:xp-awarded', {
          detail: { amount, source, totalXp: newTotalXP, level, title },
        })
      );
      emitDataChanged('focus');
    }
  } catch (e) {
    console.warn('Error awarding XP:', e);
  } finally {
    if (idempotencyKey) {
      inFlightXp.delete(idempotencyKey);
    }
  }
}
