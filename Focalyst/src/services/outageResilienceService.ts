import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@focalyst_cache_';
const QUEUE_STORAGE_KEY = '@focalyst_offline_queue_v1';
const REMOTE_STATUS_CACHE_KEY = '@focalyst_remote_status_v1';

export const CHECK_INTERVAL_SEC = 30;

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
  secondsUntilNextCheck: number;
  isCheckingNow: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  remoteConfig: RemoteOutageConfig;
}

const DEFAULT_REMOTE_CONFIG: RemoteOutageConfig = {
  forceOutageBanner: false,
  title: 'Cloud Sync Temporarily Paused',
  shortBannerText: "Something's wrong with cloud sync — Offline Mode active. Tap for details.",
  explainer:
    'Our database provider is currently experiencing a temporary outage. You can keep using Focalyst normally — anything you log right now is saved safely on your iPhone and will sync automatically as soon as servers are back.',
  eta: 'Checking connection automatically every 30 seconds',
};

type Listener = (state: OutageState) => void;
const listeners = new Set<Listener>();

let currentState: OutageState = {
  isOutage: false,
  secondsUntilNextCheck: CHECK_INTERVAL_SEC,
  isCheckingNow: false,
  pendingSyncCount: 0,
  lastSyncedAt: null,
  remoteConfig: DEFAULT_REMOTE_CONFIG,
};

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let supabaseClientRef: any = null;
let appStateSubscription: any = null;

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
    if (!currentState.isOutage && currentState.pendingSyncCount === 0) {
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

export function reportSupabaseOutage() {
  if (!currentState.isOutage) {
    currentState.isOutage = true;
    currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
    void fetchExternalOutageMessage();
    notifyListeners();
  }
}

export async function checkBackendHealthAndSync(): Promise<boolean> {
  currentState.isCheckingNow = true;
  notifyListeners();

  await fetchExternalOutageMessage();

  if (!supabaseClientRef) {
    currentState.isCheckingNow = false;
    notifyListeners();
    return false;
  }

  try {
    const pingPromise = supabaseClientRef.rpc('ping_health');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase health ping timeout')), 5000)
    );

    const { error } = (await Promise.race([pingPromise, timeoutPromise])) as any;

    if (
      error &&
      (error.status >= 500 ||
        error.message?.includes('FetchError') ||
        error.message?.includes('Network') ||
        error.message?.includes('timeout'))
    ) {
      throw error;
    }

    await flushOfflineMutationQueue();

    currentState.isOutage = Boolean(currentState.remoteConfig.forceOutageBanner);
    currentState.isCheckingNow = false;
    currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
    currentState.lastSyncedAt = new Date().toISOString();
    notifyListeners();
    return true;
  } catch {
    currentState.isOutage = true;
    currentState.isCheckingNow = false;
    currentState.secondsUntilNextCheck = CHECK_INTERVAL_SEC;
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
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), 6000)
    );
    const { data, error } = await Promise.race([fetcher(), timeoutPromise]);

    if (error) throw error;

    if (data !== null && data !== undefined) {
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      if (currentState.isOutage && !currentState.remoteConfig.forceOutageBanner) {
        void checkBackendHealthAndSync();
      }
      return data;
    }
  } catch {
    reportSupabaseOutage();
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
      return { queuedOffline: false };
    } catch {
      reportSupabaseOutage();
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
  reportSupabaseOutage();
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
