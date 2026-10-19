import { useState, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../utils/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  task_reminders_enabled: boolean;
  habit_reminders_enabled: boolean;
  pomodoro_alerts_enabled: boolean;
}

export interface ThreeStageReminderInput {
  title: string;
  tag?: string;
  eventStartDate: Date; // Exact Date & Time when the reminder starts (use 9:00 AM local time if all_day is true)
  timeLabel: string;    // e.g. "08:00 PM" or "All-day"
  dateLabel: string;    // e.g. "20 Oct 2026"
}

interface UseNotificationsReturn {
  expoPushToken: string | null;
  hasPermission: boolean;
  preferences: NotificationPreferences;
  /** Schedule a local notification when a Pomodoro focus session ends */
  schedulePomodoroAlert: (focusDurationSeconds: number) => Promise<string | null>;
  /** Schedule a local notification for a calendar event at a specific date/time */
  scheduleCalendarReminder: (title: string, triggerDate: Date) => Promise<string | null>;
  /** Schedule 3-stage local notifications (3 days, 24h, start) for a calendar reminder */
  scheduleThreeStageCalendarNotifications: (input: ThreeStageReminderInput) => Promise<string[]>;
  /** Schedule a local notification 2 hours before a countdown target date */
  scheduleCountdownAlert: (eventName: string, targetDate: Date) => Promise<string | null>;
  /** Schedule dual notifications (start + follow-up check-in) for a habit across selected days */
  scheduleHabitNotifications: (params: {
    habitId: string;
    habitName: string;
    icon?: string;
    hour: number;
    minute: number;
    durationMinutes: number;
    repeatDays: number[];
  }) => Promise<string[]>;
  /** Schedule dual notifications (start + end check-in) for a scheduled task */
  scheduleTaskStartAndEndReminders: (
    taskTitle: string,
    startDate: Date,
    endDate: Date
  ) => Promise<string[]>;
  /** Cancel all scheduled notifications for a specific habit */
  cancelHabitNotifications: (habitId: string) => Promise<void>;
  /** Cancel a previously scheduled notification by its identifier */
  cancelNotification: (identifier: string) => Promise<void>;
  /** Refresh preferences from the database */
  refreshPreferences: () => Promise<void>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EAS_PROJECT_ID = '1ed8f19c-1e10-4ec1-a390-7c4d4c6211a3';

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    task_reminders_enabled: true,
    habit_reminders_enabled: true,
    pomodoro_alerts_enabled: true,
  });

  const didRegister = useRef(false);

  // ── Register push token on mount ──────────────────────────────────────────

  useEffect(() => {
    if (didRegister.current) return;
    didRegister.current = true;

    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      // Push tokens only work on physical devices
      if (!Device.isDevice) {

        return;
      }

      // Check / request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted for push notifications');
        setHasPermission(false);
        return;
      }

      setHasPermission(true);

      // Android-specific notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B00',
        });
      }

      // Check if running inside Expo Go (StoreClient) where push notifications require development build
      if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
        console.warn('[Notifications] Running inside Expo Go: Push notifications are disabled in Expo Go. Use a development build for push notification testing.');
        return;
      }

      // Get the Expo Push Token
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });
      const token = tokenResponse.data;
      setExpoPushToken(token);

      // Upsert token + timezone into the authenticated user's profile
      await upsertTokenToProfile(token);
    } catch (error) {
      console.warn('[Notifications] Note: Could not register push notification token:', error);
    }
  };

  const upsertTokenToProfile = async (token: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('[Notifications] No authenticated user — skipping token upsert');
        return;
      }

      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const { error } = await supabase
        .from('users')
        .update({
          expo_push_token: token,
          timezone: detectedTimezone,
        })
        .eq('id', session.user.id);

      if (error) {
        console.error('[Notifications] Error upserting push token:', error.message);
      } else {

      }
    } catch (err) {
      console.error('[Notifications] Unexpected error during token upsert:', err);
    }
  };

  // ── Fetch notification preferences ────────────────────────────────────────

  const refreshPreferences = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('users')
        .select('task_reminders_enabled, habit_reminders_enabled, pomodoro_alerts_enabled')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('[Notifications] Error fetching preferences:', error.message);
        return;
      }

      if (data) {
        setPreferences({
          task_reminders_enabled: data.task_reminders_enabled ?? true,
          habit_reminders_enabled: data.habit_reminders_enabled ?? true,
          pomodoro_alerts_enabled: data.pomodoro_alerts_enabled ?? true,
        });
      }
    } catch (err) {
      console.error('[Notifications] Unexpected error fetching preferences:', err);
    }
  }, []);

  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  // ── Scheduling helpers ────────────────────────────────────────────────────

  /**
   * Schedule a Pomodoro completion alert.
   * Returns the notification identifier (for cancellation), or null on failure.
   */
  const schedulePomodoroAlert = useCallback(
    async (focusDurationSeconds: number): Promise<string | null> => {
      if (!preferences.pomodoro_alerts_enabled) {

        return null;
      }

      try {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🍅 Focus Session Complete!',
            body: 'Focus session complete! Time to take a break.',
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: focusDurationSeconds,
            repeats: false,
          },
        });


        return identifier;
      } catch (err) {
        console.error('[Notifications] Error scheduling pomodoro alert:', err);
        return null;
      }
    },
    [preferences.pomodoro_alerts_enabled]
  );

  /**
   * Schedule a calendar event reminder notification at a specific date/time.
   * Returns the notification identifier, or null on failure.
   */
  const scheduleCalendarReminder = useCallback(
    async (title: string, triggerDate: Date): Promise<string | null> => {
      if (!preferences.task_reminders_enabled) {

        return null;
      }

      // Don't schedule notifications in the past
      if (triggerDate.getTime() <= Date.now()) {

        return null;
      }

      try {
        const secondsUntilTrigger = Math.max(
          1,
          Math.floor((triggerDate.getTime() - Date.now()) / 1000)
        );

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Reminder',
            body: title,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilTrigger,
            repeats: false,
          },
        });


        return identifier;
      } catch (err) {
        console.error('[Notifications] Error scheduling calendar reminder:', err);
        return null;
      }
    },
    [preferences.task_reminders_enabled]
  );

  /**
   * Schedules up to 3 local notifications for a calendar reminder:
   * 1) 3 days (72 hours) before eventStartDate
   * 2) 24 hours (1 day) before eventStartDate
   * 3) At the exact eventStartDate
   * Automatically skips any stage whose trigger time is <= Date.now()!
   */
  const scheduleThreeStageCalendarNotifications = useCallback(
    async (input: ThreeStageReminderInput): Promise<string[]> => {
      const scheduledIds: string[] = [];
      const nowMs = Date.now();
      const startMs = input.eventStartDate.getTime();

      const stages = [
        {
          triggerMs: startMs - 3 * 24 * 60 * 60 * 1000, // 3 days before
          title: `📅 Upcoming in 3 days: ${input.title}`,
          body: `${input.tag ? `[${input.tag}] ` : ''}Scheduled for ${input.dateLabel} • ${input.timeLabel}`,
        },
        {
          triggerMs: startMs - 24 * 60 * 60 * 1000, // 24 hours before
          title: `⏰ Reminder Tomorrow: ${input.title}`,
          body: `${input.tag ? `[${input.tag}] ` : ''}Happening tomorrow at ${input.timeLabel}`,
        },
        {
          triggerMs: startMs, // Exact start time
          title: `🔔 Starting Now: ${input.title}`,
          body: `${input.tag ? `[${input.tag}] ` : ''}${input.timeLabel}`,
        },
      ];

      for (const stage of stages) {
        // Only schedule if the trigger timestamp is strictly in the future (at least 5 seconds from now)
        if (stage.triggerMs > nowMs + 5000) {
          try {
            const secondsUntilTrigger = Math.max(
              1,
              Math.floor((stage.triggerMs - Date.now()) / 1000)
            );
            const id = await Notifications.scheduleNotificationAsync({
              content: {
                title: stage.title,
                body: stage.body,
                sound: 'default',
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsUntilTrigger,
                repeats: false,
              },
            });
            scheduledIds.push(id);
          } catch (err) {
            console.warn('[Notifications] Failed to schedule calendar stage:', err);
          }
        }
      }

      return scheduledIds;
    },
    []
  );

  /**
   * Schedule a countdown alert 2 hours before the target date (midnight).
   * Returns the notification identifier, or null on failure.
   */
  const scheduleCountdownAlert = useCallback(
    async (eventName: string, targetDate: Date): Promise<string | null> => {
      if (!preferences.task_reminders_enabled) {

        return null;
      }

      // Calculate 2 hours before midnight of the target date
      const alertDate = new Date(targetDate);
      alertDate.setHours(22, 0, 0, 0); // 10:00 PM the day before target_date

      const secondsUntilAlert = Math.floor(
        (alertDate.getTime() - Date.now()) / 1000
      );

      if (secondsUntilAlert <= 0) {

        return null;
      }

      try {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏳ Countdown Alert',
            body: `"${eventName}" is approaching! Less than a day remaining.`,
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilAlert,
            repeats: false,
          },
        });


        return identifier;
      } catch (err) {
        console.error('[Notifications] Error scheduling countdown alert:', err);
        return null;
      }
    },
    [preferences.task_reminders_enabled]
  );

  /**
   * Cancel all scheduled notifications for a specific habit.
   */
  const cancelHabitNotifications = useCallback(async (habitId: string): Promise<void> => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content?.data?.habitId === habitId) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (err) {
      console.error('[Notifications] Error cancelling habit notifications:', err);
    }
  }, []);

  /**
   * Schedule dual notifications per selected day:
   * 1. Start reminder at hour:minute
   * 2. End-of-duration check-in at hour:minute + durationMinutes
   */
  const scheduleHabitNotifications = useCallback(
    async (params: {
      habitId: string;
      habitName: string;
      icon?: string;
      hour: number;
      minute: number;
      durationMinutes: number;
      repeatDays: number[];
    }): Promise<string[]> => {
      const { habitId, habitName, icon, hour, minute, durationMinutes, repeatDays } = params;

      // Cancel any existing notifications for this habit first
      await cancelHabitNotifications(habitId);

      if (!preferences.habit_reminders_enabled) {
        return [];
      }

      const scheduledIds: string[] = [];
      const daysToSchedule = repeatDays.length > 0 ? repeatDays : [1, 2, 3, 4, 5, 6, 0];

      // Calculate end time
      const endTotalMinutes = hour * 60 + minute + durationMinutes;
      const endHour = Math.floor(endTotalMinutes / 60) % 24;
      const endMinute = endTotalMinutes % 60;
      const dayOffset = Math.floor(endTotalMinutes / 1440);

      for (const dayIndex of daysToSchedule) {
        try {
          // Expo Notifications expects weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
          // In Focalyst: 0 = Sun, 1 = Mon, ..., 6 = Sat
          const startExpoWeekday = (dayIndex % 7) + 1;
          const endDayIndex = (dayIndex + dayOffset) % 7;
          const endExpoWeekday = (endDayIndex % 7) + 1;

          // Notification 1 — Start Reminder
          const startId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${icon || '💪'} Time for ${habitName}!`,
              body: `Your ${durationMinutes}-minute session starts now. Let's keep your streak alive!`,
              sound: 'default',
              data: { habitId, type: 'habit_start' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: startExpoWeekday,
              hour,
              minute,
            },
          });
          scheduledIds.push(startId);

          // Notification 2 — End-of-Duration Check-In
          const checkInId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `✅ Did you finish ${habitName}?`,
              body: `Your ${durationMinutes}-minute window is up! Tap to mark ${habitName} complete for today.`,
              sound: 'default',
              data: { habitId, type: 'habit_checkin' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: endExpoWeekday,
              hour: endHour,
              minute: endMinute,
            },
          });
          scheduledIds.push(checkInId);
        } catch (err) {
          console.error(`[Notifications] Error scheduling habit notification for day ${dayIndex}:`, err);
        }
      }

      return scheduledIds;
    },
    [preferences.habit_reminders_enabled, cancelHabitNotifications]
  );

  /**
   * Schedule dual notifications for a task:
   * 1. Start notification at startDate
   * 2. End notification at endDate
   */
  const scheduleTaskStartAndEndReminders = useCallback(
    async (taskTitle: string, startDate: Date, endDate: Date): Promise<string[]> => {
      const scheduledIds: string[] = [];
      const now = Date.now();

      try {
        // Notification #1 (At startDate)
        if (startDate.getTime() > now) {
          const startId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Task Starting: ${taskTitle}`,
              body: `Your scheduled session starts now. Time to focus!`,
              sound: 'default',
              data: { type: 'task_start', taskTitle },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: startDate,
            },
          });
          scheduledIds.push(startId);
        }

        // Notification #2 (At endDate)
        if (endDate.getTime() > now) {
          const endId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `✅ Did you finish "${taskTitle}"?`,
              body: `Your scheduled time slot just ended. Tap to mark it complete!`,
              sound: 'default',
              data: { type: 'task_end', taskTitle },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: endDate,
            },
          });
          scheduledIds.push(endId);
        }
      } catch (err) {
        console.error('[Notifications] Error scheduling task start/end reminders:', err);
      }

      return scheduledIds;
    },
    []
  );

  /**
   * Cancel a previously scheduled notification.
   */
  const cancelNotification = useCallback(async (identifier: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);

    } catch (err) {
      console.error('[Notifications] Error cancelling notification:', err);
    }
  }, []);

  return {
    expoPushToken,
    hasPermission,
    preferences,
    schedulePomodoroAlert,
    scheduleCalendarReminder,
    scheduleThreeStageCalendarNotifications,
    scheduleCountdownAlert,
    scheduleHabitNotifications,
    scheduleTaskStartAndEndReminders,
    cancelHabitNotifications,
    cancelNotification,
    refreshPreferences,
  };
}
