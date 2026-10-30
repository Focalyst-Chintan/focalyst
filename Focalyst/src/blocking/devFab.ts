import { useEffect } from 'react';
import { requireOptionalNativeModule } from 'expo-modules-core';

// Development builds float expo-dev-menu's gear button over every screen. It never ships in
// release builds, but it covers the timer and sheets while testing, so hide it while they show.
type DevMenuPreferences = {
  getPreferencesAsync(): Promise<{ showFloatingActionButton?: boolean }>;
  setPreferencesAsync(settings: { showFloatingActionButton: boolean }): Promise<void>;
};

const Prefs = __DEV__ ? requireOptionalNativeModule<DevMenuPreferences>('DevMenuPreferences') : null;

let holders = 0;
let restoreTo: boolean | null = null;

async function acquire() {
  if (!Prefs || holders++ > 0) return;
  try {
    const prefs = await Prefs.getPreferencesAsync();
    restoreTo = prefs.showFloatingActionButton ?? true;
    if (holders > 0) await Prefs.setPreferencesAsync({ showFloatingActionButton: false });
  } catch {}
}

async function release() {
  if (!Prefs || --holders > 0) return;
  holders = 0;
  try {
    if (restoreTo) await Prefs.setPreferencesAsync({ showFloatingActionButton: true });
  } catch {}
}

/** Hides the dev-menu floating button while `active` (development builds only). */
export function useHideDevFab(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquire();
    return () => {
      release();
    };
  }, [active]);
}
