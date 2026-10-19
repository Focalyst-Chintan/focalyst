'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  Maximize2,
  Minimize2,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { localDateStr } from '@/lib/utils/date';
import { SeamlessRadialTimerDial } from '@/components/focus/SeamlessRadialTimerDial';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Button } from '@/components/desktop/ui/Button';
import { Popover } from '@/components/desktop/ui/Popover';
import { Modal } from '@/components/desktop/ui/Modal';
import CountdownSection from '@/components/focus/CountdownSection';
import CountdownForm from '@/components/focus/CountdownForm';
import BlockerCard from '@/components/focus/BlockerCard';
import AmbientBackground from '@/components/desktop/AmbientBackground';

// Brand ramp stops for desktop timer: #CBE9FD -> #3781FC -> #1951FC
const DESKTOP_GRADIENT_STOPS = [
  { offset: '0%', color: '#CBE9FD', opacity: 0.65 },
  { offset: '45%', color: '#3781FC', opacity: 0.50 },
  { offset: '85%', color: '#1951FC', opacity: 0.35 },
  { offset: '100%', color: '#1951FC', opacity: 0 },
];

export function DesktopFocusPage() {
  const router = useRouter();
  const { user, plan } = useAuth();
  const { tasks } = usePlan();
  const supabase = createClient();

  // Mode: Pomodoro or Countdown
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'countdown'>('pomodoro');
  const [pomodoroPhase, setPomodoroPhase] = useState<'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'>('FOCUS');
  const [currentSet, setCurrentSet] = useState(1);
  const totalSets = 4;

  // Settings
  const [focusMins, setFocusMins] = useState(25);
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);
  const [countdownMins, setCountdownMins] = useState(45);

  // Custom preset stepper temp state
  const [customFocusTemp, setCustomFocusTemp] = useState(25);
  const [customBreakTemp, setCustomBreakTemp] = useState(5);
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);

  // Active timer state
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Linked task
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');

  // Desk Mode (fullscreen)
  const [isDeskMode, setIsDeskMode] = useState(false);
  const deskModeContainerRef = useRef<HTMLDivElement>(null);
  const [localClockTime, setLocalClockTime] = useState('');

  // Today metrics & sessions
  const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
  const [todaySessionsCount, setTodaySessionsCount] = useState(0);
  const [todaySessionsList, setTodaySessionsList] = useState<any[]>([]);

  // Add countdown modal
  const [countdownModalOpen, setCountdownModalOpen] = useState(false);

  const todayStr = useMemo(() => localDateStr(new Date()), []);

  // Update desk mode clock every second
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

  // Fetch today's activity and sessions
  const fetchTodayData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: act } = await supabase
        .from('daily_focus_activity')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (act) {
        setTodayFocusMinutes(act.focus_time_minutes || act.focus_minutes || 0);
        setTodaySessionsCount(act.sessions_completed || 0);
      }

      const { data: sessions } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', `${todayStr}T00:00:00`)
        .order('started_at', { ascending: false })
        .limit(10);

      setTodaySessionsList(sessions || []);
    } catch (err) {
      console.error('Error fetching focus data:', err);
    }
  }, [user, supabase, todayStr]);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  // Check saved pending focus on mount
  useEffect(() => {
    if (!user) return;
    try {
      const pendingRaw = localStorage.getItem('fx-pending-focus');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending && pending.elapsedMinutes >= 1 && !pending.saved) {
          saveSessionToSupabase(pending.elapsedMinutes, pending.dateStr || localDateStr()).then(() => {
            localStorage.removeItem('fx-pending-focus');
            fetchTodayData();
          });
        } else {
          localStorage.removeItem('fx-pending-focus');
        }
      }
    } catch {}
  }, [user]);

  // Periodic pending state write every 15s while running
  useEffect(() => {
    if (!isActive || !sessionStartTime) return;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
      const elapsedMin = Math.floor(elapsedSec / 60);
      try {
        localStorage.setItem(
          'fx-pending-focus',
          JSON.stringify({
            id: `focus-${sessionStartTime}`,
            startedAt: new Date(sessionStartTime).toISOString(),
            elapsedMinutes: elapsedMin,
            mode: timerMode,
            dateStr: localDateStr(),
            saved: false,
          })
        );
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, [isActive, sessionStartTime, timerMode]);

  // Robust session save to database
  const saveSessionToSupabase = useCallback(
    async (elapsedMins: number, dateStr: string = localDateStr()) => {
      if (!user || elapsedMins <= 0) return;

      try {
        // 1. pomodoro_sessions insert
        await supabase.from('pomodoro_sessions').insert([
          {
            user_id: user.id,
            focus_minutes: elapsedMins,
            break_minutes: 0,
            sets_planned: totalSets,
            sets_completed: currentSet,
            was_completed: true,
            started_at: sessionStartTime
              ? new Date(sessionStartTime).toISOString()
              : new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
        ]);

        // 2. daily_focus_activity upsert
        const { data: existingAct } = await supabase
          .from('daily_focus_activity')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle();

        const currentFocus =
          existingAct?.focus_time_minutes ?? existingAct?.focus_minutes ?? 0;
        const currentSessions = existingAct?.sessions_completed ?? 0;

        await supabase.from('daily_focus_activity').upsert(
          {
            user_id: user.id,
            date: dateStr,
            focus_time_minutes: currentFocus + elapsedMins,
            sessions_completed: currentSessions + 1,
          },
          { onConflict: 'user_id,date' }
        );

        // Notify app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('focalyst:focus-updated'));
        }

        fetchTodayData();
      } catch (err) {
        console.error('Error saving session:', err);
      }
    },
    [user, supabase, totalSets, currentSet, sessionStartTime, fetchTodayData]
  );

  // Save partial on unmount or beforeunload if elapsed >= 60s
  const savePendingAndClear = useCallback(async () => {
    if (!sessionStartTime) return;
    const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
    const elapsedMin = Math.floor(elapsedSec / 60);

    if (elapsedMin >= 1) {
      await saveSessionToSupabase(elapsedMin, localDateStr());
    }
    try {
      localStorage.removeItem('fx-pending-focus');
    } catch {}
  }, [sessionStartTime, saveSessionToSupabase]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStartTime) {
        const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
        const elapsedMin = Math.floor(elapsedSec / 60);
        if (elapsedMin >= 1) {
          try {
            // Note: synchronous localStorage marker so next load flushes it
            localStorage.setItem(
              'fx-pending-focus',
              JSON.stringify({
                id: `focus-${sessionStartTime}`,
                startedAt: new Date(sessionStartTime).toISOString(),
                elapsedMinutes: elapsedMin,
                mode: timerMode,
                dateStr: localDateStr(),
                saved: false,
              })
            );
          } catch {}
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      savePendingAndClear();
    };
  }, [sessionStartTime, timerMode, savePendingAndClear]);

  // Timer tick interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // Phase transition or completion
  const handlePhaseComplete = async () => {
    setIsActive(false);

    if (timerMode === 'pomodoro') {
      if (pomodoroPhase === 'FOCUS') {
        await saveSessionToSupabase(focusMins);
        setSessionStartTime(null);

        if (currentSet === totalSets) {
          setPomodoroPhase('LONG_BREAK');
          setTimeLeft(longBreakMins * 60);
        } else {
          setPomodoroPhase('SHORT_BREAK');
          setTimeLeft(shortBreakMins * 60);
        }
      } else {
        // Break completed
        setPomodoroPhase('FOCUS');
        setCurrentSet((s) => (s < totalSets ? s + 1 : 1));
        setTimeLeft(focusMins * 60);
      }
    } else {
      // Countdown completed
      await saveSessionToSupabase(countdownMins);
      setSessionStartTime(null);
      setTimeLeft(countdownMins * 60);
    }
  };

  // Start / Pause
  const handleToggleStart = () => {
    if (!isActive) {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  };

  // Reset
  const handleReset = async () => {
    setIsActive(false);
    if (sessionStartTime) {
      const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
      const elapsedMin = Math.floor(elapsedSec / 60);
      if (elapsedMin >= 1) {
        await saveSessionToSupabase(elapsedMin);
      }
      setSessionStartTime(null);
      try {
        localStorage.removeItem('fx-pending-focus');
      } catch {}
    }

    const initialMins =
      timerMode === 'countdown'
        ? countdownMins
        : pomodoroPhase === 'FOCUS'
        ? focusMins
        : pomodoroPhase === 'SHORT_BREAK'
        ? shortBreakMins
        : longBreakMins;

    setTimeLeft(initialMins * 60);
  };

  // Skip
  const handleSkip = async () => {
    if (sessionStartTime) {
      const elapsedSec = Math.floor((Date.now() - sessionStartTime) / 1000);
      const elapsedMin = Math.floor(elapsedSec / 60);
      if (elapsedMin >= 1) {
        await saveSessionToSupabase(elapsedMin);
      }
      setSessionStartTime(null);
      try {
        localStorage.removeItem('fx-pending-focus');
      } catch {}
    }

    if (timerMode === 'pomodoro') {
      if (pomodoroPhase === 'FOCUS') {
        if (currentSet === totalSets) {
          setPomodoroPhase('LONG_BREAK');
          setTimeLeft(longBreakMins * 60);
        } else {
          setPomodoroPhase('SHORT_BREAK');
          setTimeLeft(shortBreakMins * 60);
        }
      } else {
        setPomodoroPhase('FOCUS');
        setCurrentSet((s) => (s < totalSets ? s + 1 : 1));
        setTimeLeft(focusMins * 60);
      }
    } else {
      setTimeLeft(countdownMins * 60);
    }
    setIsActive(false);
  };

  // Change Timer Mode (Pomodoro vs Countdown)
  const handleModeChange = (mode: string) => {
    if (mode === timerMode) return;
    handleReset();
    setTimerMode(mode as any);
    if (mode === 'countdown') {
      setTimeLeft(countdownMins * 60);
    } else {
      setPomodoroPhase('FOCUS');
      setTimeLeft(focusMins * 60);
    }
  };

  // Presets
  const applyPreset = (f: number, b: number) => {
    handleReset();
    setFocusMins(f);
    setShortBreakMins(b);
    setTimeLeft(f * 60);
  };

  const isCurrentPreset = (f: number, b: number) => {
    return focusMins === f && shortBreakMins === b;
  };

  // Keyboard shortcuts on /focus (F key for Desk Mode, Space for Start/Pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement;

      if (isInput) return;

      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleDeskMode();
        return;
      }

      if (e.code === 'Space' && isDeskMode) {
        e.preventDefault();
        handleToggleStart();
        return;
      }

      if (e.key === 'Escape' && isDeskMode) {
        exitDeskMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeskMode, isActive]);

  // Fullscreen Desk Mode
  const toggleDeskMode = () => {
    if (!document.fullscreenElement) {
      deskModeContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsDeskMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsDeskMode(false);
    }
  };

  const exitDeskMode = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsDeskMode(false);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsDeskMode(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalPhaseSecs =
    timerMode === 'countdown'
      ? countdownMins * 60
      : pomodoroPhase === 'FOCUS'
      ? focusMins * 60
      : pomodoroPhase === 'SHORT_BREAK'
      ? shortBreakMins * 60
      : longBreakMins * 60;

  const dialProgress = totalPhaseSecs > 0 ? (totalPhaseSecs - timeLeft) / totalPhaseSecs : 0;

  // Selected task object
  const activeTask = useMemo(() => {
    return tasks.find((t) => t.id === linkedTaskId);
  }, [tasks, linkedTaskId]);

  // Incomplete tasks for select
  const todayIncompleteTasks = useMemo(() => {
    return (tasks || []).filter((t) => !t.is_completed);
  }, [tasks]);

  const microLabel =
    timerMode === 'countdown'
      ? 'COUNTDOWN'
      : pomodoroPhase === 'FOCUS'
      ? `FOCUS · ${currentSet} OF ${totalSets}`
      : pomodoroPhase === 'SHORT_BREAK'
      ? 'SHORT BREAK'
      : 'LONG BREAK';

  return (
    <div ref={deskModeContainerRef} className="w-full relative">
      {/* =========================================================================
          DESK MODE FULLSCREEN OVERLAY
          ========================================================================= */}
      {isDeskMode && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between p-10 bg-canvas select-none">
          <AmbientBackground strong />

          {/* Top Row: Local clock + Minimize */}
          <div className="w-full flex items-center justify-between z-10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {microLabel}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[13px] font-semibold tabular-nums text-ink-2">
                {localClockTime}
              </span>
              <IconButton label="Exit desk mode" size="sm" variant="ghost" onClick={exitDeskMode}>
                <Minimize2 size={18} />
              </IconButton>
            </div>
          </div>

          {/* Center Dial Scaled to 56vh */}
          <div className="flex flex-col items-center justify-center my-auto z-10">
            <SeamlessRadialTimerDial
              progress={dialProgress}
              size={Math.min(520, typeof window !== 'undefined' ? window.innerHeight * 0.54 : 460)}
              gradientStops={DESKTOP_GRADIENT_STOPS}
              trackColor="var(--line)"
            >
              <div className="flex flex-col items-center">
                <div className="font-ui font-light text-[88px] leading-none tracking-[-0.03em] tabular-nums text-ink">
                  {formatTime(timeLeft)}
                </div>
                <div className="mt-3 text-[14px] text-ink-2 max-w-[280px] truncate text-center">
                  {activeTask?.title || 'No task linked'}
                </div>
              </div>
            </SeamlessRadialTimerDial>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center gap-6 z-10 pb-4">
            <button
              type="button"
              onClick={handleReset}
              className="h-12 w-12 rounded-full flex items-center justify-center hover:bg-surface-2 text-ink-2 transition-colors"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>
            <button
              type="button"
              onClick={handleToggleStart}
              className="h-16 w-16 rounded-full bg-primary text-snow flex items-center justify-center shadow-[0_10px_30px_rgba(25,81,252,0.45)] hover:bg-primary-hover active:scale-95 transition-all"
              title={isActive ? 'Pause' : 'Start'}
            >
              {isActive ? <Pause size={28} /> : <Play size={28} className="fill-current ml-1" />}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="h-12 w-12 rounded-full flex items-center justify-center hover:bg-surface-2 text-ink-2 transition-colors"
              title="Skip"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          NORMAL DESKTOP FOCUS VIEW: GRID [1fr | 360]
          ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 w-full items-start">
        {/* ================= LEFT STAGE CARD ================= */}
        <div className="rounded-[28px] frost p-8 min-h-[calc(100vh-140px)] flex flex-col items-center justify-between relative shadow-[var(--shadow-1)]">
          {/* Top Row: SegmentedControl centred, Maximize2 right */}
          <div className="w-full flex items-center justify-between">
            <div className="w-10" />
            <SegmentedControl
              value={timerMode}
              onChange={handleModeChange}
              options={[
                { label: 'Pomodoro', value: 'pomodoro' },
                { label: 'Countdown', value: 'countdown' },
              ]}
            />
            <IconButton
              label="Desk mode"
              tooltip="Desk mode  F"
              size="sm"
              variant="ghost"
              onClick={toggleDeskMode}
            >
              <Maximize2 size={17} />
            </IconButton>
          </div>

          {/* Micro Label */}
          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {microLabel}
          </div>

          {/* Radial Timer 380px with brand ramp & feathered glow */}
          <div className="my-auto py-4">
            <SeamlessRadialTimerDial
              progress={dialProgress}
              size={380}
              gradientStops={DESKTOP_GRADIENT_STOPS}
              trackColor="var(--line)"
            >
              <div className="flex flex-col items-center">
                <div className="font-ui font-light text-[76px] leading-none tracking-[-0.03em] tabular-nums text-ink">
                  {formatTime(timeLeft)}
                </div>
                <div className="mt-3 text-[13px] text-ink-2 max-w-[240px] truncate text-center">
                  {activeTask?.title || (
                    <span className="text-ink-3">No task linked</span>
                  )}
                </div>
              </div>
            </SeamlessRadialTimerDial>
          </div>

          {/* Controls row: Reset (48px ghost), Start/Pause (72px primary), Skip (48px ghost) */}
          <div className="mt-6 flex items-center gap-6">
            <button
              type="button"
              onClick={handleReset}
              className="h-12 w-12 rounded-full flex items-center justify-center hover:bg-surface-2 text-ink-2 transition-colors active:scale-95"
              title="Reset"
            >
              <RotateCcw size={20} />
            </button>
            <button
              type="button"
              onClick={handleToggleStart}
              className="h-[72px] w-[72px] rounded-full bg-primary text-snow flex items-center justify-center shadow-[0_10px_30px_rgba(25,81,252,0.45)] hover:bg-primary-hover active:scale-95 transition-all"
              title={isActive ? 'Pause' : 'Start'}
            >
              {isActive ? <Pause size={28} /> : <Play size={28} className="fill-current ml-1" />}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="h-12 w-12 rounded-full flex items-center justify-center hover:bg-surface-2 text-ink-2 transition-colors active:scale-95"
              title="Skip"
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* "What are you working on?" Select */}
          <div className="mt-6 w-[320px]">
            <select
              value={linkedTaskId}
              onChange={(e) => setLinkedTaskId(e.target.value)}
              className="w-full h-10 rounded-full bg-surface-2 border border-line px-4 text-[13px] text-ink outline-none cursor-pointer focus:border-line-strong transition-colors text-center"
            >
              <option value="">What are you working on?</option>
              {todayIncompleteTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (360px) ================= */}
        <div className="flex flex-col gap-4 w-full">
          {/* Card 1: TODAY */}
          <div className="rounded-[20px] frost p-5 flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              TODAY
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-[32px] font-semibold tabular-nums tracking-tight text-ink leading-none">
                {todayFocusMinutes < 60
                  ? `${todayFocusMinutes}m`
                  : `${Math.floor(todayFocusMinutes / 60)}h ${todayFocusMinutes % 60}m`}
              </span>
              <span className="text-[13px] font-medium text-ink-2 tabular-nums">
                {todaySessionsCount} {todaySessionsCount === 1 ? 'session' : 'sessions'}
              </span>
            </div>
          </div>

          {/* Card 2: PRESETS (2x2 grid of pills) */}
          <div className="rounded-[20px] frost p-5 flex flex-col gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              PRESETS
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '25/5', focus: 25, brk: 5 },
                { label: '50/10', focus: 50, brk: 10 },
                { label: '90/15', focus: 90, brk: 15 },
              ].map((p) => {
                const active = isCurrentPreset(p.focus, p.brk) && timerMode === 'pomodoro';
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (timerMode !== 'pomodoro') setTimerMode('pomodoro');
                      applyPreset(p.focus, p.brk);
                    }}
                    className={`h-11 rounded-[14px] text-[13px] font-semibold transition-all ${
                      active
                        ? 'bg-primary-soft border border-primary/40 text-primary-text'
                        : 'bg-surface-2 text-ink hover:bg-surface-2/80'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}

              {/* Custom preset pill */}
              <Popover
                open={customPopoverOpen}
                onOpenChange={setCustomPopoverOpen}
                trigger={
                  <button
                    type="button"
                    className="h-11 rounded-[14px] text-[13px] font-semibold bg-surface-2 text-ink hover:bg-surface-2/80 transition-colors"
                  >
                    Custom
                  </button>
                }
                align="end"
              >
                <div className="w-56 p-4 flex flex-col gap-3">
                  <div>
                    <label className="block text-[11px] font-medium uppercase text-ink-3 mb-1">
                      Focus minutes
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={customFocusTemp}
                      onChange={(e) => setCustomFocusTemp(Number(e.target.value))}
                      className="w-full h-8 rounded-[8px] bg-surface-2 border border-line px-2 text-[13px] text-ink font-semibold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase text-ink-3 mb-1">
                      Break minutes
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={customBreakTemp}
                      onChange={(e) => setCustomBreakTemp(Number(e.target.value))}
                      className="w-full h-8 rounded-[8px] bg-surface-2 border border-line px-2 text-[13px] text-ink font-semibold outline-none"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      applyPreset(customFocusTemp, customBreakTemp);
                      setCustomPopoverOpen(false);
                    }}
                    className="w-full mt-1"
                  >
                    Apply
                  </Button>
                </div>
              </Popover>
            </div>
          </div>

          {/* Card 3: SESSIONS TODAY */}
          <div className="rounded-[20px] frost p-5 flex flex-col gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              SESSIONS TODAY
            </span>
            {todaySessionsList.length === 0 ? (
              <p className="text-[13px] text-ink-3 py-3 text-center">No sessions yet today.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {todaySessionsList.map((s) => {
                  const startTime = s.started_at
                    ? new Date(s.started_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--';
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-[13px] py-1 border-b border-line/40 last:border-none"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[12px] font-mono text-ink-3 tabular-nums">
                          {startTime}
                        </span>
                        <span className="font-semibold text-ink tabular-nums">
                          {s.focus_minutes}m
                        </span>
                      </div>
                      <span className="text-[12px] text-ink-2 truncate max-w-[140px]">
                        {s.task_title || 'Focus block'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 4: COUNTDOWNS */}
          <div className="rounded-[20px] frost p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                COUNTDOWNS
              </span>
              <button
                type="button"
                onClick={() => setCountdownModalOpen(true)}
                className="text-ink-3 hover:text-ink text-[12px] font-semibold flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>
            {user && <CountdownSection userId={user.id} userPlan={plan || 'free'} />}
          </div>

          {/* Card 5: DISTRACTION BLOCKER */}
          <div className="rounded-[20px] frost p-5">
            <BlockerCard />
          </div>
        </div>
      </div>

      {/* Countdown Form Modal */}
      <Modal
        isOpen={countdownModalOpen}
        onClose={() => setCountdownModalOpen(false)}
        size="sm"
        title="New countdown"
      >
        {user && (
          <CountdownForm
            userId={user.id}
            userPlan={plan || 'free'}
          />
        )}
      </Modal>
    </div>
  );
}

export default DesktopFocusPage;
