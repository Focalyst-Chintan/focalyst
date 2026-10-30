import { Platform, Vibration } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// expo-haptics isn't in the current native build. Talk to its native module directly when it
// exists (after `npx expo install expo-haptics` + rebuild) and silently no-op until then.
type NativeHaptics = {
  selectionAsync(): Promise<void>;
  impactAsync(style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'): Promise<void>;
  notificationAsync(type: 'success' | 'warning' | 'error'): Promise<void>;
};

const Native = Platform.OS === 'web' ? null : requireOptionalNativeModule<NativeHaptics>('ExpoHaptics');

const fire = (fn: (m: NativeHaptics) => Promise<void>) => {
  if (!Native) return;
  fn(Native).catch(() => {});
};

export const haptics = {
  selection: () => fire((m) => m.selectionAsync()),
  light: () => fire((m) => m.impactAsync('light')),
  soft: () => fire((m) => m.impactAsync('soft')),
  medium: () => fire((m) => m.impactAsync('medium')),
  heavy: () => fire((m) => m.impactAsync('heavy')),
  success: () => fire((m) => m.notificationAsync('success')),
  error: () => fire((m) => m.notificationAsync('error')),
  /**
   * Emergency-hold ticks must be felt even without expo-haptics, so this one falls back to a
   * short system vibration. `step` 1 to 5 grows the impact.
   */
  holdTick: (step: number) => {
    if (Native) {
      Native.impactAsync(step >= 5 ? 'heavy' : step >= 3 ? 'medium' : 'light').catch(() => {});
    } else {
      Vibration.vibrate(step >= 5 ? 400 : 40);
    }
  },
};
