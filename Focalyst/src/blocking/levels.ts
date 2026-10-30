import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { StrictnessLevel } from '../../modules/screen-time-blocker';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type LevelMeta = {
  id: StrictnessLevel;
  label: string;
  icon: IconName;
  description: string;
  facts: [string, string];
};

export const LEVELS: Record<StrictnessLevel, LevelMeta> = {
  gentle: {
    id: 'gentle',
    label: 'Gentle',
    icon: 'lock-open-outline',
    description: 'A short pause before the app opens',
    facts: ['5 sec pause', 'Unlimited unlocks'],
  },
  firm: {
    id: 'firm',
    label: 'Firm',
    icon: 'hand-right-outline',
    description: 'Breathe, name your reason, then unlock for a few minutes',
    facts: ['15 sec pause', '2 unlocks per session'],
  },
  locked: {
    id: 'locked',
    label: 'Locked',
    icon: 'lock-closed-outline',
    description: 'No unlocking until the focus block ends',
    facts: ['No unlocks', '1 emergency unlock a day'],
  },
};

export const LEVEL_ORDER: StrictnessLevel[] = ['gentle', 'firm', 'locked'];

export const levelRank = (level: StrictnessLevel) => LEVEL_ORDER.indexOf(level);

/** "9:40 PM" style absolute time. */
export const formatClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/** "18:40" style countdown from seconds. */
export const formatCountdown = (totalSeconds: number) => {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

/** "6 apps · 1 website" summary used across S1, S4, S6, S7. */
export const selectionLabel = (s: { appCount: number; categoryCount: number; webCount: number }) => {
  const parts: string[] = [`${s.appCount} ${s.appCount === 1 ? 'app' : 'apps'}`];
  if (s.categoryCount > 0) parts.push(`${s.categoryCount} ${s.categoryCount === 1 ? 'category' : 'categories'}`);
  if (s.webCount > 0) parts.push(`${s.webCount} ${s.webCount === 1 ? 'website' : 'websites'}`);
  return parts.join(' · ');
};

export const selectionTotal = (s: { appCount: number; categoryCount: number; webCount: number }) =>
  s.appCount + s.categoryCount + s.webCount;
