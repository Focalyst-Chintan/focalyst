import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = '@focalyst_cache_';
const QUEUE_STORAGE_KEY = '@focalyst_offline_queue_v1';
const REMOTE_STATUS_CACHE_KEY = '@focalyst_remote_status_v1';

export const CHECK_INTERVAL_SEC = 30;
// While failures are adding up but no warning is shown yet, check sooner.
const SUSPECT_INTERVAL_SEC = 15;
const CHECK_TIMEOUT_MS = 10000;
// The server warning needs this many network/5xx failures in a row, spread over at least
// MIN_FAILURE_WINDOW_MS, while the device is online. One slow or failed request is not an outage.
const FAILURES_BEFORE_WARNING = 3;
const MIN_FAILURE_WINDOW_MS = 30000;

export interface RemoteOutageConfig {
  forceOutageBanner: boolean;
  title: string;
  shortBannerText: string;
  explainer: string;
  eta: string;
}

export interface QueuedMutation {
  id: string;
  table: string;
  action: 'insert' | 'upsert' | 'update' | 'delete';
  payload: any;
  matchColumn?: string;
  matchValue?: any;
  createdAt: string;
}

export interface OutageState {
  isOutage: boolean;
  isOffline: boolean;
  secondsUntilNextCheck: number;
  isCheckingNow: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  remoteConfig: RemoteOutageConfig;
}

const DEFAULT_REMOTE_CONFIG: RemoteOutageConfig = {
  forceOutageBanner: false,
  title: 'Sync is paused',
  shortBannerText: "Can't reach Focalyst right now",
  explainer:
    "We can't reach Focalyst's servers right now. You can keep using the app; anything you add is saved on this iPhone and will sync automatically when the connection is back.",
  eta: 'Checking connection automatically every 30 seconds',
};

type Listener = (state: OutageState) => void;
const listeners = new Set<Listener>();

let currentState: OutageState = {
  isOutage: false,
  isOffline: false,
  secondsUntilNextCheck: CHECK_INTERVAL_SEC,
  isCheckingNow: false,
  pendingSyncCount: 0,
  lastSyncedAt: null,
  remoteConfig: DEFAULT_REMOTE_CONFIG,
};

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let supabaseClientRef: any = null;
let appStateSubscription: any = null;
let netInfoUnsubscribe: (() => void) | null = null;
let consecutiveFailures = 0;
let firstFailureAt: number | null = null;

type CheckError = { status?: number; code?: string; message?: string; name?: string } | null | undefined;

function errorText(error: CheckError): string {
  return `${error?.name ?? ''} ${error?.message ?? ''}`;
}

// Expired or invalid sessions are not outages: refresh quietly and retry once.
function isAuthError(error: CheckError): boolean {
  if (!error) return false;
  if (error.status === 401 || error.code === 'PGRST301' || error.code === 'PGRST303') return true;
  return /jwt|refresh token|not authenticated|invalid claim/i.test(error.message ?? '');
}

// Only these count towards the server warning: no response at all, a timeout, or a 5xx.
// 4xx answers (RLS, validation, conflicts) mean the server is up.
function isNetworkOrServerError(error: CheckError): boolean {
  if (!error) return false;
  if (typeof error.status === 'number' && error.status >= 500) return true;
  if (typeof error.status === 'number' && error.status >= 400) return false;
  return /network|fetch|timeout|timed out|abort|SUPABASE_TIMEOUT/i.test(errorText(error));
}

function logCheckFailure(source: string, error: CheckError) {
  if (!__DEV__) return;
  // Postgres messages can quote row values, so only network-level messages are logged in full.
  console.warn('[sync-check] failed', {
    source,
    status: error?.status ?? null,
    code: error?.code ?? null,
    message: error?.code ? undefined : String(error?.message ?? error?.name ?? '').slice(0, 120),
    countsAsOutage: isNetworkOrServerError(error),
  });
}

async function refreshSessionQuietly() {
  try {
    await supabaseClientRef?.auth?.refreshSession();
  } catch {}
}

function recordSupabaseFailure(source: string, error: CheckError) {
  logCheckFailure(source, error);
  if (currentState.isOffline || !isNetworkOrServerError(error)) return;

  const now = Date.now();
  consecutiveFailures += 1;
  if (firstFailureAt === null) firstFailureAt = now;

  if (
    !currentState.isOutage &&
    consecutiveFailures >= FAILURES_BEFORE_WARNING &&
    now - firstFailureAt >= MIN_FAILURE_WINDOW_MS
  ) {
    currentState.isOutage = true;
    currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
    void fetchExternalOutageMessage();
    notifyListeners();
  }
}

function recordSupabaseSuccess() {
  consecutiveFailures = 0;
  firstFailureAt = null;
  if (currentState.isOutage && !currentState.remoteConfig.forceOutageBanner) {
    currentState.isOutage = false;
    notifyListeners();
  }
}

function notifyListeners() {
  const snapshot = { ...currentState };
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribeOutageState(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function getOutageState(): OutageState {
  return { ...currentState };
}

export async function initOutageResilience(supabaseClient: any) {
  supabaseClientRef = supabaseClient;

  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkBackendHealthAndSync();
      }
    });
  }

  if (!netInfoUnsubscribe) {
    netInfoUnsubscribe = NetInfo.addEventListener((netState) => {
      // isInternetReachable is null until known; only a definite false means offline.
      const offline = netState.isConnected === false || netState.isInternetReachable === false;
      if (offline === currentState.isOffline) return;
      currentState.isOffline = offline;
      // Failures while offline say nothing about the servers.
      consecutiveFailures = 0;
      firstFailureAt = null;
      notifyListeners();
      if (!offline) void checkBackendHealthAndSync();
    });
  }

  try {
    const [queueRaw, cachedStatusRaw] = await Promise.all([
      AsyncStorage.getItem(QUEUE_STORAGE_KEY),
      AsyncStorage.getItem(REMOTE_STATUS_CACHE_KEY),
    ]);

    const queue: QueuedMutation[] = queueRaw ? JSON.parse(queueRaw) : [];
    if (cachedStatusRaw) {
      currentState.remoteConfig = {
        ...DEFAULT_REMOTE_CONFIG,
        ...JSON.parse(cachedStatusRaw),
      };
    }

    currentState.pendingSyncCount = queue.length;
    notifyListeners();
  } catch {}

  await fetchExternalOutageMessage();
  startCountdownLoop();
}

function startCountdownLoop() {
  if (countdownTimer) clearInterval(countdownTimer);

  countdownTimer = setInterval(() => {
    if (!currentState.isOutage && currentState.pendingSyncCount === 0 && consecutiveFailures === 0) {
      currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
      return;
    }

    if (currentState.isCheckingNow) return;

    if (currentState.secondsUntilNextCheck <= 1) {
      currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
      notifyListeners();
      void checkBackendHealthAndSync();
    } else {
      currentState.secondsUntilNextCheck -= 1;
      notifyListeners();
    }
  }, 1000);
}

/**
 * Fetches the remote status JSON stored on GitHub Gist (completely separate from Supabase)
 * Queries the GitHub REST API directly to bypass the 20-second Raw CDN cache delay,
 * falling back to the raw URL if needed.
 */
export async function fetchExternalOutageMessage(): Promise<void> {
  const gistUrl = process.env.EXPO_PUBLIC_STATUS_GIST_URL;
  if (!gistUrl || !gistUrl.startsWith('https://')) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let json: any = null;

    // 1. Extract Gist ID to query GitHub REST API directly (0-second cache delay)
    const gistIdMatch = gistUrl.match(/gist\.githubusercontent\.com\/[^/]+\/([a-f0-9]+)/i);
    if (gistIdMatch?.[1]) {
      const apiRes = await fetch(`https://api.github.com/gists/${gistIdMatch[1]}?t=${Date.now()}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          'Cache-Control': 'no-cache',
        },
      });
      if (apiRes.ok) {
        const gistData = await apiRes.json();
        const fileObj: any =
          gistData?.files?.['focalyst-status.json'] ||
          Object.values(gistData?.files || {})[0];
        if (fileObj?.content) {
          json = JSON.parse(fileObj.content);
        }
      }
    }

    // 2. Fallback to direct Raw URL if non-Gist or rate-limited
    if (!json) {
      const separator = gistUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${gistUrl}${separator}t=${Date.now()}`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (res.ok) {
        json = await res.json();
      }
    }

    clearTimeout(timeout);

    if (json && typeof json === 'object') {
      const wasForced = currentState.remoteConfig.forceOutageBanner;
      const merged: RemoteOutageConfig = {
        forceOutageBanner: Boolean(json.forceOutageBanner),
        title: typeof json.title === 'string' && json.title ? json.title : DEFAULT_REMOTE_CONFIG.title,
        shortBannerText:
          typeof json.shortBannerText === 'string' && json.shortBannerText
            ? json.shortBannerText
            : DEFAULT_REMOTE_CONFIG.shortBannerText,
        explainer:
          typeof json.explainer === 'string' && json.explainer
            ? json.explainer
            : DEFAULT_REMOTE_CONFIG.explainer,
        eta: typeof json.eta === 'string' && json.eta ? json.eta : DEFAULT_REMOTE_CONFIG.eta,
      };
      currentState.remoteConfig = merged;

      if (merged.forceOutageBanner) {
        currentState.isOutage = true;
      } else if (wasForced && !merged.forceOutageBanner) {
        // Immediately clear forced outage state when remote JSON switches from true -> false
        currentState.isOutage = false;
      }

      await AsyncStorage.setItem(REMOTE_STATUS_CACHE_KEY, JSON.stringify(merged));
      notifyListeners();
    }
  } catch {
    // Keep last cached or default remote status message
  }
}

function pingWithTimeout(): Promise<{ error: CheckError }> {
  const pingPromise = supabaseClientRef.rpc('ping_health');
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase health ping timeout')), CHECK_TIMEOUT_MS)
  );
  return Promise.race([pingPromise, timeoutPromise]) as Promise<{ error: CheckError }>;
}

export async function checkBackendHealthAndSync(): Promise<boolean> {
  currentState.isCheckingNow = true;
  notifyListeners();

  await fetchExternalOutageMessage();

  if (!supabaseClientRef || currentState.isOffline) {
    currentState.isCheckingNow = false;
    notifyListeners();
    return false;
  }

  try {
    let { error } = await pingWithTimeout();
    if (error && isAuthError(error)) {
      await refreshSessionQuietly();
      ({ error } = await pingWithTimeout());
    }

    if (error && isNetworkOrServerError(error)) {
      throw error;
    }
    if (error) {
      // The server answered (for example a 4xx), so it is reachable.
      logCheckFailure('ping_health', error);
    }

    await flushOfflineMutationQueue();

    recordSupabaseSuccess();
    currentState.isOutage = Boolean(currentState.remoteConfig.forceOutageBanner);
    currentState.isCheckingNow = false;
    currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
    currentState.lastSyncedAt = new Date().toISOString();
    notifyListeners();
    return true;
  } catch (error: any) {
    recordSupabaseFailure('ping_health', error);
    currentState.isCheckingNow = false;
    currentState.secondsUntilNextCheck = currentState.isOutage ? CHECK_INTERVAL_SEC : SUSPECT_INTERVAL_SEC;
    notifyListeners();
    return false;
  }
}

/**
 * Prevents blank screens: fetches from Supabase with a 6s timeout, saves snapshot locally,
 * and returns cached data immediately if Supabase is unreachable.
 */
export async function fetchWithOfflineCache<T>(
  cacheKey: string,
  fetcher: () => Promise<{ data: T | null; error: any }>,
  fallbackValue: T
): Promise<T> {
  const storageKey = `${CACHE_PREFIX}${cacheKey}`;

  try {
    const fetchWithTimeout = () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), CHECK_TIMEOUT_MS)
      );
      return Promise.race([fetcher(), timeoutPromise]);
    };
    let { data, error } = await fetchWithTimeout();
    if (error && isAuthError(error)) {
      await refreshSessionQuietly();
      ({ data, error } = await fetchWithTimeout());
    }

    if (error) throw error;

    if (data !== null && data !== undefined) {
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      if (currentState.isOutage && !currentState.remoteConfig.forceOutageBanner) {
        void checkBackendHealthAndSync();
      }
      return data;
    }
  } catch (error: any) {
    recordSupabaseFailure(`read:${cacheKey}`, error);
  }

  try {
    const cachedRaw = await AsyncStorage.getItem(storageKey);
    if (cachedRaw) return JSON.parse(cachedRaw) as T;
  } catch {}

  return fallbackValue;
}

/**
 * Queues writes locally when Supabase is down so user logs are never lost and sync automatically.
 */
export async function mutateWithOfflineQueue(
  mutation: Omit<QueuedMutation, 'id' | 'createdAt'>,
  optimisticCacheKey?: string,
  optimisticUpdater?: (currentCached: any) => any
): Promise<{ queuedOffline: boolean }> {
  if (optimisticCacheKey && optimisticUpdater) {
    try {
      const storageKey = `${CACHE_PREFIX}${optimisticCacheKey}`;
      const existingRaw = await AsyncStorage.getItem(storageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = optimisticUpdater(existing);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  }

  if (!currentState.isOutage && supabaseClientRef) {
    try {
      await executeSingleMutation(mutation);
      recordSupabaseSuccess();
      return { queuedOffline: false };
    } catch (error: any) {
      let lastError = error;
      if (isAuthError(error)) {
        await refreshSessionQuietly();
        try {
          await executeSingleMutation(mutation);
          recordSupabaseSuccess();
          return { queuedOffline: false };
        } catch (retryError: any) {
          lastError = retryError;
        }
      }
      recordSupabaseFailure(`write:${mutation.table}`, lastError);
    }
  }

  const rawQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
  const queue: QueuedMutation[] = rawQueue ? JSON.parse(rawQueue) : [];
  queue.push({
    ...mutation,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  currentState.pendingSyncCount = queue.length;
  notifyListeners();
  return { queuedOffline: true };
}

async function executeSingleMutation(
  item: Omit<QueuedMutation, 'id' | 'createdAt'>
) {
  if (!supabaseClientRef) throw new Error('Supabase client not initialized');
  const tableRef = supabaseClientRef.from(item.table);

  let res: any;
  if (item.action === 'insert') {
    res = await tableRef.insert(item.payload);
  } else if (item.action === 'upsert') {
    res = await tableRef.upsert(item.payload);
  } else if (item.action === 'update') {
    res = await tableRef
      .update(item.payload)
      .eq(item.matchColumn || 'id', item.matchValue);
  } else if (item.action === 'delete') {
    res = await tableRef
      .delete()
      .eq(item.matchColumn || 'id', item.matchValue);
  }

  if (res?.error) throw res.error;
}

export async function flushOfflineMutationQueue(): Promise<void> {
  if (!supabaseClientRef) return;

  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const queue: QueuedMutation[] = rawQueue ? JSON.parse(rawQueue) : [];
    if (queue.length === 0) return;

    const remaining: QueuedMutation[] = [];
    for (const item of queue) {
      try {
        await executeSingleMutation(item);
      } catch {
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    currentState.pendingSyncCount = remaining.length;
    notifyListeners();
  } catch {}
}
