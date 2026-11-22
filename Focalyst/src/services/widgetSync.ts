import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Appearance, AppState, DeviceEventEmitter } from 'react-native';
import { calculateHabitStreak } from '../utils/streak';
import { HABIT_GROUP_UPDATED_EVENT } from './habitGroupService';

function getExpoWidgetsModule(): typeof import('expo-widgets') | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  try {
    return require('expo-widgets');
  } catch {
    return null;
  }
}
import { queryCache } from '../utils/queryCache';
import { supabase, getCoalescedSession } from '../utils/supabase';
import StreakWidget from '../widgets/StreakWidget';
import HeatmapWidget from '../widgets/HeatmapWidget';
import TodoWidget from '../widgets/TodoWidget';
import CountdownWidget from '../widgets/CountdownWidget';
import PomodoroWidget from '../widgets/PomodoroWidget';
import CalendarWidget from '../widgets/CalendarWidget';
import VoiceNoteWidget from '../widgets/VoiceNoteWidget';
import type {
  CalendarEventItem,
  HabitHeatmapItem,
  HabitWidgetToggleEntry,
  HabitWidgetToggleValue,
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
  snapshotDate?: string;
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
  snapshotDate: undefined,
  habitName: '',
  streakDays: 0,
  totalDays: 0,
  gridLevels: Array(35).fill(0),
  habits: [],
  tasks: [],
  calendarEvents: [],
  upcomingCalendarEvents: [],
  countdown: {
    title: '',
    dateLabel: '',
    targetDateIso: '',
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
type HabitToggleHandler = (toggledHabits: Record<string, HabitWidgetToggleValue>) => Promise<void> | void;
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

export const formatLocalYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getTodayYYYYMMDD = (): string => formatLocalYYYYMMDD(new Date());

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
export const reconcileWidgetsToApp = async (knownUserId?: string) => {
  if (!getExpoWidgetsModule()) return;
  if (isReconciling) return;
  isReconciling = true;
  try {
    let activeUserId = knownUserId;
    if (!activeUserId) {
      try {
        const { data } = await getCoalescedSession();
        activeUserId = data?.session?.user?.id;
      } catch {}
    }

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
    const toggleEvents: {
      updatedAtMs: number;
      snapshotDate: string;
      map: Record<string, HabitWidgetToggleValue>;
    }[] = [];
    const todayYYYYMMDD = getTodayYYYYMMDD();

    for (const timeline of [streakTimeline, heatmapTimeline]) {
      if (Array.isArray(timeline) && timeline.length > 0) {
        for (const entry of timeline) {
          const p: any = entry?.props ?? entry;
          if (p?.toggledHabitMap && typeof p.toggledHabitMap === 'object' && Object.keys(p.toggledHabitMap).length > 0) {
            const snapDate =
              typeof p.snapshotDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.snapshotDate)
                ? p.snapshotDate
                : todayYYYYMMDD;
            toggleEvents.push({
              updatedAtMs: typeof p.updatedAtMs === 'number' ? p.updatedAtMs : 0,
              snapshotDate: snapDate,
              map: p.toggledHabitMap,
            });
          }
        }
      }
    }

    toggleEvents.sort((a, b) => a.updatedAtMs - b.updatedAtMs);
    const latestStreakToggles: Record<string, HabitWidgetToggleEntry> = {};
    for (const evt of toggleEvents) {
      for (const [hId, rawVal] of Object.entries(evt.map)) {
        if (typeof rawVal === 'boolean') {
          latestStreakToggles[hId] = {
            completed: rawVal,
            date: evt.snapshotDate,
            updatedAtMs: evt.updatedAtMs,
          };
        } else if (rawVal && typeof rawVal === 'object') {
          const entryDate =
            typeof rawVal.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawVal.date)
              ? rawVal.date
              : evt.snapshotDate;
          latestStreakToggles[hId] = {
            completed: Boolean(rawVal.completed),
            date: entryDate,
            updatedAtMs: typeof rawVal.updatedAtMs === 'number' ? rawVal.updatedAtMs : evt.updatedAtMs,
          };
        }
      }
    }

    const toggledHabitIds = Object.keys(latestStreakToggles);
    if (toggledHabitIds.length > 0) {
      const existingRaw = await AsyncStorage.getItem(HABIT_TOGGLES_FROM_WIDGET_KEY);
      const existingMap: Record<string, HabitWidgetToggleValue> = existingRaw ? JSON.parse(existingRaw) : {};
      const mergedToggles: Record<string, HabitWidgetToggleValue> = { ...existingMap, ...latestStreakToggles };
      await AsyncStorage.setItem(HABIT_TOGGLES_FROM_WIDGET_KEY, JSON.stringify(mergedToggles));

      const todayIdx = getTodayIndexInMonthlyGrid();
      let selectedHabitId: string | null = null;
      try {
        selectedHabitId = await AsyncStorage.getItem(SELECTED_WIDGET_HABIT_KEY);
      } catch {}

      currentPayload.habits = currentPayload.habits.map((h) => {
        if (!(h.id in latestStreakToggles)) return h;
        const toggleEntry = latestStreakToggles[h.id];
        if (toggleEntry.date !== todayYYYYMMDD) return h;
        const nextDone = Boolean(toggleEntry.completed);
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
          const uid = activeUserId;
          if (uid) {
            for (const [hId, toggleEntry] of Object.entries(latestStreakToggles)) {
              const targetDate = toggleEntry.date || todayYYYYMMDD;
              if (toggleEntry.completed) {
                const { error: upsertErr } = await supabase
                  .from('habit_logs')
                  .upsert(
                    [{ habit_id: hId, user_id: uid, completed_date: targetDate }],
                    { onConflict: 'habit_id,completed_date', ignoreDuplicates: true }
                  );
                if (upsertErr?.code === '42P10') {
                  const { data: existingLog } = await supabase
                    .from('habit_logs')
                    .select('id')
                    .eq('habit_id', hId)
                    .eq('completed_date', targetDate)
                    .limit(1);
                  if (!existingLog || existingLog.length === 0) {
                    await supabase
                      .from('habit_logs')
                      .insert([{ habit_id: hId, user_id: uid, completed_date: targetDate }]);
                  }
                }
              } else {
                await supabase
                  .from('habit_logs')
                  .delete()
                  .eq('habit_id', hId)
                  .eq('completed_date', targetDate);
              }

              // Recalculate true streak from habit_logs and persist to habits table
              const [{ data: habitRow }, { data: habitLogs }] = await Promise.all([
                supabase
                  .from('habits')
                  .select('id, frequency, custom_days')
                  .eq('id', hId)
                  .single(),
                supabase
                  .from('habit_logs')
                  .select('completed_date')
                  .eq('habit_id', hId)
                  .order('completed_date', { ascending: false })
                  .limit(1000),
              ]);
              const logDates = (habitLogs || []).map((l: any) => l.completed_date);
              const { currentStreak, bestStreak } = calculateHabitStreak(
                habitRow || { frequency: 'daily' },
                logDates,
                todayYYYYMMDD
              );
              await supabase
                .from('habits')
                .update({ current_streak: currentStreak, longest_streak: bestStreak })
                .eq('id', hId);

              currentPayload.habits = currentPayload.habits.map((item) =>
                item.id === hId
                  ? { ...item, streakDays: currentStreak, totalDays: new Set(logDates.map((d: any) => String(d).slice(0, 10))).size }
                  : item
              );
            }
            DeviceEventEmitter.emit(HABIT_GROUP_UPDATED_EVENT);
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

export const consumeWidgetToggledHabits = async (): Promise<Record<string, HabitWidgetToggleValue>> => {
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

export const completeTaskFromWidgetPreview = async (taskId: string, knownUserId?: string) => {
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
      let uid = knownUserId;
      if (!uid) {
        try {
          const { data } = await getCoalescedSession();
          uid = data?.session?.user?.id;
        } catch {}
      }
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

export const toggleHabitFromWidgetPreview = async (habitId: string, knownUserId?: string) => {
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

  const today = getTodayYYYYMMDD();
  const existingRaw = await AsyncStorage.getItem(HABIT_TOGGLES_FROM_WIDGET_KEY);
  const existingMap: Record<string, HabitWidgetToggleValue> = existingRaw ? JSON.parse(existingRaw) : {};
  const mergedToggles: Record<string, HabitWidgetToggleValue> = {
    ...existingMap,
    [habitId]: { completed: nextDone, date: today, updatedAtMs: Date.now() },
  };
  await AsyncStorage.setItem(HABIT_TOGGLES_FROM_WIDGET_KEY, JSON.stringify(mergedToggles));

  if (habitToggleHandlers.size > 0) {
    for (const handler of habitToggleHandlers) {
      await handler(mergedToggles);
    }
  } else {
    try {
      let uid = knownUserId;
      if (!uid) {
        try {
          const { data } = await getCoalescedSession();
          uid = data?.session?.user?.id;
        } catch {}
      }
      if (uid) {
        if (nextDone) {
          const { error: upsertErr } = await supabase
            .from('habit_logs')
            .upsert(
              [{ habit_id: habitId, user_id: uid, completed_date: today }],
              { onConflict: 'habit_id,completed_date', ignoreDuplicates: true }
            );
          if (upsertErr?.code === '42P10') {
            const { data: existingLog } = await supabase
              .from('habit_logs')
              .select('id')
              .eq('habit_id', habitId)
              .eq('completed_date', today)
              .limit(1);
            if (!existingLog || existingLog.length === 0) {
              await supabase
                .from('habit_logs')
                .insert([{ habit_id: habitId, user_id: uid, completed_date: today }]);
            }
          }
        } else {
          await supabase
            .from('habit_logs')
            .delete()
            .eq('habit_id', habitId)
            .eq('completed_date', today);
        }

        const [{ data: habitRow }, { data: habitLogs }] = await Promise.all([
          supabase
            .from('habits')
            .select('id, frequency, custom_days')
            .eq('id', habitId)
            .single(),
          supabase
            .from('habit_logs')
            .select('completed_date')
            .eq('habit_id', habitId)
            .order('completed_date', { ascending: false })
            .limit(1000),
        ]);
        const logDates = (habitLogs || []).map((l: any) => l.completed_date);
        const { currentStreak, bestStreak } = calculateHabitStreak(
          habitRow || { frequency: 'daily' },
          logDates,
          today
        );
        await supabase
          .from('habits')
          .update({ current_streak: currentStreak, longest_streak: bestStreak })
          .eq('id', habitId);
        DeviceEventEmitter.emit(HABIT_GROUP_UPDATED_EVENT);
      }
    } catch {}
  }

  await pushSnapshotsToNativeWidgets();
  payloadListeners.forEach((cb) => cb());
};

const pushSnapshotsToNativeWidgets = async (overrideScheme?: SystemColorScheme) => {
  if (!getExpoWidgetsModule()) return;
  await ensureWidgetStateHydrated();
  const systemScheme = overrideScheme ?? getSystemScheme();
  const preset = currentPayload.preset;
  const nowDate = new Date();
  const todayStr = formatLocalYYYYMMDD(nowDate);
  const tomorrowMidnight = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() + 1,
    0,
    0,
    5
  );
  const tomorrowStr = formatLocalYYYYMMDD(tomorrowMidnight);
  const dayAfterMidnight = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate() + 2,
    0,
    0,
    5
  );
  const dayAfterStr = formatLocalYYYYMMDD(dayAfterMidnight);
  const nowMs = Date.now();
  currentPayload.snapshotDate = todayStr;

  const tomorrowHabits = currentPayload.habits.map((h) => ({
    ...h,
    completedToday: false,
    streakDays: h.completedToday ? h.streakDays : 0,
  }));
  const dayAfterHabits = currentPayload.habits.map((h) => ({
    ...h,
    completedToday: false,
    streakDays: 0,
  }));

  const baseStreakProps = {
    preset,
    systemScheme,
    habitName: currentPayload.habitName,
    streakDays: currentPayload.streakDays,
    totalDays: currentPayload.totalDays,
    goalDays: 30,
    toggledHabitMap: {},
    lastToggledHabitId: undefined,
    updatedAtMs: nowMs,
  };

  if (typeof StreakWidget.updateTimeline === 'function') {
    StreakWidget.updateTimeline([
      {
        date: nowDate,
        props: {
          ...baseStreakProps,
          snapshotDate: todayStr,
          habits: currentPayload.habits,
        },
      },
      {
        date: tomorrowMidnight,
        props: {
          ...baseStreakProps,
          snapshotDate: tomorrowStr,
          habits: tomorrowHabits,
        },
      },
      {
        date: dayAfterMidnight,
        props: {
          ...baseStreakProps,
          snapshotDate: dayAfterStr,
          habits: dayAfterHabits,
        },
      },
    ]);
  } else {
    StreakWidget.updateSnapshot({
      ...baseStreakProps,
      snapshotDate: todayStr,
      habits: currentPayload.habits,
    });
  }

  let selectedHabitId: string | null = null;
  try {
    selectedHabitId = await AsyncStorage.getItem(SELECTED_WIDGET_HABIT_KEY);
  } catch {}
  const activeHeatmapHabit =
    (selectedHabitId && currentPayload.habits.find((h) => h.id === selectedHabitId)) ||
    currentPayload.habits.find((h) => h.habitName === currentPayload.habitName) ||
    currentPayload.habits[0];

  const baseHeatmapProps = {
    preset,
    systemScheme,
    habitId: activeHeatmapHabit?.id,
    habitName: currentPayload.habitName,
    totalDays: currentPayload.totalDays,
    gridLevels: currentPayload.gridLevels,
    activeHabitIndex: 0,
    toggledHabitMap: {},
    lastToggledHabitId: undefined,
    updatedAtMs: nowMs,
  };

  if (typeof HeatmapWidget.updateTimeline === 'function') {
    HeatmapWidget.updateTimeline([
      {
        date: nowDate,
        props: {
          ...baseHeatmapProps,
          snapshotDate: todayStr,
          completedToday: Boolean(activeHeatmapHabit?.completedToday),
          todayCellIndex: getTodayIndexInMonthlyGrid(nowDate),
          habits: currentPayload.habits,
        },
      },
      {
        date: tomorrowMidnight,
        props: {
          ...baseHeatmapProps,
          snapshotDate: tomorrowStr,
          completedToday: false,
          todayCellIndex: getTodayIndexInMonthlyGrid(tomorrowMidnight),
          habits: tomorrowHabits,
        },
      },
    ]);
  } else {
    HeatmapWidget.updateSnapshot({
      ...baseHeatmapProps,
      snapshotDate: todayStr,
      completedToday: Boolean(activeHeatmapHabit?.completedToday),
      todayCellIndex: getTodayIndexInMonthlyGrid(nowDate),
      habits: currentPayload.habits,
    });
  }

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

  VoiceNoteWidget.updateSnapshot({ preset, systemScheme });

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
    events: (currentPayload.calendarEvents ?? []).filter((event: any) => event.dateIso === getTodayYYYYMMDD()),
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
      calendarEvents: partialData.calendarEvents?.filter((event: any) => event.dateIso === todayYYYYMMDD) ?? currentPayload.calendarEvents,
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
      let activeUid: string | undefined;
      try {
        const { data } = await getCoalescedSession();
        activeUid = data?.session?.user?.id;
      } catch {}
      // Read widget completions, habit toggles & Pomodoro taps FIRST before pushing app state!
      await reconcileWidgetsToApp(activeUid);
      await pushSnapshotsToNativeWidgets();
      payloadListeners.forEach((cb) => cb());
    } else if (nextState === 'background' || nextState === 'inactive') {
      // When minimizing the app, schedule the live Pomodoro timeline so the widget keeps ticking!
      await pushSnapshotsToNativeWidgets();
    }
  });

  let interactionSub: { remove?: () => void } | null = null;
  try {
    const expoWidgets = getExpoWidgetsModule();
    if (expoWidgets?.addUserInteractionListener) {
      interactionSub = expoWidgets.addUserInteractionListener(async () => {
        await reconcileWidgetsToApp();
        await pushSnapshotsToNativeWidgets();
        payloadListeners.forEach((cb) => cb());
      });
    }
  } catch {}

  return () => {
    appearanceSub.remove();
    appStateSub.remove();
    interactionSub?.remove?.();
  };
};

export const clearWidgetsOnSignOut = async () => {
  currentPayload = {
    ...currentPayload,
    habitName: '', streakDays: 0, totalDays: 0, gridLevels: Array(35).fill(0), habits: [], tasks: [],
    calendarEvents: [], upcomingCalendarEvents: [], countdown: { title: '', dateLabel: '', targetDateIso: '' },
    countdowns: [], pomodoro: { taskLabel: '', durationSeconds: 0, isRunning: false, updatedAtMs: Date.now() },
  };
  const keys = [SELECTED_WIDGET_HABIT_KEY, SELECTED_WIDGET_COUNTDOWN_KEY, CALENDAR_EVENTS_STORAGE_KEY, POMODORO_SESSION_STORAGE_KEY, COMPLETED_FROM_WIDGET_KEY, HABIT_TOGGLES_FROM_WIDGET_KEY];
  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key).catch(() => {})));
  await pushSnapshotsToNativeWidgets();
  payloadListeners.forEach((cb) => cb());
};
