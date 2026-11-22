export type WidgetColorPreset =
  | 'white'
  | 'monochrome'
  | 'ember'
  | 'cobalt'
  | 'emerald'
  | 'violet'
  | 'crimson'
  | 'amber';

export type SystemColorScheme = 'light' | 'dark';

export type WidgetEnv = {
  colorScheme?: SystemColorScheme;
  widgetFamily?: 'systemSmall' | 'systemMedium' | 'systemLarge';
  widgetRenderingMode?: 'fullColor' | 'accented' | 'vibrant';
};

export type BaseWidgetThemeProps = {
  preset?: WidgetColorPreset;
  systemScheme?: SystemColorScheme;
};

export type HabitHeatmapItem = {
  id: string;
  habitName: string;
  streakDays?: number;
  totalDays: number;
  completedToday?: boolean;
  gridLevels: number[];
};

export type HabitWidgetToggleEntry = {
  completed: boolean;
  date: string;
  updatedAtMs?: number;
};

export type HabitWidgetToggleValue = boolean | HabitWidgetToggleEntry;

export type StreakWidgetProps = BaseWidgetThemeProps & {
  snapshotDate?: string;
  habitName?: string;
  streakDays?: number;
  totalDays?: number;
  goalDays?: number;
  habits?: HabitHeatmapItem[];
  toggledHabitMap?: Record<string, HabitWidgetToggleValue>;
  lastToggledHabitId?: string;
  updatedAtMs?: number;
};

export type HeatmapWidgetProps = BaseWidgetThemeProps & {
  snapshotDate?: string;
  habitId?: string;
  habitName: string;
  totalDays: number;
  completedToday?: boolean;
  todayCellIndex?: number;
  gridLevels: number[];
  habits?: HabitHeatmapItem[];
  activeHabitIndex?: number;
  toggledHabitMap?: Record<string, HabitWidgetToggleValue>;
  lastToggledHabitId?: string;
  updatedAtMs?: number;
  monthLabel?: string;
  yearLabel?: string;
};

export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
};

export type TodoWidgetProps = BaseWidgetThemeProps & {
  title: string;
  tasks: TodoItem[];
  lastCompletedTaskId?: string;
  completedTaskIds?: string[];
};

export type CountdownWidgetProps = BaseWidgetThemeProps & {
  eventTitle: string;
  targetDateLabel: string;
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
};

export type PomodoroWidgetProps = BaseWidgetThemeProps & {
  taskLabel: string;
  durationSeconds: number;
  isRunning: boolean;
  endTimeMs?: number;
  lastAction?: 'start' | 'end' | 'none';
  source?: 'widget' | 'app';
  updatedAtMs?: number;
};

export type CalendarEventItem = {
  id: string;
  title: string;
  timeLabel: string; // e.g. "09:00 - 10:45", "9–10PM", or "All-day"
  category?: string;
  accentColor?: string;
  completed?: boolean;
  dateIso?: string; // YYYY-MM-DD
  dateHeader?: string; // e.g. "TUESDAY, 3 NOV" for upcoming days
  isToday?: boolean;
};

export type CalendarWidgetProps = BaseWidgetThemeProps & {
  weekdayLabel: string;
  dayNumber: string;
  events: CalendarEventItem[];
  upcomingEvents?: CalendarEventItem[];
};

