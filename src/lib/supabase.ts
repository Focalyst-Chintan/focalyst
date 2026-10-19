import { createBrowserClient } from '@supabase/ssr'
import { Preferences } from '@capacitor/preferences'

/**
 * Detect whether the Capacitor native bridge is available and injected.
 * On iOS, `window.Capacitor` is injected by the native shell after the
 * WebView finishes loading. If we call Preferences before it's ready,
 * the plugin throws a silent JS panic that corrupts the auth flow.
 */
function isCapacitorReady(): boolean {
    try {
        return (
            typeof window !== 'undefined' &&
            !!(window as any).Capacitor?.isNativePlatform?.()
        )
    } catch {
        return false
    }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Capacitor Preferences timeout')), timeoutMs))
    ]);
}

const capacitorStorage = {
    getItem: async (key: string): Promise<string | null> => {
        // Always try Capacitor first if bridge is ready, otherwise fall back to localStorage
        if (isCapacitorReady()) {
            try {
                const { value } = await withTimeout(Preferences.get({ key }), 1000);
                return value;
            } catch (e) {
                console.warn('Capacitor Preferences.get failed or timed out, falling back to localStorage:', e);
            }
        }
        // Fallback: localStorage (works in web and pre-bridge iOS)
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem(key);
        }
        return null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (isCapacitorReady()) {
            try {
                await withTimeout(Preferences.set({ key, value }), 1000);
                return;
            } catch (e) {
                console.warn('Capacitor Preferences.set failed or timed out, falling back to localStorage:', e);
            }
        }
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
        }
    },
    removeItem: async (key: string): Promise<void> => {
        if (isCapacitorReady()) {
            try {
                await withTimeout(Preferences.remove({ key }), 1000);
                return;
            } catch (e) {
                console.warn('Capacitor Preferences.remove failed or timed out, falling back to localStorage:', e);
            }
        }
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
        }
    }
};

// Singleton Supabase browser client.
// This module is imported by AuthContext (which also uses a module-level singleton).
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (_client) return _client;

    _client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                storage: capacitorStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    )
    return _client;
}
