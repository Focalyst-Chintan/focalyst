import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, Platform } from 'react-native';

import { supabase } from '../utils/supabase';
import type { BlockingSessionRecord } from '../blocking/history';
import type { StrictnessLevel } from '../../modules/screen-time-blocker';

export const BLOCKING_HISTORY_KEY = '@focalyst_blocking_sessions_history_v1';
export const BLOCKING_HISTORY_UPDATED = 'FOCALYST_BLOCKING_HISTORY_UPDATED';
/** Session ids saved locally but not yet in Supabase (offline, signed out, or tables not migrated). */
const PENDING_SYNC_KEY = '@focalyst_blocking_pending_sync_v1';

/** Enough for 30-day Insights and pattern rules without growing forever. */
const MAX_LOCAL_RECORDS = 300;

export async function loadBlockingHistory(): Promise<BlockingSessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKING_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as BlockingSessionRecord[]) : [];
  } catch {
    return [];
  }
}

/** Saves locally first (S12 and Insights work offline), then syncs in the background. */
export async function recordBlockingSession(record: BlockingSessionRecord): Promise<BlockingSessionRecord[]> {
  const history = [...(await loadBlockingHistory()).filter((r) => r.id !== record.id), record].slice(-MAX_LOCAL_RECORDS);
  try {
    await AsyncStorage.setItem(BLOCKING_HISTORY_KEY, JSON.stringify(history));
  } catch {}
  DeviceEventEmitter.emit(BLOCKING_HISTORY_UPDATED);
  await markPending(record.id, true);
  void flushPendingBlockingSessions();
  return history;
}

async function loadPending(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function markPending(id: string, pending: boolean) {
  const current = await loadPending();
  const next = pending ? [...current.filter((x) => x !== id), id] : current.filter((x) => x !== id);
  try {
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(next.slice(-MAX_LOCAL_RECORDS)));
  } catch {}
}

let flushing: Promise<void> | null = null;

/** Retries every session still waiting for Supabase, oldest first. Safe to call often. */
export function flushPendingBlockingSessions(): Promise<void> {
  flushing ??= (async () => {
    try {
      const pending = await loadPending();
      if (!pending.length) return;
      const byId = new Map((await loadBlockingHistory()).map((r) => [r.id, r]));
      for (const id of pending) {
        const record = byId.get(id);
        // Trimmed from local history: nothing left to send.
        if (!record) {
          await markPending(id, false);
          continue;
        }
        const result = await syncBlockingSession(record);
        if (result === 'retry') break;
        await markPending(id, false);
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/**
 * One session row + one batch of events. Never throws. 'retry' means try again later (offline,
 * signed out, or the tables aren't on the server yet); 'done' means it's stored or already was.
 */
export async function syncBlockingSession(record: BlockingSessionRecord): Promise<'done' | 'retry'> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return 'retry';

    // A previous attempt may have landed before the app lost the response.
    const { data: existing, error: lookupError } = await supabase
      .from('blocking_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('local_session_id', record.id)
      .limit(1)
      .maybeSingle();
    if (lookupError) return 'retry';
    if (existing) return 'done';

    const { data: row, error } = await supabase
      .from('blocking_sessions')
      .insert({
        user_id: userId,
        local_session_id: record.id,
        kind: record.kind,
        level: record.level,
        started_at: new Date(record.startedAt).toISOString(),
        ended_at: new Date(record.endedAt).toISOString(),
        planned_sets: record.plannedSets,
        completed_sets: record.completedSets,
        ended_early: record.endedEarly,
        attempts_count: record.attemptsCount,
        unlocks_count: record.unlocksCount,
        emergency_used: record.emergencyUsed,
        interrupted: record.interrupted,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      })
      .select('id')
      .single();
    if (error || !row) return 'retry';

    const events = record.events.map((e) => ({
      session_id: row.id,
      user_id: userId,
      type: e.type,
      app_label: e.appLabel ?? null,
      app_key: e.appKey ?? null,
      minute_into_block: e.minuteIntoBlock ?? null,
      reason: e.reason ?? null,
      unlock_minutes: e.minutes ?? null,
      at: new Date(e.at).toISOString(),
    }));
    if (events.length) {
      const { error: eventsError } = await supabase.from('blocking_events').insert(events);
      if (eventsError) {
        // Keep the pair together: drop the session row so the retry sends both again.
        await supabase.from('blocking_sessions').delete().eq('id', row.id);
        return 'retry';
      }
    }
    return 'done';
  } catch (e) {
    if (__DEV__) console.warn('[blocking] telemetry sync deferred', e);
    return 'retry';
  }
}

export type BlockingSettingsSnapshot = {
  level: StrictnessLevel;
  unblockOnBreaks: boolean;
  notifyLockUnlock: boolean;
  /** Android package names; empty on iOS (its selection is an opaque token set). */
  androidBlocklist: string[];
  androidAllowlist: string[];
};

/** Mirrors the blocking rules to `blocking_settings` so a reinstall can restore them. Never throws. */
export async function syncBlockingSettings(settings: BlockingSettingsSnapshot) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;
    await supabase.from('blocking_settings').upsert(
      {
        user_id: userId,
        level: settings.level,
        unblock_on_breaks: settings.unblockOnBreaks,
        notify_lock_unlock: settings.notifyLockUnlock,
        android_blocklist: settings.androidBlocklist,
        android_allowlist: settings.androidAllowlist,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (e) {
    if (__DEV__) console.warn('[blocking] settings sync skipped', e);
  }
}
