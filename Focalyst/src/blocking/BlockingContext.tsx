import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import * as Blocker from '../../modules/screen-time-blocker';
import type {
  AndroidAppItem,
  AndroidInstalledApps,
  AuthStatus,
  PickerMode,
  PickerResult,
  SessionBlockingLog,
  StrictnessLevel,
} from '../../modules/screen-time-blocker';
import { formatClock, levelRank, selectionTotal } from './levels';
import { sendBlockingUpdate } from './notifications';
import { activeOccurrences, isExpiredOneOff, mondayIndexToWeekday, type Schedule } from './schedules';
import { useUser } from '../utils/UserContext';
import type { BlockingEventRecord, BlockingSessionRecord } from './history';
import {
  flushPendingBlockingSessions,
  recordBlockingSession,
  syncBlockingSettings,
} from '../services/blockingTelemetrySync';
import { Snackbar } from '../../components/blocking/Snackbar';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockingConfig = {
  setupCompletedAt: number | null;
  enabled: boolean;
  level: StrictnessLevel;
  blocklistSummary: PickerResult;
  allowedSummary: PickerResult;
  unblockOnBreaks: boolean;
  notifyLockUnlock: boolean;
};

export type SessionPhase =
  | 'idle'
  | 'focus_locked'
  | 'break_open'
  | 'break_locked'
  | 'paused_open'
  | 'paused_locked'
  | 'focus_emergency_open'
  | 'timer_only';

/** The Pomodoro's blocking state. Shields themselves are decided by `EffectiveShield`. */
export type ActiveSession = {
  sessionId: string;
  phase: Exclude<SessionPhase, 'idle'>;
  level: StrictnessLevel;
  /** Breaks keep shields on: "Open apps during breaks" is off, or focus blocks are under 15 min. */
  keepLockedThroughBreaks: boolean;
  startedAt: number;
  /** End of the current focus block or break (epoch ms). */
  phaseEndsAt: number;
  /** End of the last focus block (epoch ms). */
  plannedEndAt: number;
  pausedAt: number | null;
  currentSet: number;
  totalSets: number;
  breakMinutes: number;
  focusMinutes: number;
  /** Telemetry from earlier native runs; each native start resets the native log. */
  carriedAttempts: number;
  carriedUnlocks?: number;
  carriedEvents?: BlockingEventRecord[];
  /** Permission was missing or revoked, so this session runs as a plain timer. */
  permissionLost: boolean;
  /** Free plan with more apps or categories selected than it allows. */
  blockedByPlan?: boolean;
};

export type QuickBlockState = { id: string; endAt: number; level: StrictnessLevel; startedAt: number };

export type ShieldSourceKind = 'pomodoro' | 'quick' | 'schedule';

type ShieldSource = {
  kind: ShieldSourceKind;
  key: string;
  level: StrictnessLevel;
  startAt: number;
  endAt: number;
  label?: string;
};

/** What the native store should be doing right now: every active source merged. */
export type EffectiveShield = {
  active: boolean;
  /** Stricter level wins. */
  level: StrictnessLevel;
  /** Later end wins. */
  endAt: number;
  sources: ShieldSource[];
  /** Unlock budget key: the Pomodoro session, else the quick block, else the schedule run. */
  key: string | null;
};

type NativeState = { active: boolean; level: StrictnessLevel; endAt: number; key: string | null };

export type UnlockWindow = {
  endsAt: number;
  minutes: number;
  /** Android: the one app this unlock opened. Null when every locked app opened. */
  appName?: string | null;
};

/** The app the user tapped on the shield, for unlock copy like "Why do you need Instagram?". */
export type UnlockTarget = { packageName: string | null; appName: string | null; iconUri: string | null };

export type PomodoroSnapshot = {
  /** Set when the Pomodoro just ended, for the session summary. */
  ended?: { focusMinutes: number; completedSets: number; completedAll: boolean };
  view: 'config' | 'pomodoro' | 'break';
  running: boolean;
  timeLeftSec: number;
  currentSet: number;
  totalSets: number;
  focusMin: number;
  breakMin: number;
};

export type SetupDraft = Pick<BlockingConfig, 'level' | 'unblockOnBreaks' | 'notifyLockUnlock'>;

/** `pro: true` means the action needs Focalyst Pro; callers open the paywall. */
type Result = { ok: true } | { ok: false; reason: string; pro?: true };

export type QuickBlockResult = 'ok' | 'limit' | 'permission' | 'failed';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIG_KEY = 'focalyst.blocking.config.v1';
const SESSION_KEY = 'focalyst.blocking.session.v1';
const QUICK_KEY = 'focalyst.blocking.quick.v2';
const LEGACY_QUICK_KEY = 'focalyst.blocking.quick.v1';
const SCHEDULES_KEY = 'focalyst.blocking.schedules.v1';
const RUNTIME_KEY = 'focalyst.blocking.runtime.v1';

const END_NOTIFICATION_ID = 'focalyst-blocking-end';

export const RATCHET_MESSAGE = 'Available after this session ends.';
/** DeviceActivity intervals can't be shorter than 15 minutes on iPhone. */
export const MIN_UNLOCKABLE_FOCUS_MIN = 15;
/** Firm: a paused session ends on its own after this long. */
export const FIRM_PAUSE_LIMIT_MS = 10 * 60 * 1000;
export const FIRM_UNLOCKS_PER_SESSION = 2;
export const GENTLE_UNLOCK_MINUTES = 5;

// ─── Free plan ────────────────────────────────────────────────────────────────
export const FREE_MAX_APPS = 2;
export const FREE_MAX_SESSIONS = 2;
export const FREE_MAX_UNLOCK_MINUTES = 5;
export const PRO_LEVEL_MESSAGE = 'Firm and Locked are part of Focalyst Pro.';
export const FREE_SESSION_MESSAGE =
  'Free tier includes up to 2 blocking sessions. Upgrade to Pro for unlimited sessions.';

/** Free plan: at most 2 apps and no whole categories. */
export const exceedsFreeAppLimit = (s: PickerResult) => s.appCount > FREE_MAX_APPS || s.categoryCount > 0;

export const openPaywall = () => router.push('/paywall');

const PENDING_UNLOCK_MAX_AGE_MS = 90_000;
const SHIELD_NOTIFICATION_ID = 'focalyst.shield.unlock';
const UNLOCK_URL = 'focalyst://blocking/unlock';

const EMPTY_SUMMARY: PickerResult = { appCount: 0, categoryCount: 0, webCount: 0 };

const IS_ANDROID = Platform.OS === 'android';
/** Android: the deep link usually routes to the unlock screen first; only push if it didn't. */
const UNLOCK_PUSH_DELAY_MS = IS_ANDROID ? 700 : 300;

const DEFAULT_CONFIG: BlockingConfig = {
  setupCompletedAt: null,
  enabled: false,
  level: 'firm',
  blocklistSummary: EMPTY_SUMMARY,
  allowedSummary: EMPTY_SUMMARY,
  unblockOnBreaks: true,
  notifyLockUnlock: true,
};

const INACTIVE_NATIVE: NativeState = { active: false, level: 'gentle', endAt: 0, key: null };

const SHIELDED_PHASES = new Set<SessionPhase>(['focus_locked', 'break_locked', 'paused_locked']);

export const isShieldedPhase = (phase: SessionPhase) => SHIELDED_PHASES.has(phase);

const stricter = (a: StrictnessLevel, b: StrictnessLevel) => (levelRank(a) >= levelRank(b) ? a : b);

/** "6 apps are locked" grammar for notifications. */
const lockedCountPhrase = (s: PickerResult) => {
  const n = selectionTotal(s);
  return `${n} ${n === 1 ? 'app is' : 'apps are'}`;
};

/** Native log events → history records ("phase" markers are dropped). */
const toEventRecords = (log: SessionBlockingLog): BlockingEventRecord[] =>
  log.events
    .filter((e) => e.type !== 'phase')
    .map((e) => ({
      type: e.type as BlockingEventRecord['type'],
      appLabel: e.appLabel ?? e.appId ?? null,
      appKey: IS_ANDROID ? (e.appId ?? null) : null,
      at: e.at,
      minuteIntoBlock: e.minuteIntoBlock ?? null,
      reason: e.reason ?? null,
      minutes: e.minutes ?? null,
    }));

const computePlannedEnd = (snap: PomodoroSnapshot, now: number) => {
  const left = snap.timeLeftSec * 1000;
  const remainingSets = Math.max(0, snap.totalSets - snap.currentSet);
  const focusMs = snap.focusMin * 60_000;
  const breakMs = snap.breakMin * 60_000;
  if (snap.view === 'break') {
    return now + left + remainingSets * focusMs + Math.max(0, remainingSets - 1) * breakMs;
  }
  return now + left + remainingSets * (breakMs + focusMs);
};

/** Where Pomodoro shields should end for the current phase. */
const pomodoroShieldEnd = (s: ActiveSession) => {
  const base = s.keepLockedThroughBreaks ? s.plannedEndAt : s.phaseEndsAt;
  // A Firm pause can last up to 10 minutes, so shields must outlive it.
  return s.phase === 'paused_locked' ? base + FIRM_PAUSE_LIMIT_MS : base;
};

function computeEffective(
  session: ActiveSession | null,
  quick: QuickBlockState | null,
  schedules: Schedule[],
  skipped: string[],
  permission: AuthStatus,
  now: number,
  plan: { isPro: boolean; withinLimits: boolean }
): EffectiveShield {
  const sources: ShieldSource[] = [];
  if (permission === 'approved' && plan.withinLimits) {
    if (session && isShieldedPhase(session.phase)) {
      sources.push({
        kind: 'pomodoro',
        key: session.sessionId,
        level: session.level,
        startAt: session.startedAt,
        endAt: pomodoroShieldEnd(session),
      });
    }
    if (quick && quick.endAt > now) {
      sources.push({ kind: 'quick', key: quick.id, level: quick.level, startAt: quick.startedAt, endAt: quick.endAt });
    }
    for (const occ of activeOccurrences(schedules, now)) {
      if (skipped.includes(occ.occurrenceId)) continue;
      sources.push({
        kind: 'schedule',
        key: occ.occurrenceId,
        level: occ.schedule.level,
        startAt: occ.startAt,
        endAt: occ.endAt,
        label: occ.schedule.name,
      });
    }
  }
  if (sources.length === 0) return { active: false, level: 'gentle', endAt: 0, sources, key: null };
  // Free plan is Gentle only, whatever was saved before.
  if (!plan.isPro) sources.forEach((s) => (s.level = 'gentle'));
  return {
    active: true,
    level: sources.reduce<StrictnessLevel>((acc, s) => stricter(acc, s.level), 'gentle'),
    endAt: Math.max(...sources.map((s) => s.endAt)),
    sources,
    key: session?.sessionId ?? sources[0].key,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

type BlockingContextValue = {
  ready: boolean;
  /** Screen Time blocking works on this device and build. */
  supported: boolean;
  config: BlockingConfig;
  permissionStatus: AuthStatus;
  session: ActiveSession | null;
  phase: SessionPhase;
  attempts: number;
  quickBlock: QuickBlockState | null;
  schedules: Schedule[];
  shield: EffectiveShield;
  unlockWindow: UnlockWindow | null;
  /** Unlocks left for the current blocking session (Infinity on Gentle, 0 on Locked). */
  unlocksLeft: number;
  draft: SetupDraft;

  isPro: boolean;
  /** Free plan with too many apps (or any category) selected: blocking won't apply. */
  overFreeAppLimit: boolean;
  /** Free plan: another quick block or schedule would exceed the 2-session cap. */
  canAddBlockingSession: boolean;

  refreshPermission: () => Promise<AuthStatus>;
  requestPermission: () => Promise<'approved' | 'denied'>;
  refreshSelections: () => Promise<void>;
  pickApps: (mode: PickerMode) => Promise<Result>;

  /** Android: installed apps for the in-app picker. Null until the first load finishes. */
  installedApps: AndroidInstalledApps | null;
  loadInstalledApps: () => Promise<void>;
  /** Android: name and icon for a package, once the installed apps are loaded. */
  appInfo: (packageName: string) => AndroidAppItem | undefined;
  blockedPackages: string[];
  allowedPackages: string[];
  setBlockedPackages: (packageNames: string[]) => Promise<Result>;
  setAllowedPackages: (packageNames: string[]) => Promise<Result>;

  unlockTarget: UnlockTarget | null;
  /** The unlock screen reports itself so the shield handoff doesn't open it twice. */
  setUnlockScreenOpen: (open: boolean, packageName?: string | null) => void;

  beginSetup: () => void;
  updateDraft: (patch: Partial<SetupDraft>) => void;
  finishSetup: () => void;

  setEnabled: (enabled: boolean) => Result;
  setLevel: (level: StrictnessLevel) => Result;
  setUnblockOnBreaks: (value: boolean) => Result;
  setNotifyLockUnlock: (value: boolean) => void;
  turnOff: () => Result;

  canChangeLevelTo: (level: StrictnessLevel) => boolean;
  canEditBlocklist: boolean;
  canEditAllowed: boolean;
  canLoosen: boolean;

  syncPomodoro: (snap: PomodoroSnapshot) => void;

  startQuickBlock: (minutes: number, level: StrictnessLevel) => Promise<QuickBlockResult>;
  stopQuickBlock: () => Promise<void>;

  grantUnlock: (minutes: number, reason: 'study' | 'reply' | 'bored' | 'other') => Promise<Result>;
  lockNow: () => Promise<void>;
  canUseEmergencyToday: () => Promise<boolean>;
  emergencyUnlock: () => Promise<Result>;

  saveSchedule: (schedule: Schedule) => Result;
  deleteSchedule: (id: string) => Result;
  isScheduleRunning: (id: string) => boolean;

  showSnackbar: (message: string) => void;

  /** S12: the session that just finished, until the summary is dismissed. */
  lastSummary: BlockingSessionRecord | null;
  dismissSummary: () => void;
};

const BlockingContext = createContext<BlockingContextValue | null>(null);

export function useBlocking() {
  const ctx = useContext(BlockingContext);
  if (!ctx) throw new Error('useBlocking must be used inside <BlockingProvider>');
  return ctx;
}

const persist = (key: string, value: unknown) => {
  if (value == null) AsyncStorage.removeItem(key).catch(() => {});
  else AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
};

export function BlockingProvider({ children }: { children: React.ReactNode }) {
  const supported = (Platform.OS === 'ios' || IS_ANDROID) && Blocker.isAvailable;
  const { profile } = useUser();
  const isPro = !!profile?.isPro;

  const [ready, setReady] = useState(false);
  const [config, setConfigState] = useState<BlockingConfig>(DEFAULT_CONFIG);
  const [permissionStatus, setPermissionStatus] = useState<AuthStatus>('notDetermined');
  const [session, setSessionState] = useState<ActiveSession | null>(null);
  const [quickBlock, setQuickState] = useState<QuickBlockState | null>(null);
  const [schedules, setSchedulesState] = useState<Schedule[]>([]);
  const [native, setNativeState] = useState<NativeState>(INACTIVE_NATIVE);
  const [unlockWindow, setUnlockWindowState] = useState<UnlockWindow | null>(null);
  const [unlockCounts, setUnlockCounts] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<SetupDraft>({
    level: DEFAULT_CONFIG.level,
    unblockOnBreaks: DEFAULT_CONFIG.unblockOnBreaks,
    notifyLockUnlock: DEFAULT_CONFIG.notifyLockUnlock,
  });
  const [liveAttempts, setLiveAttempts] = useState(0);
  const [snack, setSnack] = useState<{ id: number; message: string } | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [lastSummary, setLastSummary] = useState<BlockingSessionRecord | null>(null);
  const [installedApps, setInstalledApps] = useState<AndroidInstalledApps | null>(null);
  const [blockedPackages, setBlockedState] = useState<string[]>([]);
  const [allowedPackages, setAllowedState] = useState<string[]>([]);
  const [unlockTargetRaw, setUnlockTargetRaw] = useState<{ packageName: string | null; label: string | null } | null>(
    null
  );

  // Refs mirror state so queued native work never reads a stale closure.
  const configRef = useRef(config);
  const sessionRef = useRef(session);
  const quickRef = useRef(quickBlock);
  const schedulesRef = useRef(schedules);
  const skippedRef = useRef<string[]>([]);
  const nativeRef = useRef(native);
  const unlockCountsRef = useRef(unlockCounts);
  const permissionRef = useRef(permissionStatus);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const readyRef = useRef<Promise<void> | null>(null);
  /** Mirrors `canLoosen` (the ratchet) for callbacks. */
  const canLoosenRef = useRef(true);
  const isProRef = useRef(isPro);
  isProRef.current = isPro;
  const planRef = () => ({
    isPro: isProRef.current,
    withinLimits: isProRef.current || !exceedsFreeAppLimit(configRef.current.blocklistSummary),
  });

  const setConfig = useCallback((next: BlockingConfig | ((prev: BlockingConfig) => BlockingConfig)) => {
    const value = typeof next === 'function' ? next(configRef.current) : next;
    configRef.current = value;
    setConfigState(value);
    persist(CONFIG_KEY, value);
  }, []);

  const setSession = useCallback((value: ActiveSession | null) => {
    sessionRef.current = value;
    setSessionState(value);
    persist(SESSION_KEY, value);
  }, []);

  /** The last quick block that ran, so its summary can be written after it clears. */
  const lastQuickRef = useRef<QuickBlockState | null>(null);
  const setQuick = useCallback((value: QuickBlockState | null) => {
    if (value) lastQuickRef.current = value;
    quickRef.current = value;
    setQuickState(value);
    persist(QUICK_KEY, value);
  }, []);

  const setSchedules = useCallback((value: Schedule[]) => {
    schedulesRef.current = value;
    setSchedulesState(value);
    persist(SCHEDULES_KEY, value);
  }, []);

  const saveRuntime = useCallback(() => {
    persist(RUNTIME_KEY, {
      native: nativeRef.current,
      unlockCounts: unlockCountsRef.current,
      skipped: skippedRef.current,
    });
  }, []);

  const setNative = useCallback(
    (value: NativeState) => {
      nativeRef.current = value;
      setNativeState(value);
      saveRuntime();
    },
    [saveRuntime]
  );

  const bumpUnlockCount = useCallback(
    (key: string) => {
      const next = { ...unlockCountsRef.current, [key]: (unlockCountsRef.current[key] ?? 0) + 1 };
      unlockCountsRef.current = next;
      setUnlockCounts(next);
      saveRuntime();
    },
    [saveRuntime]
  );

  const enqueue = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(work, work);
    queueRef.current = run.catch(() => {});
    return run;
  }, []);

  const showSnackbar = useCallback((message: string) => {
    setSnack({ id: Date.now(), message });
  }, []);

  // ─── Permission & selections ───────────────────────────────────────────────

  const refreshPermission = useCallback(async () => {
    const status = supported ? await Blocker.getAuthorizationStatus() : 'notDetermined';
    permissionRef.current = status;
    setPermissionStatus(status);
    return status;
  }, [supported]);

  const refreshSelections = useCallback(async () => {
    if (!supported) return;
    const [blocklistSummary, allowedSummary] = await Promise.all([
      Blocker.getSelectionSummary('blocklist'),
      Blocker.getSelectionSummary('allowed'),
    ]);
    setConfig((prev) => ({ ...prev, blocklistSummary, allowedSummary }));
    if (IS_ANDROID) {
      const [blocked, allowed] = await Promise.all([Blocker.getAndroidBlocklist(), Blocker.getAndroidAllowlist()]);
      setBlockedState(blocked);
      setAllowedState(allowed);
    }
  }, [supported, setConfig]);

  const requestPermission = useCallback(async () => {
    const result = await Blocker.requestAuthorization();
    await refreshPermission();
    return result;
  }, [refreshPermission]);

  // ─── Native shields (always run inside the queue) ──────────────────────────

  /** Folds the native log into the Pomodoro session before a native restart or stop wipes it. */
  const collectTelemetry = useCallback(async () => {
    const s = sessionRef.current;
    if (!nativeRef.current.active || !s) return;
    const log = await Blocker.getSessionTelemetry();
    const events = toEventRecords(log);
    setSession({
      ...s,
      carriedAttempts: s.carriedAttempts + log.attemptsCount,
      carriedUnlocks: (s.carriedUnlocks ?? 0) + log.unlocksUsed,
      carriedEvents: [...(s.carriedEvents ?? []), ...events],
    });
  }, [setSession]);

  const recordQuickBlock = useCallback(async (quick: QuickBlockState, log: SessionBlockingLog) => {
    const now = Date.now();
    const endedAt = Math.min(now, quick.endAt);
    // A little slack so the timer firing a moment early still counts as finished.
    const endedEarly = now < quick.endAt - 30_000;
    const record: BlockingSessionRecord = {
      id: quick.id,
      kind: 'quick',
      level: quick.level,
      startedAt: quick.startedAt,
      endedAt,
      plannedSets: 1,
      completedSets: endedEarly ? 0 : 1,
      focusMinutes: Math.max(0, Math.round((endedAt - quick.startedAt) / 60_000)),
      endedEarly,
      attemptsCount: log.attemptsCount,
      unlocksCount: log.unlocksUsed,
      emergencyUsed: log.emergencyUsed,
      interrupted: log.interrupted,
      events: toEventRecords(log),
    };
    void recordBlockingSession(record);
    setLastSummary(record);
  }, []);

  const scheduleEndNotice = useCallback(async (endAt: number) => {
    await Notifications.cancelScheduledNotificationAsync(END_NOTIFICATION_ID).catch(() => {});
    // Android's foreground service lifts the block on time by itself.
    if (IS_ANDROID) return;
    const seconds = Math.round((endAt - Date.now()) / 1000);
    if (seconds < 5) return;
    // Without the DeviceActivityMonitor extension, shields come off only once Focalyst runs again.
    await Notifications.scheduleNotificationAsync({
      identifier: END_NOTIFICATION_ID,
      content: { title: 'Block finished', body: 'Open Focalyst to unlock your apps.', data: { route: '/(tabs)/focus' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    }).catch(() => {});
  }, []);

  /** Makes the native store match every active source. Restarts only when something changed. */
  const reconcileShields = useCallback(async () => {
    const effective = computeEffective(
      sessionRef.current,
      quickRef.current,
      schedulesRef.current,
      skippedRef.current,
      permissionRef.current,
      Date.now(),
      planRef()
    );
    const current = nativeRef.current;

    if (!effective.active) {
      if (current.active) {
        const quick = lastQuickRef.current;
        if (!sessionRef.current && quick && current.key === quick.id) {
          // A standalone quick block just ended: read its log before stopping wipes it.
          await recordQuickBlock(quick, await Blocker.getSessionTelemetry());
          lastQuickRef.current = null;
        } else {
          await collectTelemetry();
        }
        await Blocker.stopSessionBlocking();
        setLiveAttempts(0);
        setUnlockWindowState(null);
        Notifications.cancelScheduledNotificationAsync(END_NOTIFICATION_ID).catch(() => {});
      }
      if (current.active || current.key) setNative(INACTIVE_NATIVE);
      return;
    }

    const needsRestart =
      !current.active || current.level !== effective.level || Math.abs(current.endAt - effective.endAt) > 60_000;
    if (!needsRestart) {
      if (current.key !== effective.key) setNative({ ...current, key: effective.key });
      return;
    }

    await collectTelemetry();
    const ok = await Blocker.startSessionBlocking({
      sessionId: effective.key ?? `block_${Date.now()}`,
      level: effective.level,
      endTimestamp: effective.endAt,
      unblockOnBreaks: false,
      unlocksLeft:
        effective.level === 'firm'
          ? Math.max(0, FIRM_UNLOCKS_PER_SESSION - (unlockCountsRef.current[effective.key ?? ''] ?? 0))
          : undefined,
    });
    setLiveAttempts(0);
    setUnlockWindowState(null);
    setNative(ok ? { active: true, level: effective.level, endAt: effective.endAt, key: effective.key } : INACTIVE_NATIVE);
    if (!ok) return;
    if (effective.sources.some((s) => s.kind === 'pomodoro')) {
      Notifications.cancelScheduledNotificationAsync(END_NOTIFICATION_ID).catch(() => {});
    } else {
      scheduleEndNotice(effective.endAt);
    }
  }, [collectTelemetry, recordQuickBlock, scheduleEndNotice, setNative]);

  const reconcile = useCallback(() => enqueue(reconcileShields), [enqueue, reconcileShields]);

  const notifyTransition = useCallback((prev: ActiveSession | null, next: ActiveSession | null) => {
    const cfg = configRef.current;
    if (!cfg.notifyLockUnlock || !next) return;
    const from = prev?.phase;
    const to = next.phase;
    if (!prev && to === 'focus_locked') {
      const until = formatClock(next.keepLockedThroughBreaks ? next.plannedEndAt : next.phaseEndsAt);
      sendBlockingUpdate('Focus started', `${lockedCountPhrase(cfg.blocklistSummary)} locked until ${until}.`);
    } else if (to === 'break_open' && from !== 'break_open' && !nativeRef.current.active) {
      // A quick block or schedule may keep apps locked through the break; only announce real openings.
      const mins = next.breakMinutes;
      sendBlockingUpdate('Break time', `Your apps are open for ${mins} ${mins === 1 ? 'minute' : 'minutes'}.`);
    } else if (to === 'focus_locked' && from === 'break_open') {
      sendBlockingUpdate('Back to focus', 'Your apps are locked again.');
    }
  }, []);

  // ─── Pomodoro lifecycle ────────────────────────────────────────────────────

  const syncPomodoro = useCallback(
    (snap: PomodoroSnapshot) => {
      enqueue(async () => {
        await readyRef.current;
        const prev = sessionRef.current;
        const cfg = configRef.current;
        const now = Date.now();

        if (snap.view === 'config') {
          if (prev) {
            await collectTelemetry();
            const done = sessionRef.current ?? prev;
            setSession(null);
            await reconcileShields();
            const events = done.carriedEvents ?? [];
            const record: BlockingSessionRecord = {
              id: done.sessionId,
              kind: 'pomodoro',
              level: done.level,
              startedAt: done.startedAt,
              endedAt: Date.now(),
              plannedSets: done.totalSets,
              completedSets: snap.ended?.completedSets ?? done.currentSet,
              focusMinutes: snap.ended?.focusMinutes ?? 0,
              endedEarly: !(snap.ended?.completedAll ?? false),
              attemptsCount: done.carriedAttempts,
              unlocksCount: done.carriedUnlocks ?? 0,
              emergencyUsed: events.some((e) => e.type === 'emergency'),
              interrupted: done.permissionLost,
              events,
            };
            void recordBlockingSession(record);
            setLastSummary(record);
          }
          return;
        }

        const phaseEndsAt = now + snap.timeLeftSec * 1000;
        const plannedEndAt = computePlannedEnd(snap, now);

        if (!prev) {
          // Only a fresh focus block starts a blocking session.
          if (snap.view !== 'pomodoro' || !snap.running) return;
          if (!cfg.setupCompletedAt || !cfg.enabled) return;
          const permission = supported ? await refreshPermission() : 'denied';
          const withinPlan = planRef().withinLimits;
          const next: ActiveSession = {
            sessionId: `focus_${now}`,
            phase: permission === 'approved' && withinPlan ? 'focus_locked' : 'timer_only',
            level: isProRef.current ? cfg.level : 'gentle',
            // The 15-minute floor is a DeviceActivity limit; Android has no such rule.
            keepLockedThroughBreaks:
              !cfg.unblockOnBreaks || (Platform.OS === 'ios' && snap.focusMin < MIN_UNLOCKABLE_FOCUS_MIN),
            startedAt: now,
            phaseEndsAt,
            plannedEndAt,
            pausedAt: null,
            currentSet: snap.currentSet,
            totalSets: snap.totalSets,
            breakMinutes: snap.breakMin,
            focusMinutes: snap.focusMin,
            carriedAttempts: 0,
            carriedUnlocks: 0,
            carriedEvents: [],
            permissionLost: permission !== 'approved',
            blockedByPlan: permission === 'approved' && !withinPlan,
          };
          setSession(next);
          await reconcileShields();
          notifyTransition(null, next);
          return;
        }

        let phase: ActiveSession['phase'];
        if (prev.phase === 'timer_only') {
          phase = 'timer_only';
        } else if (snap.view === 'break') {
          phase = prev.keepLockedThroughBreaks ? 'break_locked' : 'break_open';
        } else if (!snap.running) {
          phase = prev.level === 'gentle' ? 'paused_open' : 'paused_locked';
        } else if (prev.phase === 'focus_emergency_open' && prev.currentSet === snap.currentSet) {
          phase = 'focus_emergency_open';
        } else {
          phase = 'focus_locked';
        }

        const wasPaused = prev.phase === 'paused_open' || prev.phase === 'paused_locked';
        const isPaused = phase === 'paused_open' || phase === 'paused_locked';
        const next: ActiveSession = {
          ...prev,
          phase,
          phaseEndsAt,
          plannedEndAt,
          currentSet: snap.currentSet,
          totalSets: snap.totalSets,
          breakMinutes: snap.breakMin,
          focusMinutes: snap.focusMin,
          pausedAt: isPaused ? (wasPaused ? prev.pausedAt : now) : null,
        };
        setSession(next);
        await reconcileShields();
        if (prev.phase !== next.phase) notifyTransition(prev, next);
      });
    },
    [collectTelemetry, enqueue, notifyTransition, reconcileShields, refreshPermission, setSession, supported]
  );

  // ─── Effective shield (derived for the UI) ─────────────────────────────────

  const shield = useMemo(
    () =>
      computeEffective(session, quickBlock, schedules, skippedRef.current, permissionStatus, clock, {
        isPro,
        withinLimits: isPro || !exceedsFreeAppLimit(config.blocklistSummary),
      }),
    [session, quickBlock, schedules, permissionStatus, clock, isPro, config.blocklistSummary]
  );
  const overFreeAppLimit = !isPro && exceedsFreeAppLimit(config.blocklistSummary);
  const blockingSessionCount = schedules.length + (quickBlock ? 1 : 0);
  const canAddBlockingSession = isPro || blockingSessionCount < FREE_MAX_SESSIONS;

  // ─── Ratchet ───────────────────────────────────────────────────────────────

  const sessionLevel = session?.level ?? config.level;
  /** The strictest thing currently holding apps locked (or the running Pomodoro). */
  const governingLevel: StrictnessLevel | null =
    session || shield.active ? stricter(session ? sessionLevel : 'gentle', shield.active ? shield.level : 'gentle') : null;
  const canLoosen = governingLevel == null || governingLevel === 'gentle';
  canLoosenRef.current = canLoosen;

  const canChangeLevelTo = useCallback(
    (level: StrictnessLevel) => {
      const s = sessionRef.current;
      if (!s || s.level === 'gentle') return true;
      if (s.level === 'locked') return level === 'locked';
      return levelRank(level) >= levelRank(s.level);
    },
    // Depends on the session so consumers re-render when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]
  );

  /** Re-applies the running Pomodoro after a stricter setting changes mid-session. */
  const restrictRunningSession = useCallback(
    (patch: Partial<ActiveSession>) => {
      enqueue(async () => {
        const prev = sessionRef.current;
        if (!prev) return;
        const updated: ActiveSession = { ...prev, ...patch };
        if (patch.keepLockedThroughBreaks && prev.phase === 'break_open') updated.phase = 'break_locked';
        if (patch.level && patch.level !== 'gentle' && prev.phase === 'paused_open') updated.phase = 'paused_locked';
        setSession(updated);
        await reconcileShields();
      });
    },
    [enqueue, reconcileShields, setSession]
  );

  const setLevel = useCallback(
    (level: StrictnessLevel): Result => {
      if (!isProRef.current && level !== 'gentle') return { ok: false, reason: PRO_LEVEL_MESSAGE, pro: true };
      if (!canChangeLevelTo(level)) return { ok: false, reason: RATCHET_MESSAGE };
      setConfig((prev) => ({ ...prev, level }));
      if (sessionRef.current && sessionRef.current.level !== level) restrictRunningSession({ level });
      return { ok: true };
    },
    [canChangeLevelTo, restrictRunningSession, setConfig]
  );

  const setUnblockOnBreaks = useCallback(
    (value: boolean): Result => {
      const s = sessionRef.current;
      if (value && s && s.level !== 'gentle') return { ok: false, reason: RATCHET_MESSAGE };
      setConfig((prev) => ({ ...prev, unblockOnBreaks: value }));
      if (s && !value && !s.keepLockedThroughBreaks) restrictRunningSession({ keepLockedThroughBreaks: true });
      return { ok: true };
    },
    [restrictRunningSession, setConfig]
  );

  const setNotifyLockUnlock = useCallback(
    (value: boolean) => setConfig((prev) => ({ ...prev, notifyLockUnlock: value })),
    [setConfig]
  );

  const setEnabled = useCallback(
    (enabled: boolean): Result => {
      setConfig((prev) => ({ ...prev, enabled }));
      const s = sessionRef.current;
      if (!enabled && s && s.phase !== 'timer_only') {
        if (s.level !== 'gentle') {
          showSnackbar('Blocking stays on until this session ends');
          return { ok: true };
        }
        // Gentle may switch off mid-session: Pomodoro blocking ends now, the timer keeps going.
        enqueue(async () => {
          const prev = sessionRef.current;
          if (!prev) return;
          setSession({ ...prev, phase: 'timer_only', permissionLost: false });
          await reconcileShields();
        });
      }
      return { ok: true };
    },
    [enqueue, reconcileShields, setConfig, setSession, showSnackbar]
  );

  const turnOff = useCallback(() => setEnabled(false), [setEnabled]);

  const pickApps = useCallback(
    async (mode: PickerMode): Promise<Result> => {
      // Apple's picker returns the whole new selection, so "add only" can't be enforced: lock it.
      if (!canLoosen) return { ok: false, reason: RATCHET_MESSAGE };
      const summary = await Blocker.openAppPicker(mode);
      setConfig((prev) => ({ ...prev, [mode === 'allowed' ? 'allowedSummary' : 'blocklistSummary']: summary }));
      // Running shields pick up the new selection on their next apply.
      if (nativeRef.current.active) {
        enqueue(async () => {
          setNative({ ...nativeRef.current, endAt: 0 });
          await reconcileShields();
        });
      }
      return { ok: true };
    },
    [canLoosen, enqueue, reconcileShields, setConfig, setNative]
  );

  // ─── Android app lists ─────────────────────────────────────────────────────

  const loadInstalledApps = useCallback(async () => {
    if (!IS_ANDROID || !supported) return;
    setInstalledApps(await Blocker.getInstalledAppsWithUsage());
  }, [supported]);

  const appsByPackage = useMemo(
    () => new Map((installedApps?.allApps ?? []).map((app) => [app.packageName, app])),
    [installedApps]
  );
  const appInfo = useCallback((packageName: string) => appsByPackage.get(packageName), [appsByPackage]);

  const setBlockedPackages = useCallback(
    async (packageNames: string[]): Promise<Result> => {
      const next = [...new Set(packageNames)];
      // Android can add during a strict block; it just can't take apps off the list.
      if (!canLoosenRef.current && blockedPackages.some((p) => !next.includes(p))) {
        return { ok: false, reason: RATCHET_MESSAGE };
      }
      if (!isProRef.current && next.length > FREE_MAX_APPS) {
        return { ok: false, reason: `Free plan blocks up to ${FREE_MAX_APPS} apps.`, pro: true };
      }
      const summary = await Blocker.setAndroidBlocklist(next);
      setBlockedState(next);
      setConfig((prev) => ({ ...prev, blocklistSummary: summary }));
      return { ok: true };
    },
    [blockedPackages, setConfig]
  );

  const setAllowedPackages = useCallback(
    async (packageNames: string[]): Promise<Result> => {
      const next = [...new Set(packageNames)];
      if (!canLoosenRef.current && next.some((p) => !allowedPackages.includes(p))) {
        return { ok: false, reason: RATCHET_MESSAGE };
      }
      const summary = await Blocker.setAndroidAllowlist(next);
      setAllowedState(next);
      setConfig((prev) => ({ ...prev, allowedSummary: summary }));
      return { ok: true };
    },
    [allowedPackages, setConfig]
  );

  const unlockTarget = useMemo<UnlockTarget | null>(() => {
    if (!unlockTargetRaw) return null;
    const app = unlockTargetRaw.packageName ? appsByPackage.get(unlockTargetRaw.packageName) : undefined;
    return {
      packageName: unlockTargetRaw.packageName,
      appName: app?.appName ?? unlockTargetRaw.label,
      iconUri: app?.iconUri ?? null,
    };
  }, [appsByPackage, unlockTargetRaw]);
  const unlockTargetRef = useRef(unlockTarget);
  unlockTargetRef.current = unlockTarget;

  // ─── Setup ─────────────────────────────────────────────────────────────────

  const beginSetup = useCallback(() => {
    const cfg = configRef.current;
    setDraft({
      level: isProRef.current ? cfg.level : 'gentle',
      unblockOnBreaks: cfg.unblockOnBreaks,
      notifyLockUnlock: cfg.notifyLockUnlock,
    });
  }, []);

  const updateDraft = useCallback((patch: Partial<SetupDraft>) => setDraft((prev) => ({ ...prev, ...patch })), []);

  const finishSetup = useCallback(() => {
    const level = isProRef.current ? draft.level : 'gentle';
    setConfig((prev) => ({ ...prev, ...draft, level, enabled: true, setupCompletedAt: Date.now() }));
  }, [draft, setConfig]);

  // ─── Quick block ───────────────────────────────────────────────────────────

  const startQuickBlock = useCallback(
    async (minutes: number, requested: StrictnessLevel): Promise<QuickBlockResult> => {
      return enqueue(async () => {
        const pro = isProRef.current;
        const prev = quickRef.current;
        if (!pro && !prev && schedulesRef.current.length + 1 > FREE_MAX_SESSIONS) return 'limit';
        if (!planRef().withinLimits) return 'limit';
        if ((await refreshPermission()) !== 'approved') return 'permission';
        const level = pro ? requested : 'gentle';
        const now = Date.now();
        // A second quick block merges into the first: stricter level, later end.
        const endAt = Math.max(now + minutes * 60_000, prev?.endAt ?? 0);
        setQuick({
          id: prev?.id ?? `quick_${now}`,
          startedAt: prev?.startedAt ?? now,
          endAt,
          level: prev ? stricter(prev.level, level) : level,
        });
        await reconcileShields();
        return nativeRef.current.active ? 'ok' : 'failed';
      });
    },
    [enqueue, reconcileShields, refreshPermission, setQuick]
  );

  const stopQuickBlock = useCallback(async () => {
    await enqueue(async () => {
      // Locked quick blocks run to their end time; only emergency unlock ends them early.
      if (quickRef.current?.level === 'locked' && isProRef.current) return;
      setQuick(null);
      await reconcileShields();
    });
  }, [enqueue, reconcileShields, setQuick]);

  // ─── Schedules ─────────────────────────────────────────────────────────────

  /** Mirrors a schedule into DeviceActivity so it runs while Focalyst is closed. */
  const syncNativeSchedule = useCallback((s: Schedule) => {
    const allowed = isProRef.current || !exceedsFreeAppLimit(configRef.current.blocklistSummary);
    if (!s.enabled || !allowed || isExpiredOneOff(s)) {
      Blocker.cancelRecurringBlock(s.id);
      return;
    }
    const days = s.onceDate ? [] : s.days.map((on, i) => (on ? mondayIndexToWeekday(i) : 0)).filter(Boolean);
    Blocker.scheduleRecurringBlock(
      s.id,
      Math.floor(s.startMin / 60),
      s.startMin % 60,
      Math.floor(s.endMin / 60),
      s.endMin % 60,
      days,
      isProRef.current ? s.level : 'gentle'
    );
  }, []);

  const syncAllNativeSchedules = useCallback(() => {
    schedulesRef.current.forEach(syncNativeSchedule);
  }, [syncNativeSchedule]);

  const runningScheduleIds = useCallback(
    () =>
      new Set(
        computeEffective(null, null, schedulesRef.current, skippedRef.current, 'approved', Date.now(), {
          isPro: true,
          withinLimits: true,
        }).sources.map((s) => s.key.split(':')[0])
      ),
    []
  );

  const isScheduleRunning = useCallback((id: string) => runningScheduleIds().has(id), [runningScheduleIds]);

  const saveSchedule = useCallback(
    (schedule: Schedule): Result => {
      const existing = schedulesRef.current.find((s) => s.id === schedule.id);
      if (!existing && !isProRef.current && schedulesRef.current.length + (quickRef.current ? 1 : 0) >= FREE_MAX_SESSIONS) {
        return { ok: false, reason: FREE_SESSION_MESSAGE, pro: true };
      }
      if (!isProRef.current && schedule.level !== 'gentle') {
        return { ok: false, reason: PRO_LEVEL_MESSAGE, pro: true };
      }
      // A running non-Gentle schedule can't be loosened until its window ends.
      if (existing && isScheduleRunning(existing.id) && existing.level !== 'gentle') {
        const loosened =
          !schedule.enabled ||
          levelRank(schedule.level) < levelRank(existing.level) ||
          schedule.startMin !== existing.startMin ||
          schedule.endMin !== existing.endMin ||
          schedule.days.some((d, i) => d !== existing.days[i]);
        if (loosened) return { ok: false, reason: 'This schedule is running. Change it after it ends.' };
      }
      const next = existing
        ? schedulesRef.current.map((s) => (s.id === schedule.id ? schedule : s))
        : [...schedulesRef.current, schedule];
      setSchedules(next);
      syncNativeSchedule(schedule);
      reconcile();
      return { ok: true };
    },
    [isScheduleRunning, reconcile, setSchedules, syncNativeSchedule]
  );

  const deleteSchedule = useCallback(
    (id: string): Result => {
      const existing = schedulesRef.current.find((s) => s.id === id);
      if (existing && isScheduleRunning(id) && existing.level !== 'gentle') {
        return { ok: false, reason: 'This schedule is running. Delete it after it ends.' };
      }
      setSchedules(schedulesRef.current.filter((s) => s.id !== id));
      Blocker.cancelRecurringBlock(id);
      reconcile();
      return { ok: true };
    },
    [isScheduleRunning, reconcile, setSchedules]
  );

  // ─── Unlocks ───────────────────────────────────────────────────────────────

  const unlocksLeft =
    !shield.active || shield.level === 'locked'
      ? 0
      : shield.level === 'gentle'
        ? Infinity
        : Math.max(0, FIRM_UNLOCKS_PER_SESSION - (unlockCounts[shield.key ?? ''] ?? 0));

  const grantUnlock = useCallback(
    async (minutes: number, reason: 'study' | 'reply' | 'bored' | 'other'): Promise<Result> => {
      return enqueue(async () => {
        const n = nativeRef.current;
        if (!n.active) return { ok: false, reason: 'Nothing is locked right now.' };
        if (n.level === 'locked') return { ok: false, reason: 'Locked mode has no unlocks.' };
        if (!isProRef.current && minutes > FREE_MAX_UNLOCK_MINUTES) {
          return { ok: false, reason: 'Unlocks longer than 5 minutes need Focalyst Pro.', pro: true };
        }
        const used = unlockCountsRef.current[n.key ?? ''] ?? 0;
        if (n.level === 'firm' && used >= FIRM_UNLOCKS_PER_SESSION) {
          return { ok: false, reason: "You've used both unlocks." };
        }
        const ok = await Blocker.grantTemporaryUnlock(minutes, reason);
        if (!ok) return { ok: false, reason: "Couldn't unlock right now." };
        if (n.key) bumpUnlockCount(n.key);
        setUnlockWindowState({
          endsAt: Math.min(Date.now() + minutes * 60_000, n.endAt),
          minutes,
          // Android opens just the shielded app (and launches it); iOS opens every locked app.
          appName: IS_ANDROID ? (unlockTargetRef.current?.appName ?? null) : null,
        });
        return { ok: true };
      });
    },
    [bumpUnlockCount, enqueue]
  );

  const lockNow = useCallback(async () => {
    await enqueue(async () => {
      await Blocker.lockTemporaryUnlockNow();
      setUnlockWindowState(null);
    });
  }, [enqueue]);

  const canUseEmergencyToday = useCallback(() => Blocker.canUseEmergencyUnlockToday(), []);

  const emergencyUnlock = useCallback(async (): Promise<Result> => {
    return enqueue(async () => {
      if (!nativeRef.current.active) return { ok: false, reason: 'Nothing is locked right now.' };
      await collectTelemetry();
      const ok = await Blocker.triggerEmergencyUnlock();
      if (!ok) return { ok: false, reason: 'No emergency unlocks left today.' };
      const quick = quickRef.current;
      if (!sessionRef.current && quick) {
        await recordQuickBlock(quick, await Blocker.getSessionTelemetry());
        lastQuickRef.current = null;
      }
      setNative(INACTIVE_NATIVE);
      setUnlockWindowState(null);
      // Every source stands down until its current block ends.
      const s = sessionRef.current;
      if (s && isShieldedPhase(s.phase)) {
        setSession({ ...s, phase: s.phase === 'break_locked' ? 'break_open' : 'focus_emergency_open', pausedAt: null });
      }
      setQuick(null);
      skippedRef.current = [
        ...skippedRef.current,
        ...activeOccurrences(schedulesRef.current).map((o) => o.occurrenceId),
      ];
      saveRuntime();
      await reconcileShields();
      return { ok: true };
    });
  }, [collectTelemetry, enqueue, reconcileShields, recordQuickBlock, saveRuntime, setNative, setQuick, setSession]);

  // ─── Shield → app handoff ──────────────────────────────────────────────────

  const lastUnlockOpenRef = useRef(0);
  const unlockScreenOpenRef = useRef(false);
  const openUnlockFlow = useCallback(() => {
    // The notification tap, the deep link and the foreground check can all fire for one shield tap.
    if (Date.now() - lastUnlockOpenRef.current < 3000) return;
    lastUnlockOpenRef.current = Date.now();
    setTimeout(() => {
      if (!unlockScreenOpenRef.current) router.push('/blocking/unlock');
    }, UNLOCK_PUSH_DELAY_MS);
  }, []);

  const setUnlockScreenOpen = useCallback((open: boolean, packageName?: string | null) => {
    unlockScreenOpenRef.current = open;
    if (!open) {
      setUnlockTargetRaw(null);
      return;
    }
    lastUnlockOpenRef.current = Date.now();
    // focalyst://blocking/unlock?app=<pkg> from the Android shield.
    if (packageName) {
      setUnlockTargetRaw((prev) =>
        prev?.packageName === packageName ? prev : { packageName, label: null }
      );
    }
  }, []);

  /** The user tapped the shield's secondary button and came straight back to the app. */
  const checkPendingUnlock = useCallback(async () => {
    const request = await Blocker.getPendingUnlockRequest();
    if (!request) return;
    await Blocker.clearPendingUnlockRequest();
    if (Date.now() - request.timestamp > PENDING_UNLOCK_MAX_AGE_MS) return;
    setUnlockTargetRaw({ packageName: request.appId ?? null, label: request.appLabel ?? request.appName ?? null });
    openUnlockFlow();
  }, [openUnlockFlow]);

  // ─── Hydration & lifecycle ─────────────────────────────────────────────────

  useEffect(() => {
    readyRef.current = (async () => {
      try {
        const [rawConfig, rawSession, rawQuick, rawSchedules, rawRuntime, legacyQuick] = await Promise.all([
          AsyncStorage.getItem(CONFIG_KEY),
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(QUICK_KEY),
          AsyncStorage.getItem(SCHEDULES_KEY),
          AsyncStorage.getItem(RUNTIME_KEY),
          AsyncStorage.getItem(LEGACY_QUICK_KEY),
        ]);
        const now = Date.now();
        if (rawConfig) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(rawConfig) });
        if (rawSession) {
          const s: ActiveSession = JSON.parse(rawSession);
          // Never keep a session alive past its planned end.
          setSession(s.plannedEndAt > now ? s : null);
        }
        if (rawQuick) {
          const q: QuickBlockState = JSON.parse(rawQuick);
          setQuick(q.endAt > now ? q : null);
          // Ended while Focalyst was closed: the next reconcile still writes its summary.
          lastQuickRef.current = q;
        }
        if (legacyQuick) {
          // Earlier builds used a separate native store for quick blocks; move it onto the shared one.
          const q = JSON.parse(legacyQuick) as { endAt: number; level: StrictnessLevel };
          await Blocker.stopQuickBlock();
          if (q.endAt > now && !quickRef.current) setQuick({ id: `quick_${now}`, startedAt: now, endAt: q.endAt, level: q.level });
          AsyncStorage.removeItem(LEGACY_QUICK_KEY).catch(() => {});
        }
        if (rawSchedules) setSchedules(JSON.parse(rawSchedules));
        if (rawRuntime) {
          const rt = JSON.parse(rawRuntime) as { native: NativeState; unlockCounts: Record<string, number>; skipped: string[] };
          nativeRef.current = rt.native ?? INACTIVE_NATIVE;
          setNativeState(nativeRef.current);
          unlockCountsRef.current = rt.unlockCounts ?? {};
          setUnlockCounts(unlockCountsRef.current);
          // Skips only matter for runs that could still be active (at most a day old).
          skippedRef.current = (rt.skipped ?? []).slice(-50);
        }
      } catch (e) {
        if (__DEV__) console.warn('[blocking] hydrate failed', e);
      }
      await refreshPermission();
      await refreshSelections();
      setReady(true);
    })();
    readyRef.current.then(() => {
      reconcile();
      syncAllNativeSchedules();
      // Icons and names for strips, chips and unlock copy (rendered PNGs are cached on disk).
      loadInstalledApps();
    });
  }, [
    syncAllNativeSchedules,
    reconcile,
    refreshPermission,
    refreshSelections,
    loadInstalledApps,
    setConfig,
    setQuick,
    setSchedules,
    setSession,
  ]);

  // Re-check permission (and selections) whenever the app comes back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setClock(Date.now());
      refreshSelections();
      checkPendingUnlock();
      if (nativeRef.current.active) {
        Blocker.getSessionTelemetry().then((log) => setLiveAttempts(log.attemptsCount));
      }
      refreshPermission().then((status) => {
        const s = sessionRef.current;
        if (status !== 'approved' && s && s.phase !== 'timer_only') {
          // Permission revoked mid-session: blocking stops, the timer continues.
          setSession({ ...s, phase: 'timer_only', permissionLost: true });
        }
        reconcile();
      });
    });
    return () => sub.remove();
  }, [checkPendingUnlock, reconcile, refreshPermission, refreshSelections, setSession]);

  // Tapping the shield's "Unblock in Focalyst" notification opens the unlock flow.
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const { identifier, content } = response.notification.request;
      const data = (content.data ?? {}) as { url?: string };
      if (identifier === SHIELD_NOTIFICATION_ID || data.url === UNLOCK_URL) {
        Blocker.clearPendingUnlockRequest();
        openUnlockFlow();
      }
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [openUnlockFlow]);

  // Sessions that finished offline (or before the tables existed) go up once the app is back.
  useEffect(() => {
    if (!ready) return;
    flushPendingBlockingSessions();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushPendingBlockingSessions();
    });
    return () => sub.remove();
  }, [ready]);

  // Rules and Android package lists mirror to blocking_settings, debounced, once set up.
  useEffect(() => {
    if (!ready || !config.setupCompletedAt) return;
    const id = setTimeout(
      () =>
        syncBlockingSettings({
          level: config.level,
          unblockOnBreaks: config.unblockOnBreaks,
          notifyLockUnlock: config.notifyLockUnlock,
          androidBlocklist: blockedPackages,
          androidAllowlist: allowedPackages,
        }),
      1500
    );
    return () => clearTimeout(id);
  }, [
    ready,
    config.setupCompletedAt,
    config.level,
    config.unblockOnBreaks,
    config.notifyLockUnlock,
    blockedPackages,
    allowedPackages,
  ]);

  // Plan changes (upgrade, expiry) re-evaluate shields and the native schedules.
  useEffect(() => {
    if (!ready) return;
    reconcile();
    syncAllNativeSchedules();
  }, [isPro, overFreeAppLimit, ready, reconcile, syncAllNativeSchedules]);

  // Schedule windows and quick-block ends are checked every 30 s while the app is open.
  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      setClock(Date.now());
      const q = quickRef.current;
      if (q && q.endAt <= Date.now()) setQuick(null);
      const expired = schedulesRef.current.filter((s) => isExpiredOneOff(s));
      if (expired.length) {
        expired.forEach((s) => Blocker.cancelRecurringBlock(s.id));
        setSchedules(schedulesRef.current.filter((s) => !isExpiredOneOff(s)));
      }
      reconcile();
    }, 30_000);
    return () => clearInterval(id);
  }, [reconcile, setQuick, setSchedules]);

  // Quick blocks end on time while the app is in front.
  useEffect(() => {
    if (!quickBlock) return;
    const id = setTimeout(() => {
      setQuick(null);
      setClock(Date.now());
      reconcile();
    }, Math.max(0, quickBlock.endAt - Date.now()) + 500);
    return () => clearTimeout(id);
  }, [quickBlock, reconcile, setQuick]);

  // Unlock windows close on time; native re-locks on its own when the app is in front.
  useEffect(() => {
    if (!unlockWindow) return;
    const id = setTimeout(() => {
      Blocker.lockTemporaryUnlockNow().finally(() => setUnlockWindowState(null));
    }, Math.max(0, unlockWindow.endsAt - Date.now()));
    return () => clearTimeout(id);
  }, [unlockWindow]);

  // Live attempt count while shields are up.
  useEffect(() => {
    if (!native.active) return;
    let alive = true;
    const poll = () =>
      Blocker.getSessionTelemetry().then((log) => {
        if (alive) setLiveAttempts(log.attemptsCount);
      });
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [native.active, native.endAt]);

  const value = useMemo<BlockingContextValue>(
    () => ({
      ready,
      supported,
      config,
      permissionStatus,
      session,
      phase: session?.phase ?? 'idle',
      attempts: (session?.carriedAttempts ?? 0) + (native.active ? liveAttempts : 0),
      quickBlock,
      schedules,
      shield,
      unlockWindow,
      unlocksLeft,
      draft,
      isPro,
      overFreeAppLimit,
      canAddBlockingSession,
      refreshPermission,
      requestPermission,
      refreshSelections,
      pickApps,
      installedApps,
      loadInstalledApps,
      appInfo,
      blockedPackages,
      allowedPackages,
      setBlockedPackages,
      setAllowedPackages,
      unlockTarget,
      setUnlockScreenOpen,
      beginSetup,
      updateDraft,
      finishSetup,
      setEnabled,
      setLevel,
      setUnblockOnBreaks,
      setNotifyLockUnlock,
      turnOff,
      canChangeLevelTo,
      canEditBlocklist: canLoosen,
      canEditAllowed: canLoosen,
      canLoosen,
      syncPomodoro,
      startQuickBlock,
      stopQuickBlock,
      grantUnlock,
      lockNow,
      canUseEmergencyToday,
      emergencyUnlock,
      saveSchedule,
      deleteSchedule,
      isScheduleRunning,
      showSnackbar,
      lastSummary,
      dismissSummary: () => setLastSummary(null),
    }),
    [
      ready, supported, config, permissionStatus, session, native.active, liveAttempts, quickBlock, schedules,
      shield, unlockWindow, unlocksLeft, draft, isPro, overFreeAppLimit, canAddBlockingSession, refreshPermission, requestPermission, refreshSelections, pickApps,
      installedApps, loadInstalledApps, appInfo, blockedPackages, allowedPackages, setBlockedPackages,
      setAllowedPackages, unlockTarget, setUnlockScreenOpen,
      beginSetup, updateDraft, finishSetup, setEnabled, setLevel, setUnblockOnBreaks, setNotifyLockUnlock, turnOff,
      canChangeLevelTo, canLoosen, syncPomodoro, startQuickBlock, stopQuickBlock, grantUnlock, lockNow,
      canUseEmergencyToday, emergencyUnlock, saveSchedule, deleteSchedule, isScheduleRunning, showSnackbar,
      lastSummary,
    ]
  );

  return (
    <BlockingContext.Provider value={value}>
      {children}
      <Snackbar key={snack?.id} message={snack?.message ?? null} onHide={() => setSnack(null)} />
    </BlockingContext.Provider>
  );
}
