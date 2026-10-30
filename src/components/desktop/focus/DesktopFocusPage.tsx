'use client';

import Link from 'next/link';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RotateCcw,
  Play,
  Pause,
  Square,
  SkipForward,
  Maximize2,
  ChevronDown,
  ShieldCheck,
  Plus,
  MoreVertical,
  Check,
  Settings2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { localDateStr, parseYMDToLocalNoon } from '@/lib/utils/date';
import { getLevelFromXp } from '@/lib/xp/levels';
import { recordFocusSession, reconcileDailyFocus } from '@/lib/focus/recordFocusSession';
import { onDataChanged, emitDataChanged } from '@/lib/events';
import { useFocusStats } from '@/hooks/useFocusStats';
import { useData } from '@/lib/data/useData';
import { FocusRing } from './FocusRing';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Button } from '@/components/desktop/ui/Button';
import { Popover } from '@/components/desktop/ui/Popover';
import { Modal } from '@/components/desktop/ui/Modal';
import { Switch } from '@/components/desktop/ui/Switch';
import CountdownForm from '@/components/focus/CountdownForm';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { Countdown } from '@/types';
import { isPaidPlan } from '@/lib/featureGates';
import { takeRecommendedPreset } from '@/lib/onboarding/plan';
import { PendingCountdownCard } from '@/components/onboarding/PendingCountdownCard';

type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function TimerDisplay({ endsAt }: { endsAt: number }) {
  const now = useNow();
  const left = Math.max(0, endsAt - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  useEffect(() => {
    document.title = `${mm}:${ss} · Focus`;
  }, [mm, ss]);
  return <span className="tabular-nums">{mm}:{ss}</span>;
}

function FocusTimerWidget({
  endsAt,
  pausedTimeLeft,
  isActive,
  totalSeconds,
  isBreak,
  isDeskMode,
  taskTitle,
  onExpire,
}: {
  endsAt: number | null;
  pausedTimeLeft: number;
  isActive: boolean;
  totalSeconds: number;
  isBreak: boolean;
  isDeskMode: boolean;
  taskTitle?: string | null;
  onExpire: () => void;
}) {
  const now = useNow(250);
  const leftMs = isActive && endsAt ? Math.max(0, endsAt - now) : pausedTimeLeft * 1000;
  const leftSecs = Math.max(0, Math.ceil(leftMs / 1000));
  const mm = String(Math.floor(leftMs / 60000)).padStart(2, '0');
  const ss = String(Math.floor((leftMs % 60000) / 1000)).padStart(2, '0');

  useEffect(() => {
    if (isActive) {
      document.title = `${mm}:${ss} · Focus`;
    }
  }, [isActive, mm, ss]);

  const hasExpiredRef = useRef(false);
  useEffect(() => {
    if (!isActive) {
      hasExpiredRef.current = false;
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && endsAt && now >= endsAt && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      onExpire();
    }
  }, [isActive, endsAt, now, onExpire]);

  const progress = totalSeconds > 0 ? Math.max(0, totalSeconds - leftSecs) / totalSeconds : 0;

  return (
    <FocusRing
      progress={progress}
      size={isDeskMode ? 'min(62vh, 640px)' : 'min(400px, 50vh)'}
      isBreak={isBreak}
    >
      <div className="flex flex-col items-center select-none">
        <div className="font-ui font-light text-[80px]/[84px] tabular-nums tracking-[-0.03em] text-ink">
          {mm}:{ss}
        </div>
        <div className="mt-2 text-[13px] font-medium text-ink-2 max-w-[260px] truncate">
          {taskTitle || 'No task linked'}
        </div>
      </div>
    </FocusRing>
  );
}

function DeskClockDisplay() {
  const now = useNow(1000);
  const timeStr = useMemo(() => {
    return new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [now]);

  return <span className="text-[14px] tabular-nums font-medium text-snow/90">{timeStr}</span>;
}

function safeRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function DesktopFocusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, plan } = useAuth();
  const { tasks } = usePlan();
  const todayStr = useMemo(() => localDateStr(new Date()), []);
  const todayFocusStats = useFocusStats(todayStr, todayStr);
  const todayFocusMinutes = todayFocusStats.totalMinutes;
  const todaySessionsCount = todayFocusStats.sessions;
  const refetchToday = todayFocusStats.refetch;

  // Phase: Focus | Short break | Long break
  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [currentSet, setCurrentSet] = useState(1);
  const totalSets = 4;

  // Settings
  const [focusMins, setFocusMins] = useState(25);
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);

  // Steppers for custom preset
  const [customFocusTemp, setCustomFocusTemp] = useState(25);
  const [customBreakTemp, setCustomBreakTemp] = useState(5);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // Active preset key: '25/5' | '50/10' | '90/15' | 'custom'
  const [activePreset, setActivePreset] = useState<string>('25/5');

  // Timer run state: endsAt timestamp
  const [isActive, setIsActive] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedTimeLeft, setPausedTimeLeft] = useState(25 * 60); // seconds

  // Reset tab title on unmount or when timer stops
  useEffect(() => {
    if (!isActive) {
      document.title = 'Focalyst · Plan, focus and build habits';
    }
    return () => {
      document.title = 'Focalyst · Plan, focus and build habits';
    };
  }, [isActive]);

  // Linked task
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  // Desk Mode
  const [isDeskMode, setIsDeskMode] = useState(false);
  const deskContainerRef = useRef<HTMLDivElement>(null);

  // Countdowns data
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [countdownModalOpen, setCountdownModalOpen] = useState(false);
  const [editingCountdownId, setEditingCountdownId] = useState<string | null>(null);
  const [openCountdownMenuId, setOpenCountdownMenuId] = useState<string | null>(null);

  // Sessions today list
  const [todaySessions, setTodaySessions] = useState<any[]>([]);

  // Distraction blocker switch state
  const [blockerActive, setBlockerActive] = useState(false);

  // Unique session ID for partial saving
  const currentSessionIdRef = useRef<string>(safeRandomId());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const savedRef = useRef<boolean>(false);
  const supabase = createClient();

  // Duration in seconds for current phase
  const currentPhaseTotalSeconds = useMemo(() => {
    if (phase === 'focus') return focusMins * 60;
    if (phase === 'short_break') return shortBreakMins * 60;
    return longBreakMins * 60;
  }, [phase, focusMins, shortBreakMins, longBreakMins]);



  // Fetch countdowns via useData
  const countdownsFetcher = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('countdowns')
      .select('id, user_id, title, target_date, is_active, color, icon')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('target_date', { ascending: true });
    if (error) {
      console.warn('Error fetching countdowns:', error);
      throw error;
    }
    return data || [];
  }, [user, supabase]);

  const countdownsKey = user ? `countdowns:${user.id}` : null;
  const { data: cachedCountdowns, mutate: mutateCountdowns } = useData(countdownsKey, countdownsFetcher);

  useEffect(() => {
    if (cachedCountdowns) {
      setCountdowns(cachedCountdowns);
    }
  }, [cachedCountdowns]);

  const fetchCountdowns = useCallback(async () => {
    await mutateCountdowns();
  }, [mutateCountdowns]);

  // Fetch today's pomodoro sessions list
  const fetchTodaySessions = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('pomodoro_sessions')
        .select('id, user_id, focus_minutes, break_minutes, sets_planned, sets_completed, started_at, completed_at, was_completed')
        .eq('user_id', user.id)
        .gte('started_at', `${todayStr}T00:00:00`)
        .order('started_at', { ascending: false })
        .limit(20);

      // Dedupe by id, newest first
      const seen = new Set<string>();
      const deduped: any[] = [];
      (data || []).forEach((s: any) => {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          deduped.push(s);
        }
      });
      setTodaySessions(deduped);
    } catch (err) {
      console.warn('Error fetching pomodoro sessions:', err);
    }
  }, [user, supabase, todayStr]);

  // Tracking elapsed time via timestamps + accumulated pause
  const sessionStartedAtRef = useRef<number | null>(null);
  const accumulatedElapsedMsRef = useRef<number>(0);
  const lastResumeAtRef = useRef<number | null>(null);

  // Compute live elapsed focus seconds (for focus phase)
  const getElapsedFocusSeconds = useCallback(() => {
    if (phase !== 'focus') return 0;
    let totalMs = accumulatedElapsedMsRef.current;
    if (isActive && lastResumeAtRef.current) {
      totalMs += Math.max(0, Date.now() - lastResumeAtRef.current);
    }
    return Math.floor(totalMs / 1000);
  }, [phase, isActive]);

  const [elapsedDisplaySeconds, setElapsedDisplaySeconds] = useState(0);

  useEffect(() => {
    if (phase !== 'focus') {
      setElapsedDisplaySeconds(0);
      return;
    }
    setElapsedDisplaySeconds(getElapsedFocusSeconds());
    if (!isActive) return;
    const interval = setInterval(() => {
      setElapsedDisplaySeconds(getElapsedFocusSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, phase, getElapsedFocusSeconds]);

  // Reconcile today's focus time on mount (fixes today's 0m)
  useEffect(() => {
    if (user?.id) {
      reconcileDailyFocus(todayStr, user.id).then(() => {
        refetchToday();
        fetchTodaySessions();
      });
    }
  }, [user?.id, todayStr, refetchToday, fetchTodaySessions]);

  useEffect(() => {
    fetchCountdowns();
    fetchTodaySessions();

    const handleFocusUpdated = () => {
      fetchTodaySessions();
      refetchToday();
    };

    window.addEventListener('fx:focus-updated', handleFocusUpdated);
    window.addEventListener('focalyst:focus-updated', handleFocusUpdated);
    const unsub = onDataChanged(['focus', 'countdown'], () => {
      fetchTodaySessions();
      refetchToday();
      fetchCountdowns();
    });

    const handleFocus = () => {
      fetchTodaySessions();
      refetchToday();
      fetchCountdowns();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('fx:focus-updated', handleFocusUpdated);
      window.removeEventListener('focalyst:focus-updated', handleFocusUpdated);
      window.removeEventListener('focus', handleFocus);
      unsub();
    };
  }, [fetchCountdowns, fetchTodaySessions, refetchToday]);

  // Save current focus block if elapsed >= 60s
  const saveCurrentFocusBlock = useCallback(async (): Promise<number> => {
    if (phase !== 'focus' || savedRef.current) return 0;
    const elapsedSecs = getElapsedFocusSeconds();
    if (elapsedSecs >= 60) {
      savedRef.current = true;
      const elapsedMins = Math.floor(elapsedSecs / 60);
      const linkedTask = tasks.find((t) => t.id === linkedTaskId);
      const startedAt = sessionStartedAtRef.current || sessionStartTimeRef.current;
      await recordFocusSession({
        id: currentSessionIdRef.current,
        startedAt,
        minutes: elapsedMins,
        taskId: linkedTaskId || null,
        taskTitle: linkedTask?.title || null,
      });
      fetchTodaySessions();
      refetchToday();
      return elapsedMins;
    }
    return 0;
  }, [phase, getElapsedFocusSeconds, tasks, linkedTaskId, fetchTodaySessions, refetchToday]);

  // Reset session timing refs
  const resetSessionTiming = useCallback(() => {
    savedRef.current = false;
    sessionStartTimeRef.current = Date.now();
    sessionStartedAtRef.current = null;
    accumulatedElapsedMsRef.current = 0;
    lastResumeAtRef.current = null;
    currentSessionIdRef.current = safeRandomId();
    setElapsedDisplaySeconds(0);
  }, []);

  // Write pending session record every 15s
  useEffect(() => {
    if (!isActive || phase !== 'focus') return;
    const interval = setInterval(() => {
      const remainingSecs = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : pausedTimeLeft;
      const elapsedSecs = Math.max(0, currentPhaseTotalSeconds - remainingSecs);
      const elapsedMins = Math.floor(elapsedSecs / 60);
      try {
        localStorage.setItem(
          'fx-pending-focus',
          JSON.stringify({
            id: currentSessionIdRef.current,
            startedAt: sessionStartTimeRef.current,
            elapsedMinutes: elapsedMins,
            mode: 'focus',
            dateStr: localDateStr(new Date()),
          })
        );
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [isActive, phase, currentPhaseTotalSeconds, endsAt, pausedTimeLeft]);

  // Save on unmount / route change
  useEffect(() => {
    return () => {
      saveCurrentFocusBlock();
    };
  }, [saveCurrentFocusBlock]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveCurrentFocusBlock();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveCurrentFocusBlock]);

  // Handle timer phase expiration
  const handleTimeUp = useCallback(() => {
    saveCurrentFocusBlock();

    if (phase === 'focus') {
      if (currentSet < totalSets) {
        setPhase('short_break');
        setPausedTimeLeft(shortBreakMins * 60);
      } else {
        setPhase('long_break');
        setPausedTimeLeft(longBreakMins * 60);
      }
    } else {
      if (phase === 'long_break') {
        setCurrentSet(1);
      } else {
        setCurrentSet((s) => s + 1);
      }
      setPhase('focus');
      setPausedTimeLeft(focusMins * 60);
    }
    setIsActive(false);
    setEndsAt(null);
    savedRef.current = false;
    sessionStartTimeRef.current = Date.now();
    currentSessionIdRef.current = safeRandomId();
  }, [
    saveCurrentFocusBlock,
    phase,
    currentSet,
    totalSets,
    shortBreakMins,
    longBreakMins,
    focusMins,
  ]);

  // Auto-start from URL param ?start=1
  useEffect(() => {
    if (searchParams.get('start') === '1') {
      const now = Date.now();
      const currentDuration = pausedTimeLeft > 0 ? pausedTimeLeft : currentPhaseTotalSeconds;
      setEndsAt(now + currentDuration * 1000);
      setIsActive(true);
      sessionStartTimeRef.current = now;
      savedRef.current = false;
      currentSessionIdRef.current = safeRandomId();
    }
  }, [searchParams, currentPhaseTotalSeconds, pausedTimeLeft]);

  // Start / Pause
  const toggleStartPause = () => {
    if (!isActive) {
      const now = Date.now();
      const currentDuration = pausedTimeLeft > 0 ? pausedTimeLeft : currentPhaseTotalSeconds;
      setEndsAt(now + currentDuration * 1000);
      if (!sessionStartedAtRef.current) {
        sessionStartedAtRef.current = now;
      }
      lastResumeAtRef.current = now;
      setIsActive(true);
    } else {
      // Pausing
      if (endsAt) {
        const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        setPausedTimeLeft(remaining);
      }
      if (lastResumeAtRef.current) {
        accumulatedElapsedMsRef.current += Math.max(0, Date.now() - lastResumeAtRef.current);
        lastResumeAtRef.current = null;
      }
      setEndsAt(null);
      setIsActive(false);
    }
  };

  // Reset timer
  const handleReset = async () => {
    await saveCurrentFocusBlock();
    setIsActive(false);
    setEndsAt(null);
    setPausedTimeLeft(currentPhaseTotalSeconds);
    resetSessionTiming();
  };

  // Skip block
  const handleSkip = async () => {
    await saveCurrentFocusBlock();
    setIsActive(false);
    setEndsAt(null);
    resetSessionTiming();
    if (phase === 'focus') {
      if (currentSet < totalSets) {
        setPhase('short_break');
        setPausedTimeLeft(shortBreakMins * 60);
      } else {
        setPhase('long_break');
        setPausedTimeLeft(longBreakMins * 60);
      }
    } else {
      if (phase === 'long_break') {
        setCurrentSet(1);
      } else {
        setCurrentSet((s) => s + 1);
      }
      setPhase('focus');
      setPausedTimeLeft(focusMins * 60);
    }
  };

  // End session: save elapsed focus minutes (if >= 1 min), stop cycle, go back to idle Focus session 1
  const handleEndSession = async () => {
    setIsActive(false);
    setEndsAt(null);
    if (lastResumeAtRef.current) {
      accumulatedElapsedMsRef.current += Math.max(0, Date.now() - lastResumeAtRef.current);
      lastResumeAtRef.current = null;
    }
    const savedMins = await saveCurrentFocusBlock();
    if (savedMins >= 1) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('fx:toast', {
            detail: { message: `Saved ${savedMins} min of focus`, type: 'success' },
          })
        );
      }
    }
    setPhase('focus');
    setCurrentSet(1);
    setPausedTimeLeft(focusMins * 60);
    resetSessionTiming();
  };

  // Phase switch
  const handlePhaseChange = async (newPhase: PomodoroPhase) => {
    if (newPhase === phase) return;
    await saveCurrentFocusBlock();
    setPhase(newPhase);
    setIsActive(false);
    setEndsAt(null);
    resetSessionTiming();

    if (newPhase === 'focus') setPausedTimeLeft(focusMins * 60);
    else if (newPhase === 'short_break') setPausedTimeLeft(shortBreakMins * 60);
    else setPausedTimeLeft(longBreakMins * 60);
  };

  // Keyboard Desk Mode & Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isInput) return;

      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleDeskMode();
      }

      if (e.code === 'Space' && isDeskMode) {
        e.preventDefault();
        toggleStartPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeskMode, isActive, endsAt, pausedTimeLeft]);

  // Fullscreen Desk Mode
  const toggleDeskMode = async () => {
    try {
      if (!document.fullscreenElement) {
        if (deskContainerRef.current) {
          await deskContainerRef.current.requestFullscreen();
          setIsDeskMode(true);
        }
      } else {
        await document.exitFullscreen();
        setIsDeskMode(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsDeskMode(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Linked task title
  const currentLinkedTask = tasks.find((t) => t.id === linkedTaskId);

  // Incomplete tasks for picker
  const incompleteTasks = useMemo(() => {
    return (tasks || []).filter((t) => !t.is_completed);
  }, [tasks]);

  // User focus level derived from total_xp (source of truth)
  const userLevel = useMemo(() => {
    return getLevelFromXp((profile as any)?.total_xp || 0).level;
  }, [profile]);

  // Apply custom preset
  const applyCustomPreset = () => {
    setFocusMins(customFocusTemp);
    setShortBreakMins(customBreakTemp);
    setActivePreset('custom');
    if (phase === 'focus') setPausedTimeLeft(customFocusTemp * 60);
    else if (phase === 'short_break') setPausedTimeLeft(customBreakTemp * 60);
    setIsActive(false);
    setEndsAt(null);
    setCustomPopoverOpen(false);
  };

  // The onboarding plan's rhythm, selected once (7.1). 25/5 is already the default; 45/10 and 60/15 are Pro custom timers.
  useEffect(() => {
    if (!profile || isActive) return;
    const p = takeRecommendedPreset(isPaidPlan(plan));
    if (!p || p.focusMinutes === 25) return;
    setFocusMins(p.focusMinutes);
    setShortBreakMins(p.breakMinutes);
    setCustomFocusTemp(p.focusMinutes);
    setCustomBreakTemp(p.breakMinutes);
    setActivePreset('custom');
    if (phase === 'focus') setPausedTimeLeft(p.focusMinutes * 60);
    // Runs when the profile arrives, so the plan check uses the real plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleSelectPreset = (focus: number, brk: number, key: string) => {
    setFocusMins(focus);
    setShortBreakMins(brk);
    setActivePreset(key);
    if (phase === 'focus') setPausedTimeLeft(focus * 60);
    else if (phase === 'short_break') setPausedTimeLeft(brk * 60);
    setIsActive(false);
    setEndsAt(null);
  };

  // Countdowns sorting & calculations
  const parsedCountdowns = useMemo(() => {
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0).getTime();

    return countdowns.map((c) => {
      const targetNoon = parseYMDToLocalNoon(c.target_date).getTime();
      const diffMs = targetNoon - todayNoon;
      const daysLeft = Math.round(diffMs / 86400000);
      const isPast = daysLeft < 0;

      // Progress bar from created date to target date
      const createdDate = c.created_at ? new Date(c.created_at) : new Date(todayNoon - 86400000 * 30);
      const totalSpan = Math.max(1, targetNoon - createdDate.getTime());
      const elapsed = Math.max(0, todayNoon - createdDate.getTime());
      const progressPct = Math.min(100, Math.round((elapsed / totalSpan) * 100));

      const formattedTarget = new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(parseYMDToLocalNoon(c.target_date));

      return {
        ...c,
        daysLeft,
        isPast,
        progressPct,
        formattedTarget,
      };
    }).sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      return a.daysLeft - b.daysLeft;
    });
  }, [countdowns]);

  const handleDeleteCountdown = async (id: string) => {
    if (confirm('Delete this countdown?')) {
      await supabase.from('countdowns').delete().eq('id', id);
      fetchCountdowns();
    }
  };

  // Total session minutes today for header
  const totalSessionTimeFormatted = useMemo(() => {
    const hours = Math.floor(todayFocusMinutes / 60);
    const m = todayFocusMinutes % 60;
    if (hours > 0) return `${hours}h ${m}m`;
    return `${m}m`;
  }, [todayFocusMinutes]);

  return (
    <div ref={deskContainerRef} className="w-full relative min-h-screen">
      {/* Ambient background for desk mode */}
      {isDeskMode && <AmbientBackground />}

      {/* Desk mode header bar */}
      {isDeskMode && (
        <div className="fixed top-6 left-8 right-8 z-50 flex items-center justify-between text-snow/80">
          <span className="text-[14px] font-semibold tracking-[0.2em] uppercase">FOCALYST · DESK</span>
          <div className="flex items-center gap-4">
            <DeskClockDisplay />
            <button
              type="button"
              onClick={toggleDeskMode}
              className="text-snow/70 hover:text-snow text-[13px] font-medium"
            >
              Exit (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid: xl (>=1280): 12 cols, gap 20. lg (1024-1279): Stage full width, cards 2 cols */}
      <div
        className={`w-full grid gap-5 ${
          isDeskMode
            ? 'flex flex-col items-center justify-center min-h-screen p-8 z-40 relative'
            : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* =========================================================================
            STAGE (col-span-7 row-span-3 on xl, lg full width)
            ========================================================================= */}
        <div
          className={`${
            isDeskMode
              ? 'w-full max-w-2xl flex flex-col items-center justify-center'
              : 'lg:col-span-12 xl:col-span-7 xl:row-span-3 frost rounded-[28px] p-7 min-h-[640px] flex flex-col items-center justify-between'
          }`}
        >
          {/* Top Row: phase SegmentedControl centred, Maximize2 right */}
          <div className="w-full flex items-center justify-between relative">
            <div className="w-10" />
            <SegmentedControl<PomodoroPhase>
              value={phase}
              onChange={handlePhaseChange}
              options={[
                { label: 'Focus', value: 'focus' },
                { label: 'Short break', value: 'short_break' },
                { label: 'Long break', value: 'long_break' },
              ]}
            />
            <IconButton
              size="sm"
              variant="ghost"
              tooltip="Desk mode F"
              onClick={toggleDeskMode}
              aria-label="Toggle Desk Mode"
            >
              <Maximize2 size={16} />
            </IconButton>
          </div>

          {/* Micro label mt 20 */}
          <div className="mt-5 text-[11px] font-semibold tracking-[0.14em] uppercase text-ink-3">
            {phase === 'focus'
              ? `SESSION ${currentSet} OF ${totalSets}`
              : phase === 'short_break'
              ? 'SHORT BREAK'
              : 'LONG BREAK'}
          </div>

          {/* FocusTimerWidget in center: isolates ticker re-renders */}
          <div className="my-auto py-6">
            <FocusTimerWidget
              endsAt={endsAt}
              pausedTimeLeft={pausedTimeLeft}
              isActive={isActive}
              totalSeconds={currentPhaseTotalSeconds}
              isBreak={phase !== 'focus'}
              isDeskMode={isDeskMode}
              taskTitle={currentLinkedTask?.title}
              onExpire={handleTimeUp}
            />
          </div>

          {/* Controls Row: Reset (48 ghost), Start/Pause (72 primary), End (48 ghost), Skip (48 ghost) */}
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={handleReset}
                title="Reset timer"
                aria-label="Reset timer"
                className="h-12 w-12 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <RotateCcw size={20} />
              </button>

              <button
                type="button"
                onClick={toggleStartPause}
                title={isActive ? 'Pause' : 'Start'}
                aria-label={isActive ? 'Pause timer' : 'Start timer'}
                className="h-[72px] w-[72px] rounded-full bg-primary hover:bg-primary-hover text-snow flex items-center justify-center shadow-[0_10px_30px_rgba(25,81,252,0.45)] transition-transform active:scale-95 cursor-pointer"
              >
                {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>

              <button
                type="button"
                onClick={handleEndSession}
                title="End session"
                aria-label="End session"
                className="h-12 w-12 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <Square size={20} />
              </button>

              <button
                type="button"
                onClick={handleSkip}
                title="Skip block"
                aria-label="Skip block"
                className="h-12 w-12 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Under controls while running/paused: 12px text-ink-3 "X min will be saved" */}
            {phase === 'focus' && (isActive || elapsedDisplaySeconds >= 60) && (
              <span className="text-[12px] font-medium text-ink-3 tabular-nums">
                {Math.floor(elapsedDisplaySeconds / 60)} min will be saved
              </span>
            )}
          </div>

          {/* Task picker: custom Popover select, width 340, radius 9999 */}
          <div className="mt-5">
            <Popover
              open={taskPickerOpen}
              onOpenChange={setTaskPickerOpen}
              align="center"
              trigger={
                <button
                  type="button"
                  className="h-10 px-4 rounded-full bg-surface-2 border border-line text-[13px] text-ink flex items-center justify-between gap-3 w-[340px] max-w-full hover:border-line-strong transition-colors cursor-pointer"
                >
                  <span className="truncate">
                    {currentLinkedTask ? currentLinkedTask.title : 'What are you working on?'}
                  </span>
                  <ChevronDown size={14} className="text-ink-3 shrink-0" />
                </button>
              }
            >
              <div className="w-[340px] max-h-[220px] overflow-y-auto p-1.5 rounded-[16px] glass-strong flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setLinkedTaskId('');
                    setTaskPickerOpen(false);
                  }}
                  className={`h-9 px-3 rounded-[10px] text-[13px] text-left transition-colors ${
                    !linkedTaskId ? 'bg-primary text-snow font-semibold' : 'text-ink-3 hover:bg-surface-2'
                  }`}
                >
                  No task linked
                </button>
                {incompleteTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setLinkedTaskId(t.id);
                      setTaskPickerOpen(false);
                    }}
                    className={`h-9 px-3 rounded-[10px] text-[13px] text-left truncate transition-colors ${
                      linkedTaskId === t.id
                        ? 'bg-primary text-snow font-semibold'
                        : 'text-ink hover:bg-surface-2'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </Popover>
          </div>
        </div>

        {/* Hide right column and countdowns in desk mode */}
        {!isDeskMode && (
          <>
            {/* =========================================================================
                CARD 1: TODAY (col-span-5)
                ========================================================================= */}
            <div className="lg:col-span-6 xl:col-span-5 frost rounded-[20px] p-6 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                    TODAY
                  </span>
                  <div className="text-[48px]/[52px] font-semibold tabular-nums text-ink mt-1">
                    {todayFocusMinutes}m
                  </div>
                  <span className="text-[13px] text-ink-2">of 3h goal</span>
                </div>

                <div className="flex flex-col items-end gap-1 pt-1">
                  <span className="text-[13px] font-semibold tabular-nums text-ink">
                    {todaySessionsCount} sessions
                  </span>
                  <span className="text-[12px] font-medium text-ink-3">Level {userLevel}</span>
                </div>
              </div>

              {/* 6px progress bar */}
              <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden mt-6">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((todayFocusMinutes / 180) * 100))}%`,
                    background: 'linear-gradient(90deg, #3781FC, #1951FC)',
                  }}
                />
              </div>
            </div>

            {/* =========================================================================
                CARD 2: PRESETS (col-span-5)
                ========================================================================= */}
            <div className="lg:col-span-6 xl:col-span-5 frost rounded-[20px] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3 block mb-3">
                  PRESETS
                </span>

                {/* 4 identical pills: 25/5, 50/10, 90/15, Custom */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: '25/5', focus: 25, brk: 5 },
                    { key: '50/10', focus: 50, brk: 10 },
                    { key: '90/15', focus: 90, brk: 15 },
                  ].map((p) => {
                    const isActivePill = activePreset === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handleSelectPreset(p.focus, p.brk, p.key)}
                        className={`relative h-16 w-full rounded-2xl flex flex-col items-center justify-center transition-all ${
                          isActivePill ? 'fx-active-pill' : 'bg-surface-2 hover:bg-surface-2/80'
                        }`}
                      >
                        <span className="text-[18px]/[22px] font-semibold tabular-nums text-ink">
                          {p.focus}
                        </span>
                        <span className="text-[11px] text-ink-3">{p.brk} min break</span>
                      </button>
                    );
                  })}

                  {/* Custom Preset Pill */}
                  <Popover
                    open={customPopoverOpen}
                    onOpenChange={setCustomPopoverOpen}
                    align="end"
                    trigger={
                      <button
                        type="button"
                        className={`relative h-16 w-full rounded-2xl flex flex-col items-center justify-center transition-all ${
                          activePreset === 'custom'
                            ? 'fx-active-pill'
                            : 'bg-surface-2 hover:bg-surface-2/80'
                        }`}
                      >
                        {activePreset === 'custom' ? (
                          <>
                            <span className="text-[18px]/[22px] font-semibold tabular-nums text-ink">
                              {focusMins}
                            </span>
                            <span className="text-[11px] text-ink-3">
                              {shortBreakMins} min break
                            </span>
                          </>
                        ) : (
                          <>
                            <Settings2 size={16} className="text-ink-2 mb-1" />
                            <span className="text-[13px] font-medium text-ink">Custom</span>
                          </>
                        )}
                      </button>
                    }
                  >
                    <div className="w-56 p-4 rounded-[18px] glass-strong flex flex-col gap-3">
                      <span className="text-[13px] font-semibold text-ink">Custom timer</span>
                      <div>
                        <label className="block text-[11px] font-medium text-ink-3 mb-1">
                          Focus minutes
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={180}
                          value={customFocusTemp}
                          onChange={(e) => setCustomFocusTemp(Number(e.target.value))}
                          className="w-full h-8 px-2.5 rounded-[8px] bg-surface-2 border border-line text-[13px] text-ink outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-ink-3 mb-1">
                          Break minutes
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={customBreakTemp}
                          onChange={(e) => setCustomBreakTemp(Number(e.target.value))}
                          className="w-full h-8 px-2.5 rounded-[8px] bg-surface-2 border border-line text-[13px] text-ink outline-none"
                        />
                      </div>
                      <Button size="sm" variant="primary" onClick={applyCustomPreset} className="w-full mt-1">
                        Apply
                      </Button>
                    </div>
                  </Popover>
                </div>
              </div>
            </div>

            {/* =========================================================================
                CARD 3: SESSIONS TODAY (col-span-5)
                ========================================================================= */}
            <div className="lg:col-span-6 xl:col-span-5 frost rounded-[20px] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-line mb-3">
                  <h3 className="text-[15px] font-semibold text-ink">Sessions today</h3>
                  <span className="text-[13px] font-semibold tabular-nums text-ink-2">
                    {totalSessionTimeFormatted}
                  </span>
                </div>

                <div className="max-h-[220px] overflow-y-auto flex flex-col gap-1.5">
                  {todaySessions.length === 0 ? (
                    <p className="text-[13px] text-ink-3 py-6 text-center">No sessions yet today.</p>
                  ) : (
                    todaySessions.map((s) => {
                      const start = new Date(s.started_at);
                      const timeStr = start.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const linked = tasks.find((t) => t.id === s.task_id);
                      const title = linked ? linked.title : 'Focus session';

                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between h-9 px-2.5 rounded-[10px] bg-surface-2/60 text-[13px]"
                        >
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            <span className="text-[12px] tabular-nums text-ink-3 shrink-0">
                              {timeStr}
                            </span>
                            <span className="text-ink-2 truncate">{title}</span>
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums text-ink shrink-0 ml-2">
                            {s.focus_minutes}m
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* =========================================================================
                ROW 2: COUNTDOWNS (col-span-8)
                ========================================================================= */}
            <div id="countdowns" className="lg:col-span-12 xl:col-span-8 frost rounded-[20px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-semibold text-ink">Countdowns</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingCountdownId(null);
                    setCountdownModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </Button>
              </div>

              <PendingCountdownCard className="mb-4" />

              {parsedCountdowns.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                  <p className="text-[14px] text-ink-2">Add a date that matters.</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCountdownId(null);
                      setCountdownModalOpen(true);
                    }}
                  >
                    + Add
                  </Button>
                </div>
              ) : (                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {parsedCountdowns.map((c, idx) => {
                    const isNearestUpcoming = idx === 0 && !c.isPast;
                    const daysLabel =
                      c.daysLeft === 0
                        ? 'TODAY'
                        : c.daysLeft === 1
                        ? 'TOMORROW'
                        : c.isPast
                        ? 'PASSED'
                        : 'DAYS LEFT';

                    return (
                      <div
                        key={c.id}
                        className={`rounded-[20px] p-5 min-h-[120px] flex justify-between relative shadow-sm transition-all overflow-hidden ${
                          isNearestUpcoming
                            ? 'text-snow shadow-md'
                            : 'frost text-ink'
                        }`}
                        style={
                          isNearestUpcoming
                            ? {
                                background:
                                  'radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 45%, #03195B 100%)',
                              }
                            : undefined
                        }
                      >
                        {/* Left: days left */}
                        <div className="flex flex-col justify-between">
                          <span
                            className={`text-[44px] font-semibold tabular-nums tracking-[-0.03em] leading-none ${
                              isNearestUpcoming ? 'text-snow' : 'text-ink'
                            }`}
                          >
                            {c.isPast ? 0 : c.daysLeft}
                          </span>
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-[0.1em] mt-1 ${
                              isNearestUpcoming ? 'text-snow/70' : 'text-ink-3'
                            }`}
                          >
                            {daysLabel}
                          </span>
                        </div>

                        {/* Right: title, date, progress bar + options menu */}
                        <div className="flex flex-col justify-between items-end text-right min-w-0 max-w-[55%]">
                          <div className="flex items-start justify-end gap-1.5 w-full min-w-0">
                            <span
                              title={c.event_name}
                              className={`text-[15px] font-semibold truncate ${
                                isNearestUpcoming ? 'text-snow' : 'text-ink'
                              }`}
                            >
                              {c.event_name}
                            </span>

                            {/* Options menu */}
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenCountdownMenuId(openCountdownMenuId === c.id ? null : c.id)
                                }
                                className={`h-6 w-6 rounded-[6px] flex items-center justify-center transition-colors ${
                                  isNearestUpcoming
                                    ? 'text-snow/70 hover:text-snow hover:bg-snow/10'
                                    : 'text-ink-3 hover:text-ink hover:bg-surface-2'
                                }`}
                              >
                                <MoreVertical size={14} />
                              </button>
                              {openCountdownMenuId === c.id && (
                                <div className="absolute right-0 top-full mt-1 w-28 p-1 rounded-[10px] glass-strong shadow-lg z-20 flex flex-col gap-0.5 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenCountdownMenuId(null);
                                      setEditingCountdownId(c.id);
                                      setCountdownModalOpen(true);
                                    }}
                                    className="h-7 px-2 rounded-[6px] text-[12px] text-left text-ink hover:bg-surface-2"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenCountdownMenuId(null);
                                      handleDeleteCountdown(c.id);
                                    }}
                                    className="h-7 px-2 rounded-[6px] text-[12px] text-left text-danger hover:bg-danger/10"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="w-full flex flex-col items-end">
                            <span
                              className={`text-[13px] tabular-nums mt-0.5 ${
                                isNearestUpcoming ? 'text-snow/70' : 'text-ink-2'
                              }`}
                            >
                              {c.formattedTarget}
                            </span>

                            {/* 4px Progress bar */}
                            <div
                              className={`h-1 w-28 rounded-full overflow-hidden mt-3 ${
                                isNearestUpcoming ? 'bg-snow/20' : 'bg-surface-2'
                              }`}
                            >
                              <div
                                className={`h-full rounded-full ${
                                  isNearestUpcoming ? 'bg-snow' : 'bg-primary'
                                }`}
                                style={{ width: `${c.progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* =========================================================================
                ROW 2: DISTRACTION BLOCKER (col-span-4)
                ========================================================================= */}
            <div className="lg:col-span-12 xl:col-span-4 frost rounded-[20px] p-6 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-[12px] bg-primary-soft text-primary-text flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-ink">Distraction blocker</h4>
                  <p className="text-[13px] text-ink-2 mt-0.5">Stay focused during your blocks</p>
                  <Link
                    href="/how-to/block-distracting-apps"
                    className="mt-1 inline-block text-[13px] font-medium text-primary-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    How blocking works
                  </Link>
                </div>
              </div>

              <Switch
                checked={blockerActive}
                onChange={setBlockerActive}
                aria-label="Toggle distraction blocker"
              />
            </div>
          </>
        )}
      </div>

      {/* Countdown Form Modal */}
      <Modal
        isOpen={countdownModalOpen}
        onClose={() => {
          setCountdownModalOpen(false);
          setEditingCountdownId(null);
          fetchCountdowns();
        }}
        size="sm"
        title={editingCountdownId ? 'Edit countdown' : 'New countdown'}
      >
        {user && (
          <CountdownForm
            id={editingCountdownId || undefined}
            userId={user.id}
            userPlan={plan || 'free'}
            navigateAfterSave={false}
            onSaved={() => {
              emitDataChanged('countdown');
              setCountdownModalOpen(false);
              setEditingCountdownId(null);
              fetchCountdowns();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

export default DesktopFocusPage;
