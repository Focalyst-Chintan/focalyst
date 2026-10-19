'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  Maximize2,
  ChevronDown,
  ShieldCheck,
  Plus,
  MoreVertical,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { localDateStr } from '@/lib/utils/date';
import { getLevelFromMinutes } from '@/lib/utils/levels';
import { recordFocusSession } from '@/lib/focus/recordFocusSession';
import { useFocusToday } from '@/hooks/useFocusToday';
import { FocusOrb } from './FocusOrb';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Button } from '@/components/desktop/ui/Button';
import { Popover } from '@/components/desktop/ui/Popover';
import { Modal } from '@/components/desktop/ui/Modal';
import { Switch } from '@/components/desktop/ui/Switch';
import CountdownForm from '@/components/focus/CountdownForm';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { Countdown } from '@/types';

type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

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
  const { user, plan } = useAuth();
  const { tasks } = usePlan();
  const supabase = createClient();
  const { minutes: todayFocusMinutes, sessionsCount: todaySessionsCount, refetch: refetchToday } =
    useFocusToday();

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

  // Timer run state
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  // Linked task
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  // Desk Mode
  const [isDeskMode, setIsDeskMode] = useState(false);
  const deskContainerRef = useRef<HTMLDivElement>(null);
  const [localClockTime, setLocalClockTime] = useState('');

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

  const todayStr = useMemo(() => localDateStr(new Date()), []);

  // Duration in seconds for current phase
  const currentPhaseTotalSeconds = useMemo(() => {
    if (phase === 'focus') return focusMins * 60;
    if (phase === 'short_break') return shortBreakMins * 60;
    return longBreakMins * 60;
  }, [phase, focusMins, shortBreakMins, longBreakMins]);

  // Desk mode clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalClockTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch countdowns
  const fetchCountdowns = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('countdowns')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('target_date', { ascending: true });
      setCountdowns(data || []);
    } catch (err) {
      console.warn('Error fetching countdowns:', err);
    }
  }, [user, supabase]);

  // Fetch today's pomodoro sessions list
  const fetchTodaySessions = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('pomodoro_sessions')
        .select('*')
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

  useEffect(() => {
    fetchCountdowns();
    fetchTodaySessions();

    const handleFocusUpdated = () => {
      fetchTodaySessions();
      refetchToday();
    };

    window.addEventListener('fx:focus-updated', handleFocusUpdated);
    window.addEventListener('focalyst:focus-updated', handleFocusUpdated);

    return () => {
      window.removeEventListener('fx:focus-updated', handleFocusUpdated);
      window.removeEventListener('focalyst:focus-updated', handleFocusUpdated);
    };
  }, [fetchCountdowns, fetchTodaySessions, refetchToday]);

  // Save current focus block if elapsed >= 60s
  const saveCurrentFocusBlock = useCallback(async () => {
    if (phase !== 'focus' || savedRef.current) return;
    const elapsedSecs = Math.max(0, currentPhaseTotalSeconds - timeLeft);
    if (elapsedSecs >= 60) {
      savedRef.current = true;
      const elapsedMins = Math.floor(elapsedSecs / 60);
      const linkedTask = tasks.find((t) => t.id === linkedTaskId);
      await recordFocusSession({
        id: currentSessionIdRef.current,
        startedAt: sessionStartTimeRef.current,
        minutes: elapsedMins,
        taskId: linkedTaskId || null,
        taskTitle: linkedTask?.title || null,
      });
      fetchTodaySessions();
      refetchToday();
    }
  }, [phase, currentPhaseTotalSeconds, timeLeft, tasks, linkedTaskId, fetchTodaySessions, refetchToday]);

  // Write pending session record every 15s
  useEffect(() => {
    if (!isActive || phase !== 'focus') return;
    const interval = setInterval(() => {
      const elapsedSecs = Math.max(0, currentPhaseTotalSeconds - timeLeft);
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
  }, [isActive, phase, currentPhaseTotalSeconds, timeLeft]);

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

  // Auto-start from URL param ?start=1
  useEffect(() => {
    if (searchParams.get('start') === '1') {
      setIsActive(true);
      sessionStartTimeRef.current = Date.now();
      savedRef.current = false;
      currentSessionIdRef.current = safeRandomId();
    }
  }, [searchParams]);

  // Timer countdown tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft <= 0) {
      // Natural block completion
      saveCurrentFocusBlock();

      if (phase === 'focus') {
        if (currentSet < totalSets) {
          setPhase('short_break');
          setTimeLeft(shortBreakMins * 60);
        } else {
          setPhase('long_break');
          setTimeLeft(longBreakMins * 60);
        }
      } else {
        // Break ended
        if (phase === 'long_break') {
          setCurrentSet(1);
        } else {
          setCurrentSet((s) => s + 1);
        }
        setPhase('focus');
        setTimeLeft(focusMins * 60);
      }
      setIsActive(false);
      savedRef.current = false;
      sessionStartTimeRef.current = Date.now();
      currentSessionIdRef.current = safeRandomId();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isActive,
    timeLeft,
    phase,
    currentSet,
    totalSets,
    focusMins,
    shortBreakMins,
    longBreakMins,
    saveCurrentFocusBlock,
  ]);

  // Reset timer
  const handleReset = async () => {
    await saveCurrentFocusBlock();
    setIsActive(false);
    setTimeLeft(currentPhaseTotalSeconds);
    savedRef.current = false;
    sessionStartTimeRef.current = Date.now();
    currentSessionIdRef.current = safeRandomId();
  };

  // Skip block
  const handleSkip = async () => {
    await saveCurrentFocusBlock();
    setIsActive(false);
    if (phase === 'focus') {
      if (currentSet < totalSets) {
        setPhase('short_break');
        setTimeLeft(shortBreakMins * 60);
      } else {
        setPhase('long_break');
        setTimeLeft(longBreakMins * 60);
      }
    } else {
      if (phase === 'long_break') {
        setCurrentSet(1);
      } else {
        setCurrentSet((s) => s + 1);
      }
      setPhase('focus');
      setTimeLeft(focusMins * 60);
    }
    savedRef.current = false;
    sessionStartTimeRef.current = Date.now();
    currentSessionIdRef.current = safeRandomId();
  };

  // Phase switch
  const handlePhaseChange = async (newPhase: PomodoroPhase) => {
    if (newPhase === phase) return;
    await saveCurrentFocusBlock();
    setPhase(newPhase);
    setIsActive(false);
    savedRef.current = false;
    sessionStartTimeRef.current = Date.now();
    currentSessionIdRef.current = safeRandomId();

    if (newPhase === 'focus') setTimeLeft(focusMins * 60);
    else if (newPhase === 'short_break') setTimeLeft(shortBreakMins * 60);
    else setTimeLeft(longBreakMins * 60);
  };

  // Start / Pause
  const toggleStartPause = () => {
    if (!isActive) {
      if (timeLeft <= 0) {
        setTimeLeft(currentPhaseTotalSeconds);
      }
      sessionStartTimeRef.current = Date.now();
      savedRef.current = false;
      currentSessionIdRef.current = safeRandomId();
      setIsActive(true);
    } else {
      setIsActive(false);
    }
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
  }, [isDeskMode, isActive, timeLeft]);

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

  // Format time MM:SS
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Time remaining fraction for Orb progress
  const remainingProgress = currentPhaseTotalSeconds > 0 ? timeLeft / currentPhaseTotalSeconds : 0;

  // Linked task title
  const currentLinkedTask = tasks.find((t) => t.id === linkedTaskId);

  // Incomplete tasks for picker
  const incompleteTasks = useMemo(() => {
    return (tasks || []).filter((t) => !t.is_completed);
  }, [tasks]);

  // User focus level
  const userLevel = useMemo(() => {
    return getLevelFromMinutes(todayFocusMinutes);
  }, [todayFocusMinutes]);

  // Apply custom preset
  const applyCustomPreset = () => {
    setFocusMins(customFocusTemp);
    setShortBreakMins(customBreakTemp);
    setActivePreset('custom');
    if (phase === 'focus') setTimeLeft(customFocusTemp * 60);
    else if (phase === 'short_break') setTimeLeft(customBreakTemp * 60);
    setIsActive(false);
    setCustomPopoverOpen(false);
  };

  const handleSelectPreset = (focus: number, brk: number, key: string) => {
    setFocusMins(focus);
    setShortBreakMins(brk);
    setActivePreset(key);
    if (phase === 'focus') setTimeLeft(focus * 60);
    else if (phase === 'short_break') setTimeLeft(brk * 60);
    setIsActive(false);
  };

  // Countdowns sorting & calculations
  const parsedCountdowns = useMemo(() => {
    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);

    return countdowns.map((c) => {
      const [y, m, d] = c.target_date.split('-').map(Number);
      const targetMid = new Date(y, m - 1, d, 0, 0, 0);
      const diffMs = targetMid.getTime() - todayMid.getTime();
      const daysLeft = Math.ceil(diffMs / 86400000);
      const isPast = daysLeft < 0;

      // Progress bar from created date to target date
      const createdDate = c.created_at ? new Date(c.created_at) : new Date(todayMid.getTime() - 86400000 * 30);
      const totalSpan = Math.max(1, targetMid.getTime() - createdDate.getTime());
      const elapsed = Math.max(0, todayMid.getTime() - createdDate.getTime());
      const progressPct = Math.min(100, Math.round((elapsed / totalSpan) * 100));

      return {
        ...c,
        daysLeft,
        isPast,
        progressPct,
        formattedTarget: targetMid.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
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
            <span className="text-[14px] tabular-nums font-medium text-snow/90">{localClockTime}</span>
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

          {/* FocusOrb in center: size = min(440px, 52vh) on desktop, min(60vh, 640px) in desk mode */}
          <div className="my-auto py-6">
            <FocusOrb
              progress={remainingProgress}
              size={isDeskMode ? 'min(60vh, 580px)' : 'min(440px, 50vh)'}
              isRunning={isActive}
            >
              <div className="flex flex-col items-center select-none">
                <div
                  className="font-ui font-light text-[80px]/[84px] tabular-nums tracking-[-0.03em] text-snow"
                  style={{ textShadow: '0 2px 24px rgba(3,25,91,0.6)' }}
                >
                  {timeString}
                </div>
                <div className="mt-2 text-[14px] font-medium text-snow/70 max-w-[260px] truncate">
                  {currentLinkedTask?.title || 'No task linked'}
                </div>
              </div>
            </FocusOrb>
          </div>

          {/* Controls Row mt 28: Reset 48 ghost circle, Start/Pause 72 primary circle with glow, Skip 48 ghost circle */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              type="button"
              onClick={handleReset}
              title="Reset timer"
              className="h-12 w-12 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <RotateCcw size={20} />
            </button>

            <button
              type="button"
              onClick={toggleStartPause}
              title={isActive ? 'Pause' : 'Start'}
              className="h-[72px] w-[72px] rounded-full bg-primary hover:bg-primary-hover text-snow flex items-center justify-center shadow-[0_10px_30px_rgba(25,81,252,0.45)] transition-transform active:scale-95 cursor-pointer"
            >
              {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              title="Skip block"
              className="h-12 w-12 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <SkipForward size={20} />
            </button>
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
                        className={`h-16 w-full rounded-2xl flex flex-col items-center justify-center transition-all ${
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
                        className={`h-16 w-full rounded-2xl flex flex-col items-center justify-center transition-all ${
                          activePreset === 'custom'
                            ? 'fx-active-pill'
                            : 'bg-surface-2 hover:bg-surface-2/80'
                        }`}
                      >
                        <span className="text-[18px]/[22px] font-semibold tabular-nums text-ink">
                          {activePreset === 'custom' ? focusMins : 'Set'}
                        </span>
                        <span className="text-[11px] text-ink-3">
                          {activePreset === 'custom' ? `${shortBreakMins} min break` : 'Custom'}
                        </span>
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {parsedCountdowns.map((c, idx) => {
                    const isNearestUpcoming = idx === 0 && !c.isPast;
                    return (
                      <div
                        key={c.id}
                        className={`rounded-[20px] p-5 flex flex-col justify-between relative shadow-sm transition-all ${
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
                        <div className="flex items-start justify-between">
                          <span
                            className={`text-[14px] font-semibold truncate ${
                              isNearestUpcoming ? 'text-snow' : 'text-ink'
                            }`}
                          >
                            {c.event_name}
                          </span>

                          {/* Options menu */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenCountdownMenuId(openCountdownMenuId === c.id ? null : c.id)
                              }
                              className={`h-7 w-7 rounded-[8px] flex items-center justify-center transition-colors ${
                                isNearestUpcoming
                                  ? 'text-snow/70 hover:text-snow hover:bg-snow/10'
                                  : 'text-ink-3 hover:text-ink hover:bg-surface-2'
                              }`}
                            >
                              <MoreVertical size={15} />
                            </button>
                            {openCountdownMenuId === c.id && (
                              <div className="absolute right-0 top-full mt-1 w-28 p-1 rounded-[10px] glass-strong shadow-lg z-20 flex flex-col gap-0.5">
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

                        {/* Days left */}
                        <div className="my-3 flex items-baseline gap-2">
                          <span
                            className={`font-ui font-semibold text-[48px]/[48px] tabular-nums ${
                              isNearestUpcoming ? 'text-snow' : 'text-ink'
                            }`}
                          >
                            {c.isPast ? 0 : c.daysLeft}
                          </span>
                          <span
                            className={`text-[13px] font-medium ${
                              isNearestUpcoming ? 'text-snow/80' : 'text-ink-2'
                            }`}
                          >
                            {c.isPast ? 'Passed' : 'days left'}
                          </span>
                        </div>

                        {/* Target date */}
                        <span
                          className={`text-[12px] tabular-nums block mb-2 ${
                            isNearestUpcoming ? 'text-snow/70' : 'text-ink-3'
                          }`}
                        >
                          {c.formattedTarget}
                        </span>

                        {/* 4px Progress bar */}
                        <div
                          className={`h-1 w-full rounded-full overflow-hidden ${
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
          />
        )}
      </Modal>
    </div>
  );
}

export default DesktopFocusPage;
