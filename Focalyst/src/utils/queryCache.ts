import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEntry<T> = {
  data: T;
  updatedAt: number;
  expiresAt: number;
};

const SNAPSHOT_PREFIX = '@focalyst_snap:';

class QueryCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private hydratedUsers = new Set<string>();
  public metrics = { hits: 0, misses: 0, deduped: 0, diskHydrations: 0 };

  /**
   * Preloads all saved device snapshots for a user into memory on app startup (<25ms).
   */
  async hydrateUserSnapshots(userId: string): Promise<void> {
    if (!userId || this.hydratedUsers.has(userId)) return;
    this.hydratedUsers.add(userId);

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userSnapKeys = allKeys.filter((k) =>
        k.startsWith(`${SNAPSHOT_PREFIX}user:${userId}:`)
      );
      if (userSnapKeys.length === 0) return;

      const pairs = await AsyncStorage.multiGet(userSnapKeys);
      const now = Date.now();

      for (const [storageKey, rawVal] of pairs) {
        if (!rawVal) continue;
        const cacheKey = storageKey.slice(SNAPSHOT_PREFIX.length);
        // Do not overwrite if fresh network data already arrived in RAM
        if (this.cache.has(cacheKey)) continue;

        try {
          const parsed = JSON.parse(rawVal);
          this.cache.set(cacheKey, {
            data: parsed.data,
            updatedAt: parsed.updatedAt || now,
            // Mark disk snapshot as expiring in 5s so UI renders in 0ms and refreshes silently in background
            expiresAt: now + 5_000,
          });
          this.metrics.diskHydrations += 1;
        } catch {}
      }
    } catch (e) {
      console.warn('[QueryCache] Disk snapshot hydration warning:', e);
    }
  }

  getSync<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : undefined;
  }

  /**
   * Reads from RAM first; if cold, reads the on-device snapshot from AsyncStorage.
   */
  async getOrHydrate<T>(key: string): Promise<T | undefined> {
    const mem = this.getSync<T>(key);
    if (mem !== undefined) return mem;

    try {
      const raw = await AsyncStorage.getItem(`${SNAPSHOT_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data !== undefined) {
          this.cache.set(key, {
            data: parsed.data,
            updatedAt: parsed.updatedAt || Date.now(),
            expiresAt: Date.now() + 5_000,
          });
          return parsed.data as T;
        }
      }
    } catch {}
    return undefined;
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  setSync<T>(
    key: string,
    updater: T | ((prev: T | undefined) => T),
    ttlMs: number = 120_000
  ): T {
    const prev = this.getSync<T>(key);
    const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: next,
      updatedAt: now,
      expiresAt: now + ttlMs,
    };
    this.cache.set(key, entry);

    // Persist snapshot asynchronously to device storage without blocking UI
    if (key.startsWith('user:')) {
      AsyncStorage.setItem(
        `${SNAPSHOT_PREFIX}${key}`,
        JSON.stringify({ data: next, updatedAt: now })
      ).catch(() => {});
    }

    return next;
  }

  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 120_000,
    forceRefresh: boolean = false
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    if (!forceRefresh && existing && existing.expiresAt > now) {
      this.metrics.hits += 1;
      return existing.data as T;
    }

    const activePromise = this.inFlight.get(key);
    if (activePromise) {
      this.metrics.deduped += 1;
      return activePromise as Promise<T>;
    }

    this.metrics.misses += 1;
    const promise = fetcher()
      .then((result) => {
        const timestamp = Date.now();
        this.cache.set(key, {
          data: result,
          updatedAt: timestamp,
          expiresAt: timestamp + ttlMs,
        });
        this.inFlight.delete(key);

        if (key.startsWith('user:')) {
          AsyncStorage.setItem(
            `${SNAPSHOT_PREFIX}${key}`,
            JSON.stringify({ data: result, updatedAt: timestamp })
          ).catch(() => {});
        }
        return result;
      })
      .catch(async (err) => {
        this.inFlight.delete(key);
        // On slow/offline plane connection, fall back to on-device snapshot if available!
        const fallback = await this.getOrHydrate<T>(key);
        if (fallback !== undefined) {
          return fallback;
        }
        throw err;
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    AsyncStorage.removeItem(`${SNAPSHOT_PREFIX}${key}`).catch(() => {});
  }

  invalidatePrefix(prefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        AsyncStorage.removeItem(`${SNAPSHOT_PREFIX}${key}`).catch(() => {});
      }
    }
  }

  clearAll(): void {
    this.cache.clear();
    this.inFlight.clear();
    this.hydratedUsers.clear();
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const snapKeys = keys.filter((k) => k.startsWith(SNAPSHOT_PREFIX));
        if (snapKeys.length > 0) {
          return AsyncStorage.multiRemove(snapKeys);
        }
      })
      .catch(() => {});
  }
}

export const queryCache = new QueryCacheManager();
