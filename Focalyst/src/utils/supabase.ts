import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://thdvzgzbyqkxrptvyyqq.supabase.co') as string;
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fDeoIkFZDgI5DOW_GHl9Vw_aOwNqybs') as string;

const isWebSSR = Platform.OS === 'web' && typeof window === 'undefined';
const authStorage = isWebSSR
  ? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
  : AsyncStorage;

const FETCH_TIMEOUT_MS = 12_000;
const TRANSIENT_GATEWAY_STATUSES = new Set([502, 503, 504, 522]);

let refreshBackoffFailures = 0;
let refreshCooldownUntil = 0;

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isRefreshTokenRequest(url: string): boolean {
  return url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token');
}

function computeBackoffMs(failures: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, failures - 1)));
  const jitter = Math.floor(Math.random() * 1000);
  return exp + jitter;
}

function syntheticUnavailableResponse(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init?.signal;

  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * Resilient fetch wrapper for Supabase:
 * - Enforces a 12s AbortController timeout per attempt
 * - Applies exponential backoff + jitter on 502/503/504/522 for refresh_token calls
 *   so GoTrueClient._recoverAndRefresh cannot hammer /auth/v1/token in a tight loop
 * - Returns synthetic 503 (retryable) rather than 4xx so cached local sessions are preserved
 */
async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = getRequestUrl(input);
  const isRefresh = isRefreshTokenRequest(url);

  if (isRefresh && Date.now() < refreshCooldownUntil) {
    return syntheticUnavailableResponse('Auth refresh in transient outage backoff');
  }

  const maxAttempts = isRefresh ? 1 : 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(input, init, FETCH_TIMEOUT_MS);

      if (TRANSIENT_GATEWAY_STATUSES.has(response.status)) {
        if (isRefresh) {
          refreshBackoffFailures += 1;
          refreshCooldownUntil = Date.now() + computeBackoffMs(refreshBackoffFailures, 2000, 60_000);
          return response;
        }
        if (attempt < maxAttempts && !init?.signal?.aborted) {
          const delay = 500 + Math.floor(Math.random() * 700);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        return response;
      }

      if (isRefresh) {
        refreshBackoffFailures = 0;
        refreshCooldownUntil = 0;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (init?.signal?.aborted) {
        throw err;
      }
      if (isRefresh) {
        refreshBackoffFailures += 1;
        refreshCooldownUntil = Date.now() + computeBackoffMs(refreshBackoffFailures, 2000, 60_000);
        // Return retryable 503 so GoTrueClient keeps the locally cached session intact
        return syntheticUnavailableResponse('Auth refresh timed out or failed transiently');
      }
      if (attempt < maxAttempts) {
        const delay = 500 + Math.floor(Math.random() * 700);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: resilientFetch,
  },
  auth: {
    storage: authStorage,
    autoRefreshToken: !isWebSSR,
    persistSession: !isWebSSR,
    detectSessionInUrl: false,
  },
});

let inFlightSessionPromise: Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>> | null = null;
let sessionCache: Awaited<ReturnType<typeof supabase.auth.getSession>> | null = null;
let sessionCacheExpiresAt = 0;

let inFlightRefreshPromise: Promise<Awaited<ReturnType<typeof supabase.auth.refreshSession>>> | null = null;
let lastRefreshTime = 0;
let lastRefreshResult: Awaited<ReturnType<typeof supabase.auth.refreshSession>> | null = null;

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    sessionCache = null;
    sessionCacheExpiresAt = 0;
    lastRefreshResult = null;
    lastRefreshTime = 0;
    refreshBackoffFailures = 0;
    refreshCooldownUntil = 0;
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    sessionCache = { data: { session }, error: null };
    sessionCacheExpiresAt = Date.now() + 2000;
    refreshBackoffFailures = 0;
    refreshCooldownUntil = 0;
  }
});

export async function getCoalescedSession(): Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>> {
  const now = Date.now();
  if (sessionCache?.data?.session && now < sessionCacheExpiresAt) {
    return sessionCache;
  }
  if (inFlightSessionPromise) {
    return Promise.race([
      inFlightSessionPromise,
      new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>>((resolve) =>
        setTimeout(() => {
          supabase.auth
            .getSession()
            .then(resolve)
            .catch(() => resolve({ data: { session: null }, error: null } as any));
        }, 5000)
      ),
    ]);
  }
  inFlightSessionPromise = (async () => {
    try {
      const res = await Promise.race([
        supabase.auth.getSession(),
        new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>>((resolve) =>
          setTimeout(
            () => resolve({ data: { session: null }, error: new Error('getSession timeout') as any }),
            5000
          )
        ),
      ]);
      // Never cache a null session; otherwise a post-login call within 2s reads stale null.
      if (!res.error && res.data?.session) {
        sessionCache = res;
        sessionCacheExpiresAt = Date.now() + 2000;
      } else {
        sessionCache = null;
        sessionCacheExpiresAt = 0;
      }
      return res;
    } finally {
      inFlightSessionPromise = null;
    }
  })();
  return inFlightSessionPromise;
}

export async function coalescedRefreshSession(): Promise<Awaited<ReturnType<typeof supabase.auth.refreshSession>>> {
  const now = Date.now();
  if (now - lastRefreshTime < 10000 && lastRefreshResult) {
    return lastRefreshResult;
  }
  if (inFlightRefreshPromise) {
    return Promise.race([
      inFlightRefreshPromise,
      new Promise<Awaited<ReturnType<typeof supabase.auth.refreshSession>>>((resolve) =>
        setTimeout(() => {
          supabase.auth
            .getSession()
            .then((s) =>
              resolve({ data: { session: s.data.session, user: s.data.session?.user ?? null }, error: s.error } as any)
            )
            .catch(() => resolve({ data: { session: null, user: null }, error: null } as any));
        }, 5000)
      ),
    ]);
  }
  inFlightRefreshPromise = (async () => {
    try {
      const res = await Promise.race([
        supabase.auth.refreshSession(),
        new Promise<Awaited<ReturnType<typeof supabase.auth.refreshSession>>>((resolve) =>
          setTimeout(() => {
            supabase.auth
              .getSession()
              .then((s) =>
                resolve({ data: { session: s.data.session, user: s.data.session?.user ?? null }, error: s.error } as any)
              )
              .catch(() =>
                resolve({ data: { session: null, user: null }, error: new Error('refreshSession timeout') as any } as any)
              );
          }, 5000)
        ),
      ]);
      lastRefreshTime = Date.now();
      lastRefreshResult = res;
      if (!res.error && res.data?.session) {
        sessionCache = { data: { session: res.data.session }, error: null };
        sessionCacheExpiresAt = Date.now() + 2000;
      }
      return res;
    } finally {
      inFlightRefreshPromise = null;
    }
  })();
  return inFlightRefreshPromise;
}

// Polyfill/Helper to handle URL session parsing inside React Native / Expo environment
(supabase.auth as any).getSessionFromUrl = async (urlStr: string) => {
  try {
    const getParam = (name: string) => {
      const regex = new RegExp('[?&#]' + name + '=([^&#]*)');
      const results = regex.exec(urlStr);
      return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
    };

    const code = getParam('code');
    if (code) {
      return await supabase.auth.exchangeCodeForSession(code);
    }

    const accessToken = getParam('access_token');
    const refreshToken = getParam('refresh_token');

    if (accessToken && refreshToken) {
      return await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    return { data: { session: null, user: null }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
};
