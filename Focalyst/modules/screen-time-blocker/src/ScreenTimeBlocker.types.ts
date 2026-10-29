export type StrictnessLevel = 'gentle' | 'firm' | 'locked';

export type AuthStatus = 'approved' | 'denied' | 'notDetermined';

export type PickerMode = 'blocklist' | 'allowed';

export type PickerResult = {
  appCount: number;
  categoryCount: number;
  webCount: number;
};

/** Timestamps are epoch milliseconds (same as `Date.now()`). */
export type SessionPhasePlan = {
  type: 'focus' | 'break';
  startAt: number;
  endAt: number;
};

export type StartSessionConfig = {
  sessionId: string;
  level: StrictnessLevel;
  /** Epoch milliseconds. */
  endTimestamp: number;
  unblockOnBreaks: boolean;
  phases?: SessionPhasePlan[];
  /** Firm unlocks still left this session (defaults to 2 on Firm). */
  unlocksLeft?: number;
};

export type PendingUnlockRequest = {
  timestamp: number;
  level: StrictnessLevel;
  appName: string | null;
  /** Android: package name of the app the shield was covering. */
  appId?: string | null;
  /** Android: display name of that app. */
  appLabel?: string | null;
};

/** Android: one launchable app from `getInstalledAppsWithUsage`. */
export type AndroidAppItem = {
  packageName: string;
  appName: string;
  /** `file://` PNG (120x120) in the app cache; null if the icon couldn't be rendered. */
  iconUri: string | null;
  /** Average foreground minutes per day over the last 7 days (0 without Usage Access). */
  avgDailyMinutes: number;
  /** e.g. "2h 14m a day", "18m a day", or "" when unused. */
  formattedUsage: string;
};

export type AndroidInstalledApps = {
  /** Top 8 apps by daily usage. */
  mostUsed: AndroidAppItem[];
  /** Every launchable app, A to Z. */
  allApps: AndroidAppItem[];
};

export type AndroidPermissionsStatus = {
  usageAccess: boolean;
  accessibilityEnabled: boolean;
};

export type BlockingEvent = {
  type: 'attempt' | 'unlock' | 'emergency' | 'phase';
  appId?: string;
  /** Android: display name for `appId`. */
  appLabel?: string;
  at: number;
  minuteIntoBlock?: number;
  reason?: 'study' | 'reply' | 'bored' | 'other';
  minutes?: number;
  phase?: string;
};

export type SessionBlockingLog = {
  sessionId: string | null;
  attemptsCount: number;
  unlocksUsed: number;
  emergencyUsed: boolean;
  interrupted: boolean;
  events: BlockingEvent[];
  attemptsByApp: Record<string, number>;
};

export type AppTokenLabelViewProps = {
  tokenIndex?: number;
  mode?: PickerMode;
  size?: number;
  showTitle?: boolean;
  /** Follows Focalyst's in-app dark mode instead of the system appearance. */
  colorScheme?: 'light' | 'dark';
  style?: any;
};
