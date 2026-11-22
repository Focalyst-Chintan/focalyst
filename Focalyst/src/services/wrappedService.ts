import { getCoalescedSession } from '../utils/supabase';

export function isWrappedWindowActive(now: Date = new Date()): boolean {
  const month = now.getMonth();
  const day = now.getDate();
  return (month === 11 && day === 31) || (month === 0 && day >= 1 && day <= 5);
}

export type WrappedArchetypeKey =
  | 'iron_willed_sentinel'
  | 'verbal_architect'
  | 'deep_work_monolith'
  | 'relentless_streaksmith'
  | 'avalanche_finisher'
  | 'rhythm_weaver';

export interface WrappedPayload {
  year: number;
  timezone: string;
  window: {
    unlockAt: string;
    expiresAt: string;
  };
  tasks: {
    completedCount: number;
    topTag: string | null;
    peakDay: { date: string; count: number } | null;
  };
  habits: {
    totalLogs: number;
    activeDays: number;
    longestStreak: number;
    topHabit: { id: string; name: string; logsCount: number } | null;
  };
  focus: {
    totalMinutes: number;
    sessionsCount: number;
    peakDay: { date: string; minutes: number } | null;
  };
  blocker: {
    shieldedMinutes: number;
    deflectedAttempts: number;
    estimatedReclaimedMinutes: number;
    topBlockedApp: { appLabel: string; attempts: number } | null;
  };
  voice: {
    totalWords: number;
    totalDurationSeconds: number;
    notesCount: number;
  };
  ai: {
    totalPrompts: number;
    topTabContext: string | null;
    peakDay: { date: string; count: number } | null;
  };
  ranking: {
    overallPercentile: number;
    percentileLabel: string;
    eligibleUsersCount: number;
    categoryPercentiles: {
      tasks: number;
      habits: number;
      focus: number;
      blocker: number;
      voice: number;
      ai: number;
    };
  };
  archetypeKey: WrappedArchetypeKey;
  aiVerdict: string;
  aiMotto: string;
}

export interface WrappedApiResponse {
  id: string;
  user_id: string;
  year: number;
  timezone: string;
  unlock_at: string;
  expires_at: string;
  archetype_key: WrappedArchetypeKey;
  overall_percentile: number;
  percentile_label: string;
  ai_verdict: string | null;
  ai_motto: string | null;
  compiled_at: string;
  preview: boolean;
  payload: WrappedPayload;
}

export type WrappedFetchResult =
  | { status: 'ready'; data: WrappedApiResponse }
  | { status: 'locked'; unlockAt?: string; expiresAt?: string; message: string }
  | { status: 'expired'; unlockAt?: string; expiresAt?: string; message: string }
  | { status: 'not_compiled'; message: string }
  | { status: 'unauthorized'; message: string }
  | { status: 'error'; message: string };

export const ARCHETYPE_META: Record<
  WrappedArchetypeKey,
  {
    title: string;
    eyebrow: string;
    description: string;
    gradientColors: [string, string, string];
    accentColor: string;
  }
> = {
  iron_willed_sentinel: {
    title: 'Iron-Willed Sentinel',
    eyebrow: 'DISTRACTION DEFENSE',
    description: 'You guarded your attention fiercely and turned blocked impulses into reclaimed hours.',
    gradientColors: ['#2B0A1A', '#132A3E', '#05070F'],
    accentColor: '#2DD4BF',
  },
  verbal_architect: {
    title: 'Verbal Architect',
    eyebrow: 'THOUGHT TO ACTION',
    description: 'You captured raw ideas by voice and shaped them into clarity with Focalyst AI.',
    gradientColors: ['#2E1065', '#0E3A5C', '#05070F'],
    accentColor: '#38BDF8',
  },
  deep_work_monolith: {
    title: 'Deep Work Monolith',
    eyebrow: 'UNBROKEN FOCUS',
    description: 'Long, deliberate focus blocks were your signature edge all year.',
    gradientColors: ['#09205E', '#1D4ED8', '#05070F'],
    accentColor: '#60A5FA',
  },
  relentless_streaksmith: {
    title: 'Relentless Streaksmith',
    eyebrow: 'DAILY CONSISTENCY',
    description: 'You proved that quiet daily reps compound into unstoppable momentum.',
    gradientColors: ['#064E3B', '#0F4C5C', '#05070F'],
    accentColor: '#34D399',
  },
  avalanche_finisher: {
    title: 'Avalanche Finisher',
    eyebrow: 'HIGH-OUTPUT EXECUTION',
    description: 'You cleared ambitious task queues with decisive follow-through.',
    gradientColors: ['#4C1D0B', '#7F1D1D', '#05070F'],
    accentColor: '#FBBF24',
  },
  rhythm_weaver: {
    title: 'Rhythm Weaver',
    eyebrow: 'BALANCED MASTERY',
    description: 'You balanced tasks, habits, and deep work into a sustainable year-round cadence.',
    gradientColors: ['#1E1B4B', '#0F4C5C', '#05070F'],
    accentColor: '#A78BFA',
  },
};

export const SAMPLE_WRAPPED_PAYLOAD: WrappedPayload = {
  year: 2026,
  timezone: 'Asia/Kolkata',
  window: {
    unlockAt: '2026-12-31T06:30:00.000Z',
    expiresAt: '2027-01-05T18:29:59.999Z',
  },
  tasks: {
    completedCount: 418,
    topTag: 'Deep Work',
    peakDay: { date: '2026-09-14', count: 14 },
  },
  habits: {
    totalLogs: 612,
    activeDays: 248,
    longestStreak: 46,
    topHabit: { id: 'sample-habit-1', name: 'Morning Planning', logsCount: 194 },
  },
  focus: {
    totalMinutes: 11420,
    sessionsCount: 286,
    peakDay: { date: '2026-10-08', minutes: 240 },
  },
  blocker: {
    shieldedMinutes: 8640,
    deflectedAttempts: 193,
    estimatedReclaimedMinutes: 965,
    topBlockedApp: { appLabel: 'Instagram', attempts: 84 },
  },
  voice: {
    totalWords: 18450,
    totalDurationSeconds: 5280,
    notesCount: 42,
  },
  ai: {
    totalPrompts: 315,
    topTabContext: 'plan',
    peakDay: { date: '2026-08-21', count: 19 },
  },
  ranking: {
    overallPercentile: 99.12,
    percentileLabel: 'Top 1%',
    eligibleUsersCount: 130,
    categoryPercentiles: {
      tasks: 96.4,
      habits: 97.8,
      focus: 99.2,
      blocker: 98.5,
      voice: 94.1,
      ai: 95.3,
    },
  },
  archetypeKey: 'deep_work_monolith',
  aiVerdict:
    'You logged 190+ hours of deep focus, cleared 418 tasks, and deflected 193 distraction attempts—turning quiet mornings into your highest-leverage advantage.',
  aiMotto: 'Guard the silence, ship the work.',
};

export function hasMeaningfulWrappedActivity(payload: WrappedPayload): boolean {
  return (
    payload.tasks.completedCount > 0 ||
    payload.habits.totalLogs > 0 ||
    payload.focus.totalMinutes > 0 ||
    payload.blocker.shieldedMinutes > 0 ||
    payload.blocker.deflectedAttempts > 0 ||
    payload.voice.totalWords > 0 ||
    payload.ai.totalPrompts > 0
  );
}

export function getWrappedApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL || 'https://focalyst.online').replace(/\/+$/, '');
}

export async function fetchYearWrapped(options?: {
  year?: number;
  preview?: boolean;
  baseUrl?: string;
}): Promise<WrappedFetchResult> {
  const year = options?.year ?? 2026;
  const preview = options?.preview ?? true;
  const baseUrl = (options?.baseUrl || getWrappedApiBaseUrl()).replace(/\/+$/, '');

  try {
    const { data: sessionData } = await getCoalescedSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return {
        status: 'unauthorized',
        message: 'Sign in to load your personalized Year Wrapped.',
      };
    }

    const url = `${baseUrl}/api/wrapped/${year}${preview ? '?preview=true' : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 200 && json?.payload) {
      return { status: 'ready', data: json as WrappedApiResponse };
    }
    if (res.status === 425) {
      return {
        status: 'locked',
        unlockAt: json?.unlock_at,
        expiresAt: json?.expires_at,
        message: json?.error || 'Your Year Wrapped unlocks on December 31.',
      };
    }
    if (res.status === 410) {
      return {
        status: 'expired',
        unlockAt: json?.unlock_at,
        expiresAt: json?.expires_at,
        message: json?.error || 'Your Year Wrapped window has closed.',
      };
    }
    if (res.status === 404) {
      return {
        status: 'not_compiled',
        message: json?.error || `No compiled ${year} Wrapped found for your account yet.`,
      };
    }
    if (res.status === 401) {
      return {
        status: 'unauthorized',
        message: 'Your session expired. Please sign in again.',
      };
    }

    return {
      status: 'error',
      message: json?.error || `Failed to load Wrapped (${res.status}).`,
    };
  } catch (err: unknown) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Network error loading Wrapped.',
    };
  }
}
