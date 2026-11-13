import AsyncStorage from '@react-native-async-storage/async-storage';
import { addUserInteractionListener } from 'expo-widgets';
import { Appearance, AppState } from 'react-native';
import { queryCache } from '../utils/queryCache';
import { supabase } from '../utils/supabase';
import StreakWidget from '../widgets/StreakWidget';
import HeatmapWidget from '../widgets/HeatmapWidget';
import TodoWidget from '../widgets/TodoWidget';
import CountdownWidget from '../widgets/CountdownWidget';
import PomodoroWidget from '../widgets/PomodoroWidget';
import CalendarWidget from '../widgets/CalendarWidget';
import type {
  CalendarEventItem,
  HabitHeatmapItem,
  SystemColorScheme,
  TodoItem,
  WidgetColorPreset,
} from '../widgets/types';

const WIDGET_PRESET_STORAGE_KEY = '@focalyst_widget_color_preset';
export const POMODORO_SESSION_STORAGE_KEY = '@focalyst_pomodoro_session_v1';
const COMPLETED_FROM_WIDGET_KEY = '@focalyst_widget_completed_task_ids';
export const HABIT_TOGGLES_FROM_WIDGET_KEY = '@focalyst_widget_toggled_habits_v1';
export const CALENDAR_EVENTS_STORAGE_KEY = '@focalyst_calendar_events_widget_v1';
export const SELECTED_WIDGET_HABIT_KEY = '@focalyst/selected_widget_habit_id';
export const SELECTED_WIDGET_COUNTDOWN_KEY = '@focalyst/selected_widget_countdown_id';

export interface CountdownWidgetItem {
  id: string;
  title: string;
  dateLabel: string;
  targetDateIso: string;
}

export type FocalystWidgetPayload = {
  preset: WidgetColorPreset;
  habitName: string;
  streakDays: number;
  totalDays: number;
  gridLevels: number[];
  habits: HabitHeatmapItem[];
  tasks: TodoItem[];
  calendarEvents: CalendarEventItem[];
  upcomingCalendarEvents: CalendarEventItem[];
  countdown: { title: string; dateLabel: string; targetDateIso: string };
  countdowns?: CountdownWidgetItem[];
  pomodoro: {
    taskLabel: string;
    durationSeconds: number;
    isRunning: boolean;
    endTimeMs?: number;
    updatedAtMs?: number;
  };
};

let currentPayload: FocalystWidgetPayload = {
  preset: 'white',
  habitName: 'Yoga',
  streakDays: 4,
  totalDays: 26,
  gridLevels: [
    0, 0, 1, 2, 3, 4, 2,
    1, 0, 2, 3, 4, 3, 1,
    2, 3, 4, 2, 4, 3, 2,
    0, 1, 2, 3, 4, 4, 3,
    2, 3, 4, 0, 0, 0, 0,
  ],
  habits: [],
  tasks: [],
  calendarEvents: [],
  upcomingCalendarEvents: [],
  countdown: {
    title: 'AUDIT',
    dateLabel: '17/12/2026',
    targetDateIso: '2026-12-17T11:00:00.000Z',
  },
  countdowns: [],
  pomodoro: {
    taskLabel: 'Focus',
    durationSeconds: 1500,
    isRunning: false,
    updatedAtMs: 0,
  },
};

let isHydrated = false;
let isReconciling = false;
let hydrationPromise: Promise<void> | null = null;

type TaskCompleteHandler = (completedTaskIds: string[]) => Promise<void> | void;
type HabitToggleHandler = (toggledHabits: Record<string, boolean>) => Promise<void> | void;
type PomodoroSyncHandler = (pomodoro: FocalystWidgetPayload['pomodoro']) => void;

const taskCompleteHandlers = new Set<TaskCompleteHandler>();
const habitToggleHandlers = new Set<HabitToggleHandler>();
const pomodoroSyncHandlers = new Set<PomodoroSyncHandler>();
const payloadListeners = new Set<() => void>();

export const registerWidgetTaskCompleteHandler = (handler: TaskCompleteHandler) => {
  taskCompleteHandlers.add(handler);
  return () => taskCompleteHandlers.delete(handler);
};

export const registerWidgetHabitToggleHandler = (handler: HabitToggleHandler) => {
  habitToggleHandlers.add(handler);
  return () => habitToggleHandlers.delete(handler);
};

export const registerWidgetPomodoroSyncHandler = (handler: PomodoroSyncHandler) => {
  pomodoroSyncHandlers.add(handler);
  return () => pomodoroSyncHandlers.delete(handler);
};

export const subscribeToWidgetPayload = (cb: () => void) => {
  payloadListeners.add(cb);
  return () => payloadListeners.delete(cb);
};

export const getWidgetPayload = () => currentPayload;
export const getActiveWidgetPreset = (): WidgetColorPreset => currentPayload.preset;

export const getSystemScheme = (): SystemColorScheme =>
  Appearance.getColorScheme() === 'light' ? 'light' : 'dark';

export const getTodayYYYYMMDD = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getTodayIndexInMonthlyGrid = (referenceDate: Date = new Date()): number => {
  const firstDayOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  return startOffset + referenceDate.getDate() - 1;
};

export const formatDateDMY = (dateInput: string | Date): string => {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '17/12/2026';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const ensureWidgetStateHydrated = async (): Promise<void> => {
  if (isHydrated) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const [savedPreset, savedPomo, savedCalendar] = await Promise.all([
        AsyncStorage.getItem(WIDGET_PRESET_STORAGE_KEY),
        AsyncStorage.getItem(POMODORO_SESSION_STORAGE_KEY),
        AsyncStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY),
      ]);
      if (savedPreset) {
        currentPayload.preset = savedPreset as WidgetColorPreset;
      }
      if (savedCalendar) {
        try {
          const parsedCal = JSON.parse(savedCalendar);
          if (Array.isArray(parsedCal)) {
            currentPayload.calendarEvents = parsedCal;
          } else if (parsedCal && typeof parsedCal === 'object') {
            if (Array.isArray(parsedCal.today)) currentPayload.calendarEvents = parsedCal.today;
            if (Array.isArray(parsedCal.upcoming)) currentPayload.upcomingCalendarEvents = parsedCal.upcoming;
          }
        } catch {}
      }
      if (savedPomo) {
        const parsed = JSON.parse(savedPomo);
        if (parsed && typeof parsed === 'object') {
          if (parsed.isRunning && parsed.endTimeMs) {
            const rem = Math.max(0, Math.ceil((parsed.endTimeMs - Date.now()) / 1000));
            currentPayload.pomodoro = {
              ...currentPayload.pomodoro,
              ...parsed,
              isRunning: rem > 0,
              durationSeconds: rem > 0 ? rem : 1500,
            };
          } else {
            currentPayload.pomodoro = { ...currentPayload.pomodoro, ...parsed };
          }
        }
      }
    } catch {}
    isHydrated = true;
  })();

  return hydrationPromise;
};

export const setWidgetColorPreset = async (preset: WidgetColorPreset) => {
  await ensureWidgetStateHydrated();
  currentPayload = { ...currentPayload, preset };
  try {
    await AsyncStorage.setItem(WIDGET_PRESET_STORAGE_KEY, preset);
  } catch {}
  await pushSnapshotsToNativeWidgets();
  payloadListeners.forEach((cb) => cb());
};

// Reconciles ticks from TodoWidget and Start/End actions from PomodoroWidget BEFORE app overwrites widgets
export const reconcileWidgetsToApp = async () => {
  if (isReconciling) return;
  isReconciling = true;
  try {
    await ensureWidgetStateHydrated();

    // 1. Check TodoWidget timeline for tasks ticked off on the Home Screen
    const todoTimeline = await TodoWidget.getTimeline();
    const completedIds = new Set<string>();

    for (const entry of todoTimeline) {
      const p = entry?.props;
      if (p?.lastCompletedTaskId) completedIds.add(p.lastCompletedTaskId);
      if (Array.isArray(p?.completedTaskIds)) {
        p.completedTaskIds.forEach((id: string) => completedIds.add(id));
      }
      if (Array.isArray(p?.tasks)) {
        p.tasks.forEach((t: TodoItem) => {
          if (t.completed) completedIds.add(t.id);
        });
      }
    }

    if (completedIds.size > 0) {
      const idsArray = Array.from(completedIds);
      // Persist completed IDs so even if Plan screen mounts later, it filters them out
      const existingRaw = await AsyncStorage.getItem(COMPLETED_FROM_WIDGET_KEY);
      const existingIds: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      const mergedIds = Array.from(new Set([...existingIds, ...idsArray]));
      await AsyncStorage.setItem(COMPLETED_FROM_WIDGET_KEY, JSON.stringify(mergedIds));

      currentPayload.tasks = currentPayload.tasks.filter((t) => !completedIds.has(t.id));
      if (taskCompleteHandlers.size > 0) {
        for (const handler of taskCompleteHandlers) {
          await handler(mergedIds);
        }
      } else {
        try {
          await supabase
            .from('tasks')
            .update({ is_completed: true, completed_at: new Date().toISOString() })
            .in('id', mergedIds);
        } catch {}
      }
    }

    // 1b. Check StreakWidget & HeatmapWidget timelines for habits toggled on the Home Screen
    const [streakTimeline, heatmapTimeline] = await Promise.all([
      StreakWidget.getTimeline(),
      HeatmapWidget.getTimeline(),
    ]);
    const toggleEvents: { updatedAtMs: number; map: Record<string, boolean> }[] = [];

    for (const timeline of [streakTimeline, heatmapTimeline]) {
      if (Array.isArray(timeline) && timeline.length > 0) {
        for (const entry of timeline) {
          const p: any = entry?.props ?? entry;
          if (p?.toggledHabitMap && typeof p.toggledHabitMap === 'object' && Object.keys(p.toggledHabitMap).length > 0) {
            toggleEvents.push({
              updatedAtMs: typeof p.updatedAtMs === 'number' ? p.updatedAtMs : 0,
              map: p.toggledHabitMap,
            });
          }
        }
      }
    }

    toggleEvents.sort((a, b) => a.updatedAtMs - b.updatedAtMs);
    let latestStreakToggles: Record<string, boolean> = {};
    for (const evt of toggleEvents) {
      latestStreakToggles = { ...latestStreakToggles, ...evt.map };
    }

    const toggledHabitIds = Object.keys(latestStreakToggles);
    if (toggledHabitIds.length > 0) {
      const existingRaw = await AsyncStorage.getItem(HABIT_TOGGLES_FROM_WIDGET_KEY);
      const existingMap: Record<string, boolean> = existingRaw ? JSON.parse(existingRaw) : {};
      const mergedToggles: Record<string, boolean> = { ...existingMap, ...latestStreakToggles };
      await AsyncStorage.setItem(HABIT_TOGGLES_FROM_WIDGET_KEY, JSON.stringify(mergedToggles));

      const todayIdx = getTodayIndexInMonthlyGrid();
      let selectedHabitId: string | null = null;
      try {
        selectedHabitId = await AsyncStorage.getItem(SELECTED_WIDGET_HABIT_KEY);
      } catch {}

      currentPayload.habits = currentPayload.habits.map((h) => {
        if (!(h.id in latestStreakToggles)) return h;
        const nextDone = Boolean(latestStreakToggles[h.id]);
        const wasDone = Boolean(h.completedToday);
        if (wasDone === nextDone) return h;

        const curStreak = Math.max(0, Math.floor(Number(h.streakDays ?? h.totalDays) || 0));
        const nextStreak = nextDone ? curStreak + 1 : Math.max(0, curStreak - 1);
        const curTotal = Math.max(0, Math.floor(Number(h.totalDays) || 0));
        const nextTotal = nextDone ? curTotal + 1 : Math.max(0, curTotal - 1);
        const nextGrid = Array.isArray(h.gridLevels) ? [...h.gridLevels] : new Array(35).fill(0);
        if (todayIdx >= 0 && todayIdx < 35) {
          nextGrid[todayIdx] = nextDone ? 4 : 1;
        }
        return {
          ...h,
          completedToday: nextDone,
          streakDays: nextStreak,
          totalDays: nextTotal,
          gridLevels: nextGrid,
        };
      });

      const activeHeatmapHabit =
        (selectedHabitId && currentPayload.habits.find((h) => h.id === selectedHabitId)) ||
        currentPayload.habits.find((h) => h.habitName === currentPayload.habitName) ||
        currentPayload.habits[0];

      if (activeHeatmapHabit) {
        currentPayload.habitName = activeHeatmapHabit.habitName;
        currentPayload.streakDays = activeHeatmapHabit.streakDays ?? activeHeatmapHabit.totalDays;
        currentPayload.totalDays = activeHeatmapHabit.totalDays;
        currentPayload.gridLevels = activeHeatmapHabit.gridLevels;
      }

      if (habitToggleHandlers.size > 0) {
        for (const handler of habitToggleHandlers) {
          await handler(mergedToggles);
        }
      } else {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const uid = session?.user?.id;
          const today = getTodayYYYYMMDD();
          if (uid) {
            for (const [hId, desired] of Object.entries(latestStreakToggles)) {
              const targetHabit = currentPayload.habits.find((item) => item.id === hId);
              await supabase
                .from('habit_logs')
                .delete()
                .eq('habit_id', hId)
                .eq('completed_date', today);
              if (desired) {
                await supabase
                  .from('habit_logs')
                  .insert([{ habit_id: hId, user_id: uid, completed_date: today }]);
              }
              if (targetHabit) {
                await supabase
                  .from('habits')
                  .update({ current_streak: targetHabit.streakDays ?? targetHabit.totalDays })
                  .eq('id', hId);
              }
            }
          }
        } catch {}
      }
    }

    // 2. Inspect the latest entry in PomodoroWidget timeline for widget-initiated Start/End
    const pomoTimeline = await PomodoroWidget.getTimeline();
    let latestEntry: any = null;

    if (Array.isArray(pomoTimeline) && pomoTimeline.length > 0) {
      for (const item of pomoTimeline) {
        const p: any = item?.props ?? item;
        if (!p) continue;
        const entryTime =
          p.updatedAtMs ?? (item?.date instanceof Date ? item.date.getTime() : 0);
        if (!latestEntry) {
          latestEntry = { ...p, _time: entryTime };
        } else if (entryTime >= (latestEntry._time ?? 0)) {
          latestEntry = { ...p, _time: entryTime };
        }
      }
      if (!latestEntry) {
        const lastItem = pomoTimeline[pomoTimeline.length - 1];
        latestEntry = lastItem?.props ?? lastItem;
      }
    }

    if (latestEntry) {
      if (
        latestEntry.lastAction === 'end' ||
        (latestEntry.source === 'widget' && latestEntry.isRunning === false)
      ) {
        // User tapped "End" on the widget -> immediately terminate the session, clear endTimeMs, and notify handlers
        currentPayload.pomodoro = {
          taskLabel: 'Focus',
          isRunning: false,
          durationSeconds: 1500,
          endTimeMs: 0,
          updatedAtMs: Date.now(),
        };
        await AsyncStorage.setItem(
          POMODORO_SESSION_STORAGE_KEY,
          JSON.stringify(currentPayload.pomodoro)
        );
        // Overwrite the widget timeline with a single idle snapshot so all future entries are cleared
        PomodoroWidget.updateTimeline([
          {
            date: new Date(),
            props: {
              preset: currentPayload.preset,
              systemScheme: getSystemScheme(),
              taskLabel: 'Focus',
              durationSeconds: 1500,
              isRunning: false,
              endTimeMs: 0,
              lastAction: 'none',
              source: 'app',
              updatedAtMs: Date.now(),
            },
          },
        ]);
        PomodoroWidget.updateSnapshot({
          preset: currentPayload.preset,
          systemScheme: getSystemScheme(),
          taskLabel: 'Focus',
          durationSeconds: 1500,
          isRunning: false,
          endTimeMs: 0,
          lastAction: 'none',
          source: 'app',
          updatedAtMs: Date.now(),
        });
        pomodoroSyncHandlers.forEach((h) => h(currentPayload.pomodoro));
        payloadListeners.forEach((cb) => cb());
      } else if (
        latestEntry.lastAction === 'start' ||
        (latestEntry.isRunning === true && (latestEntry.endTimeMs ?? 0) > Date.now())
      ) {
        const targetEndMs =
          latestEntry.endTimeMs && latestEntry.endTimeMs > Date.now()
            ? latestEntry.endTimeMs
            : Date.now() + (latestEntry.durationSeconds || 1500) * 1000;
        const rem = Math.max(1, Math.ceil((targetEndMs - Date.now()) / 1000));
        currentPayload.pomodoro = {
          taskLabel: latestEntry.taskLabel || 'Focus',
          isRunning: true,
          durationSeconds: rem,
          endTimeMs: targetEndMs,
          updatedAtMs: Date.now(),
        };
        await AsyncStorage.setItem(
          POMODORO_SESSION_STORAGE_KEY,
          JSON.stringify(currentPayload.pomodoro)
        );
        pomodoroSyncHandlers.forEach((h) => h(currentPayload.pomodoro));
        payloadListeners.forEach((cb) => cb());
      }
    }
  } catch {} finally {
    isReconciling = false;
  }
};

export const consumeWidgetCompletedTaskIds = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_FROM_WIDGET_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const clearWidgetCompletedTaskIds = async (idsToClear?: string[]): Promise<void> => {
  try {
    if (!idsToClear) {
      await AsyncStorage.removeItem(COMPLETED_FROM_WIDGET_KEY);
      return;
    }
    const clearSet = new Set(idsToClear.map(String));
    const existing = await consumeWidgetCompletedTaskIds();
    const remaining = existing.filter((id) => !clearSet.has(String(id)));
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(COMPLETED_FROM_WIDGET_KEY);
    } else {
      await AsyncStorage.setItem(COMPLETED_FROM_WIDGET_KEY, JSON.stringify(remaining));
    }
  } catch {}
};

export const consumeWidgetToggledHabits = async (): Promise<Record<string, boolean>> => {
  try {
    const raw = await AsyncStorage.getItem(HABIT_TOGGLES_FROM_WIDGET_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const clearWidgetToggledHabits = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HABIT_TOGGLES_FROM_WIDGET_KEY);
  } catch {}
};

export const completeTaskFromWidgetPreview = async (taskId: string) => {
  const existingRaw = await AsyncStorage.getItem(COMPLETED_FROM_WIDGET_KEY);
  const existingIds: string[] = existingRaw ? JSON.parse(existingRaw) : [];
  const mergedIds = Array.from(new Set([...existingIds, String(taskId)]));
  await AsyncStorage.setItem(COMPLETED_FROM_WIDGET_KEY, JSON.stringify(mergedIds));

  currentPayload = {
    ...currentPayload,
    tasks: currentPayload.tasks.filter((t) => String(t.id) !== String(taskId)),
  };

  if (taskCompleteHandlers.size > 0) {
    for (const handler of taskCompleteHandlers) {
      await handler(mergedIds);
    }
  } else {
    try {
      await supabase
        .from('tasks')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', taskId);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        const cached = queryCache.getSync<any[]>(`user:${uid}:tasks`);
        if (cached) {
          queryCache.setSync(
            `user:${uid}:tasks`,
            cached.filter((t: any) => String(t.id) !== String(taskId))
          );
        }
      }
    } catch {}
  }

  await pushSnapshotsToNativeWidgets();
  payloadListeners.forEach((cb) => cb());
};

export const toggleHabitFromWidgetPreview = async (habitId: string) => {
  const target = currentPayload.habits.find((h) => h.id === habitId);
  if (!target) return;

  const nextDone = !Boolean(target.completedToday);
  const curStreak = Math.max(0, Math.floor(Number(target.streakDays ?? target.totalDays) || 0));
  const nextStreak = nextDone ? curStreak + 1 : Math.max(0, curStreak - 1);
  const curTotal = Math.max(0, Math.floor(Number(target.totalDays) || 0));
  const nextTotal = nextDone ? curTotal + 1 : Math.max(0, curTotal - 1);
  const todayIdx = getTodayIndexInMonthlyGrid();
  const nextGrid = Array.isArray(target.gridLevels) ? [...target.gridLevels] : new Array(35).fill(0);
  if (todayIdx >= 0 && todayIdx < 35) {
    nextGrid[todayIdx] = nextDone ? 4 : 1;
  }

  const nextHabits = currentPayload.habits.map((h) =>
    h.id === habitId
      ? {
          ...h,
          completedToday: nextDone,
          streakDays: nextStreak,
          totalDays: nextTotal,
          gridLevels: nextGrid,
        }
      : h
  );

  let selectedHabitId: string | null = null;
  try {
    selectedHabitId = await AsyncStorage.getItem(SELECTED_WIDGET_HABIT_KEY);
  } catch {}
  const activeHeatmapHabit =
    (selectedHabitId && nextHabits.find((h) => h.id === selectedHabitId)) ||
    nextHabits.find((h) => h.habitName === currentPayload.habitName) ||
    nextHabits[0];

  currentPayload = {
    ...currentPayload,
    habits: nextHabits,
    ...(activeHeatmapHabit
      ? {
          habitName: activeHeatmapHabit.habitName,
          streakDays: activeHeatmapHabit.streakDays ?? activeHeatmapHabit.totalDays,
          totalDays: activeHeatmapHabit.totalDays,
          gridLevels: activeHeatmapHabit.gridLevels,
        }
      : {}),
  };

  const existingRaw = await AsyncStorage.getItem(HABIT_TOGGLES_FROM_WIDGET_KEY);
  const existingMap: Record<string, boolean> = existingRaw ? JSON.parse(existingRaw) : {};
  const mergedToggles: Record<string, boolean> = { ...existingMap, [habitId]: nextDone };
  await AsyncStorage.setItem(HABIT_TOGGLES_FROM_WIDGET_KEY, JSON.stringify(mergedToggles));

  if (habitToggleHandlers.size > 0) {
    for (const handler of habitToggleHandlers) {
      await handler(mergedToggles);
    }
  } else {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      const today = getTodayYYYYMMDD();
      if (uid) {
        await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', habitId)
          .eq('completed_date', today);
        if (nextDone) {
          await supabase
            .from('habit_logs')
            .insert([{ habit_id: habitId, user_id: uid, completed_date: today }]);
        }
        await supabase
          .from('habits')
          .update({ current_streak: nextStreak })
          .eq('id', habitId);
      }
    } catch {}
  }

  await pushSnapshotsToNativeWidgets();
  payloadListeners.forEach((cb) => cb());
};

const pushSnapshotsToNativeWidgets = async (overrideScheme?: SystemColorScheme) => {
  await ensureWidgetStateHydrated();
  const systemScheme = overrideScheme ?? getSystemScheme();
  const preset = currentPayload.preset;

  StreakWidget.updateSnapshot({
    preset,
    systemScheme,
    habitName: currentPayload.habitName,
    streakDays: currentPayload.streakDays,
    totalDays: currentPayload.totalDays,
    goalDays: 30,
    habits: currentPayload.habits,
    toggledHabitMap: {},
    lastToggledHabitId: undefined,
    updatedAtMs: Date.now(),
  });

  let selectedHabitId: string | null = null;
  try {
    selectedHabitId = await AsyncStorage.getItem(SELECTED_WIDGET_HABIT_KEY);
  } catch {}
  const activeHeatmapHabit =
    (selectedHabitId && currentPayload.habits.find((h) => h.id === selectedHabitId)) ||
    currentPayload.habits.find((h) => h.habitName === currentPayload.habitName) ||
    currentPayload.habits[0];

  HeatmapWidget.updateSnapshot({
    preset,
    systemScheme,
    habitId: activeHeatmapHabit?.id,
    habitName: currentPayload.habitName,
    totalDays: currentPayload.totalDays,
    completedToday: Boolean(activeHeatmapHabit?.completedToday),
    todayCellIndex: getTodayIndexInMonthlyGrid(),
    gridLevels: currentPayload.gridLevels,
    habits: currentPayload.habits,
    activeHabitIndex: 0,
    toggledHabitMap: {},
    lastToggledHabitId: undefined,
    updatedAtMs: Date.now(),
  });

  // Strict "Due Today Only" + uncompleted filter before updating TodoWidget
  const todayYYYYMMDD = getTodayYYYYMMDD();
  const completedFromWidget = new Set(await consumeWidgetCompletedTaskIds());
  const cleanTasks = currentPayload.tasks.filter(
    (t) =>
      !t.completed &&
      !completedFromWidget.has(t.id) &&
      (!t.dueDate || t.dueDate <= todayYYYYMMDD)
  );

  TodoWidget.updateSnapshot({
    preset,
    systemScheme,
    title: 'To-Do List',
    tasks: cleanTasks,
    completedTaskIds: [],
    lastCompletedTaskId: undefined,
  });

  const diffMs = Math.max(
    0,
    new Date(currentPayload.countdown.targetDateIso).getTime() - Date.now()
  );
  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutesLeft = Math.floor((diffMs / (1000 * 60)) % 60);

  CountdownWidget.updateSnapshot({
    preset,
    systemScheme,
    eventTitle: currentPayload.countdown.title,
    targetDateLabel: currentPayload.countdown.dateLabel,
    daysLeft,
    hoursLeft,
    minutesLeft,
  });

  // CalendarWidget snapshot update
  const nowCalendar = new Date();
  const weekdayLabel = nowCalendar
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase();
  const dayNumber = String(nowCalendar.getDate());

  CalendarWidget.updateSnapshot({
    preset,
    systemScheme,
    weekdayLabel,
    dayNumber,
    events: currentPayload.calendarEvents ?? [],
    upcomingEvents: currentPayload.upcomingCalendarEvents ?? [],
  });

  // Schedule live timeline entries for PomodoroWidget so it counts down even when app is closed!
  if (currentPayload.pomodoro.isRunning && currentPayload.pomodoro.endTimeMs) {
    const now = Date.now();
    const endMs = currentPayload.pomodoro.endTimeMs;
    const totalRemainingSecs = Math.max(0, Math.ceil((endMs - now) / 1000));

    const entries: { date: Date; props: any }[] = [];
    // Generate 60 entries (every 1s for the first 30s, then every 5s/15s) so iOS ticks live on Home Screen
    const offsets = [
      ...Array.from({ length: 30 }, (_, i) => i),
      ...Array.from({ length: 30 }, (_, i) => 30 + i * 5),
    ];

    for (const offsetSec of offsets) {
      const rem = Math.max(0, totalRemainingSecs - offsetSec);
      entries.push({
        date: new Date(now + offsetSec * 1000),
        props: {
          preset,
          systemScheme,
          taskLabel: currentPayload.pomodoro.taskLabel || 'Focus',
          durationSeconds: rem,
          isRunning: rem > 0,
          endTimeMs: rem > 0 ? endMs : undefined,
          lastAction: 'none',
          source: 'app',
          updatedAtMs: currentPayload.pomodoro.updatedAtMs ?? now,
        },
      });
      if (rem === 0) break;
    }

    PomodoroWidget.updateTimeline(entries);
  } else {
    PomodoroWidget.updateSnapshot({
      preset,
      systemScheme,
      taskLabel: currentPayload.pomodoro.taskLabel || 'Focus',
      durationSeconds: currentPayload.pomodoro.durationSeconds || 1500,
      isRunning: false,
      endTimeMs: 0,
      lastAction: 'none',
      source: 'app',
      updatedAtMs: currentPayload.pomodoro.updatedAtMs ?? Date.now(),
    });
  }
};

export const syncAllWidgetsFromApp = async (
  partialData?: Partial<Omit<FocalystWidgetPayload, 'preset'>> & { preset?: WidgetColorPreset },
  overrideSystemScheme?: SystemColorScheme
) => {
  await ensureWidgetStateHydrated();
  if (isReconciling) return;

  if (partialData) {
    // Never allow a caller that didn't explicitly set preset to overwrite currentPayload.preset
    const nextPreset = partialData.preset ?? currentPayload.preset;
    const todayYYYYMMDD = getTodayYYYYMMDD();
    const filteredTasks = partialData.tasks
      ? partialData.tasks.filter(
          (t) => !t.completed && (!t.dueDate || t.dueDate <= todayYYYYMMDD)
        )
      : currentPayload.tasks;
    currentPayload = {
      ...currentPayload,
      ...partialData,
      tasks: filteredTasks,
      preset: nextPreset,
    };
    if (partialData.pomodoro) {
      await AsyncStorage.setItem(
        POMODORO_SESSION_STORAGE_KEY,
        JSON.stringify(currentPayload.pomodoro)
      );
    }
    if (partialData.calendarEvents || partialData.upcomingCalendarEvents) {
      await AsyncStorage.setItem(
        CALENDAR_EVENTS_STORAGE_KEY,
        JSON.stringify({
          today: currentPayload.calendarEvents,
          upcoming: currentPayload.upcomingCalendarEvents,
        })
      );
    }
  }

  await pushSnapshotsToNativeWidgets(overrideSystemScheme);
  payloadListeners.forEach((cb) => cb());
};

export const initializeWidgetListeners = () => {
  ensureWidgetStateHydrated().then(async () => {
    await reconcileWidgetsToApp();
    await pushSnapshotsToNativeWidgets();
  });

  const appearanceSub = Appearance.addChangeListener(({ colorScheme }) => {
    const nextScheme: SystemColorScheme = colorScheme === 'light' ? 'light' : 'dark';
    pushSnapshotsToNativeWidgets(nextScheme);
  });

  const appStateSub = AppState.addEventListener('change', async (nextState) => {
    if (nextState === 'active') {
      // Read widget completions, habit toggles & Pomodoro taps FIRST before pushing app state!
      await reconcileWidgetsToApp();
      await pushSnapshotsToNativeWidgets();
      payloadListeners.forEach((cb) => cb());
    } else if (nextState === 'background' || nextState === 'inactive') {
      // When minimizing the app, schedule the live Pomodoro timeline so the widget keeps ticking!
      await pushSnapshotsToNativeWidgets();
    }
  });

  let interactionSub: { remove?: () => void } | null = null;
  try {
    interactionSub = addUserInteractionListener(async () => {
      await reconcileWidgetsToApp();
      await pushSnapshotsToNativeWidgets();
      payloadListeners.forEach((cb) => cb());
    });
  } catch {}

  return () => {
    appearanceSub.remove();
    appStateSub.remove();
    interactionSub?.remove?.();
  };
};
