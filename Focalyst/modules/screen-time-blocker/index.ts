import { createElement, type ComponentType } from 'react';
import { Platform, View } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';

import type {
  AndroidInstalledApps,
  AndroidPermissionsStatus,
  AppTokenLabelViewProps,
  AuthStatus,
  PendingUnlockRequest,
  PickerMode,
  PickerResult,
  SessionBlockingLog,
  StartSessionConfig,
  StrictnessLevel,
} from './src/ScreenTimeBlocker.types';

export * from './src/ScreenTimeBlocker.types';

type NativeScreenTimeBlocker = {
  requestAuthorization(): Promise<'approved' | 'denied'>;
  getAuthorizationStatus(): Promise<AuthStatus>;
  openAppPicker(mode: PickerMode): Promise<PickerResult>;
  getSelectionSummary(mode: PickerMode): Promise<PickerResult>;
  startSessionBlocking(config: StartSessionConfig): Promise<boolean>;
  pauseSessionBlocking(): Promise<boolean>;
  resumeSessionBlocking(): Promise<boolean>;
  stopSessionBlocking(): Promise<boolean>;
  grantTemporaryUnlock(durationMinutes: number, reason?: string): Promise<boolean>;
  lockTemporaryUnlockNow(): Promise<boolean>;
  triggerEmergencyUnlock(): Promise<boolean>;
  canUseEmergencyUnlockToday(): Promise<boolean>;
  startQuickBlock(endTimestamp: number, level: StrictnessLevel): Promise<boolean>;
  stopQuickBlock(): Promise<boolean>;
  getSessionTelemetry(): Promise<SessionBlockingLog>;
  clearSessionTelemetry(): Promise<void>;
  getPendingUnlockRequest(): Promise<PendingUnlockRequest | null>;
  clearPendingUnlockRequest(): Promise<void>;
  scheduleRecurringBlock(
    id: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    repeatDays: number[],
    level: StrictnessLevel
  ): Promise<boolean>;
  cancelRecurringBlock(id: string): Promise<void>;
  // Android only.
  getAndroidPermissionsStatus(): Promise<AndroidPermissionsStatus>;
  openUsageAccessSettings(): Promise<void>;
  openAccessibilitySettings(): Promise<void>;
  getInstalledAppsWithUsage(): Promise<AndroidInstalledApps>;
  setAndroidBlocklist(packageNames: string[]): Promise<PickerResult>;
  setAndroidAllowlist(packageNames: string[]): Promise<PickerResult>;
  getAndroidBlocklist(): Promise<string[]>;
  getAndroidAllowlist(): Promise<string[]>;
};

// Null on Web, Expo Go, or any build compiled before this module existed.
const Native =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? requireOptionalNativeModule<NativeScreenTimeBlocker>('ScreenTimeBlocker')
    : null;

/** The Android build of the module, null everywhere else. */
const AndroidNative = Platform.OS === 'android' ? Native : null;

export const isAvailable = Native != null;

const EMPTY_PICKER: PickerResult = { appCount: 0, categoryCount: 0, webCount: 0 };

const emptyLog = (): SessionBlockingLog => ({
  sessionId: null,
  attemptsCount: 0,
  unlocksUsed: 0,
  emergencyUsed: false,
  interrupted: false,
  events: [],
  attemptsByApp: {},
});

async function call<T>(
  fn: (m: NativeScreenTimeBlocker) => Promise<T>,
  fallback: T,
  native: NativeScreenTimeBlocker | null = Native
): Promise<T> {
  if (!native) return fallback;
  try {
    return await fn(native);
  } catch (err) {
    if (__DEV__) console.warn('[ScreenTimeBlocker]', err);
    return fallback;
  }
}

export const requestAuthorization = () =>
  call<'approved' | 'denied'>((m) => m.requestAuthorization(), 'denied');

export const getAuthorizationStatus = () =>
  call<AuthStatus>((m) => m.getAuthorizationStatus(), 'notDetermined');

export const openAppPicker = (mode: PickerMode) => call((m) => m.openAppPicker(mode), EMPTY_PICKER);

export const getSelectionSummary = (mode: PickerMode) =>
  call((m) => m.getSelectionSummary(mode), EMPTY_PICKER);

export const startSessionBlocking = (config: StartSessionConfig) =>
  call((m) => m.startSessionBlocking(config), false);

export const pauseSessionBlocking = () => call((m) => m.pauseSessionBlocking(), false);

export const resumeSessionBlocking = () => call((m) => m.resumeSessionBlocking(), false);

export const stopSessionBlocking = () => call((m) => m.stopSessionBlocking(), false);

export const grantTemporaryUnlock = (durationMinutes: number, reason?: string) =>
  call((m) => m.grantTemporaryUnlock(durationMinutes, reason), false);

export const lockTemporaryUnlockNow = () => call((m) => m.lockTemporaryUnlockNow(), false);

export const triggerEmergencyUnlock = () => call((m) => m.triggerEmergencyUnlock(), false);

export const canUseEmergencyUnlockToday = () => call((m) => m.canUseEmergencyUnlockToday(), false);

export const startQuickBlock = (endTimestamp: number, level: StrictnessLevel) =>
  call((m) => m.startQuickBlock(endTimestamp, level), false);

export const stopQuickBlock = () => call((m) => m.stopQuickBlock(), false);

export const getSessionTelemetry = () => call((m) => m.getSessionTelemetry(), emptyLog());

export const clearSessionTelemetry = () => call((m) => m.clearSessionTelemetry(), undefined);

/** Set by the shield's "Unblock in Focalyst" button. Missing on builds without the extensions. */
export const getPendingUnlockRequest = () =>
  call<PendingUnlockRequest | null>((m) => m.getPendingUnlockRequest(), null);

export const clearPendingUnlockRequest = () => call((m) => m.clearPendingUnlockRequest(), undefined);

/**
 * Registers a recurring block the DeviceActivityMonitor extension enforces while the app is closed.
 * `repeatDays` are Calendar weekdays (1 = Sunday ... 7 = Saturday); empty means one-off.
 */
export const scheduleRecurringBlock = (
  id: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  repeatDays: number[],
  level: StrictnessLevel
) => call((m) => m.scheduleRecurringBlock(id, startHour, startMinute, endHour, endMinute, repeatDays, level), false);

export const cancelRecurringBlock = (id: string) => call((m) => m.cancelRecurringBlock(id), undefined);

// ─── Android only (safe no-ops elsewhere) ─────────────────────────────────────

const NO_ANDROID_PERMISSIONS: AndroidPermissionsStatus = { usageAccess: false, accessibilityEnabled: false };

export const getAndroidPermissionsStatus = () =>
  call((m) => m.getAndroidPermissionsStatus(), NO_ANDROID_PERMISSIONS, AndroidNative);

export const openUsageAccessSettings = () => call((m) => m.openUsageAccessSettings(), undefined, AndroidNative);

export const openAccessibilitySettings = () => call((m) => m.openAccessibilitySettings(), undefined, AndroidNative);

/** Launchable apps with real icons and 7-day average usage, for the in-app picker. */
export const getInstalledAppsWithUsage = () =>
  call<AndroidInstalledApps>((m) => m.getInstalledAppsWithUsage(), { mostUsed: [], allApps: [] }, AndroidNative);

export const setAndroidBlocklist = (packageNames: string[]) =>
  call((m) => m.setAndroidBlocklist(packageNames), EMPTY_PICKER, AndroidNative);

export const setAndroidAllowlist = (packageNames: string[]) =>
  call((m) => m.setAndroidAllowlist(packageNames), EMPTY_PICKER, AndroidNative);

export const getAndroidBlocklist = () => call<string[]>((m) => m.getAndroidBlocklist(), [], AndroidNative);

export const getAndroidAllowlist = () => call<string[]>((m) => m.getAndroidAllowlist(), [], AndroidNative);

// iOS only: Android renders real icons from `getInstalledAppsWithUsage` instead.
const NativeAppTokenLabelView: ComponentType<AppTokenLabelViewProps> | null =
  Platform.OS === 'ios' && Native
    ? requireNativeViewManager<AppTokenLabelViewProps>('ScreenTimeBlocker', 'AppTokenLabelView')
    : null;

export function AppTokenLabelView({
  tokenIndex = 0,
  mode = 'blocklist',
  size = 40,
  showTitle = false,
  colorScheme,
  style,
}: AppTokenLabelViewProps) {
  const boxStyle = [{ width: size, height: showTitle ? size + 18 : size }, style];
  if (!NativeAppTokenLabelView) {
    return createElement(View, {
      style: [{ borderRadius: size * 0.22, backgroundColor: 'rgba(127,127,127,0.18)' }, ...boxStyle],
    });
  }
  return createElement(NativeAppTokenLabelView, { tokenIndex, mode, size, showTitle, colorScheme, style: boxStyle });
}
