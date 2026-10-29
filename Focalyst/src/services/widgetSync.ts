import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, AppState } from 'react-native';
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
export const CALENDAR_EVENTS_STORAGE_KEY = '@focalyst_calendar_events_widget_v1';

export type FocalystWidgetPayload = {
  preset: WidgetColorPreset;
  habitName: string;
  streakDays: number;
  totalDays: number;
  gridLevels: number[];
  habits: HabitHeatmapItem[];
  tasks: TodoItem[];
  calendarEvents: CalendarEventItem[];
  countdown: { title: string; dateLabel: string; targetDateIso: string };
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
  countdown: {
    title: 'AUDIT',
    dateLabel: '17/12/2026',
    targetDateIso: '2026-12-17T11:00:00.000Z',
  },
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
type PomodoroSyncHandler = (pomodoro: FocalystWidgetPayload['pomodoro']) => void;

const taskCompleteHandlers = new Set<TaskCompleteHandler>();
const pomodoroSyncHandlers = new Set<PomodoroSyncHandler>();
const payloadListeners = new Set<() => void>();

export const registerWidgetTaskCompleteHandler = (handler: TaskCompleteHandler) => {
  taskCompleteHandlers.add(handler);
  return () => taskCompleteHandlers.delete(handler);
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
      for (const handler of taskCompleteHandlers) {
        await handler(mergedIds);
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
  });

  HeatmapWidget.updateSnapshot({
    preset,
    systemScheme,
    habitName: currentPayload.habitName,
    totalDays: currentPayload.totalDays,
    gridLevels: currentPayload.gridLevels,
    habits: currentPayload.habits,
    activeHabitIndex: 0,
  });

  // Filter out any tasks completed from widget before updating TodoWidget
  const completedFromWidget = new Set(await consumeWidgetCompletedTaskIds());
  const cleanTasks = currentPayload.tasks.filter(
    (t) => !t.completed && !completedFromWidget.has(t.id)
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
    currentPayload = {
      ...currentPayload,
      ...partialData,
      preset: nextPreset,
    };
    if (partialData.pomodoro) {
      await AsyncStorage.setItem(
        POMODORO_SESSION_STORAGE_KEY,
        JSON.stringify(currentPayload.pomodoro)
      );
    }
    if (partialData.calendarEvents) {
      await AsyncStorage.setItem(
        CALENDAR_EVENTS_STORAGE_KEY,
        JSON.stringify(currentPayload.calendarEvents)
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
      // CRITICAL: Block any incoming syncAllWidgetsFromApp pushes while reconciling!
      isReconciling = true;
      try {
        // Read widget completions & Pomodoro taps FIRST before pushing app state!
        await reconcileWidgetsToApp();
        await pushSnapshotsToNativeWidgets();
        payloadListeners.forEach((cb) => cb());
      } finally {
        isReconciling = false;
      }
    } else if (nextState === 'background' || nextState === 'inactive') {
      // When minimizing the app, schedule the live Pomodoro timeline so the widget keeps ticking!
      await pushSnapshotsToNativeWidgets();
    }
  });

  return () => {
    appearanceSub.remove();
    appStateSub.remove();
  };
};
