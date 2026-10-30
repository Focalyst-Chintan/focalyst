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

export type StreakWidgetProps = BaseWidgetThemeProps & {
  habitName: string;
  streakDays: number;
  totalDays: number;
  goalDays?: number;
};

export type HabitHeatmapItem = {
  id: string;
  habitName: string;
  totalDays: number;
  gridLevels: number[];
};

export type HeatmapWidgetProps = BaseWidgetThemeProps & {
  habitName: string;
  totalDays: number;
  gridLevels: number[];
  habits?: HabitHeatmapItem[];
  activeHabitIndex?: number;
  monthLabel?: string;
  yearLabel?: string;
};

export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
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
  category?: string; // e.g. "Study" | "Personal" | "Work" | "Health"
  accentColor?: string; // e.g. "#8B5CF6" | "#F97316" | "#EF4444" | "#10B981"
  completed?: boolean;
  dateIso?: string; // YYYY-MM-DD
};

export type CalendarWidgetProps = BaseWidgetThemeProps & {
  weekdayLabel: string; // e.g. "WEDNESDAY"
  dayNumber: string; // e.g. "28"
  events: CalendarEventItem[];
};

