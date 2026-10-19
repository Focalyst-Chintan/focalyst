import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  DeviceEventEmitter,
  Platform,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/utils/supabase';
import TaskCard from '../../components/TaskCard';
import HabitList from '../../components/plan/HabitList';
import HabitForm from '../../components/plan/HabitForm';
import TaskForm from '../../components/plan/TaskForm';
import HabitMilestoneModal, { STREAK_MILESTONES } from '../../components/plan/HabitMilestoneModal';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  NestableScrollContainer,
  NestableDraggableFlatList,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SundayReportModal from '../../components/SundayReportModal';
import { isReportWindowOpen, isReportDismissedThisWeek, markReportDismissedThisWeek } from '../../src/utils/reportUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { awardXP } from '../../src/utils/xpService';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useUser } from '../../src/utils/UserContext';
import { queryCache } from '../../src/utils/queryCache';
import { ScreenSkeleton, ErrorRetryBanner } from '../../components/ui/ScreenSkeleton';

export { STREAK_MILESTONES };

type TabView = 'today' | 'calendar';

export const REMINDER_COLORS = [
  { label: 'Green', hex: '#10B981' },
  { label: 'Blue', hex: '#2B6BFF' },
  { label: 'Red', hex: '#EF4444' },
  { label: 'Purple', hex: '#8B5CF6' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Cyan', hex: '#06B6D4' },
];

export const REMINDER_TAGS = [
  { name: 'Health', icon: 'heart' as const, defaultColor: '#10B981' },
  { name: 'Work', icon: 'briefcase' as const, defaultColor: '#2B6BFF' },
  { name: 'Urgent', icon: 'alert-circle' as const, defaultColor: '#EF4444' },
  { name: 'Study', icon: 'book' as const, defaultColor: '#8B5CF6' },
  { name: 'Personal', icon: 'person' as const, defaultColor: '#F97316' },
];

interface Reminder {
  id: string;
  day: number | string;
  title: string;
  description?: string | null;
  allDay: boolean;
  starts: string;
  ends: string;
  repeat: string;
  customRepeatFrequency?: string | null;
  customRepeatEvery?: number | null;
  color?: string;
  tag?: string;
  isCompleted?: boolean;
  isStarred?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate() {
  const now = new Date();
  return {
    day: now.getDate().toString(),
    month: now.toLocaleString('en-US', { month: 'short' }),
    weekday: now.toLocaleString('en-US', { weekday: 'long' }),
  };
}

function parseTimeString(timeStr: string): Date {
  const d = new Date();
  if (!timeStr) return d;
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    let hrs = parseInt(hours, 10);
    const mins = parseInt(minutes, 10);
    if (modifier === 'PM' && hrs < 12) {
      hrs += 12;
    }
    if (modifier === 'AM' && hrs === 12) {
      hrs = 0;
    }
    d.setHours(hrs, mins, 0, 0);
  } else {
    const parts = timeStr.split(':');
    d.setHours(parseInt(parts[0], 10) || 8, parseInt(parts[1], 10) || 0, 0, 0);
  }
  return d;
}

function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getCustomRepeatSummary(freq: string, every: number): string {
  const freqLower = freq.toLowerCase();
  if (every === 1) {
    if (freqLower === 'daily') return 'Event will occur every day.';
    if (freqLower === 'weekly') return 'Event will occur every week.';
    if (freqLower === 'monthly') return 'Event will occur every month.';
    if (freqLower === 'yearly') return 'Event will occur every year.';
  }
  
  let unit = '';
  if (freqLower === 'daily') unit = 'day';
  else if (freqLower === 'weekly') unit = 'week';
  else if (freqLower === 'monthly') unit = 'month';
  else if (freqLower === 'yearly') unit = 'year';

  return `Event will occur every ${every} ${unit}s.`;
}

function getRepeatLabel(repeatOpt: string, freq?: string | null, every?: number | null): string {
  if (repeatOpt === 'Custom' && freq) {
    const f = freq.toLowerCase();
    const ev = every || 1;
    if (ev === 1) {
      if (f === 'daily') return 'Every Day';
      if (f === 'weekly') return 'Every Week';
      if (f === 'monthly') return 'Every Month';
      if (f === 'yearly') return 'Every Year';
    }
    let unit = '';
    if (f === 'daily') unit = 'Days';
    else if (f === 'weekly') unit = 'Weeks';
    else if (f === 'monthly') unit = 'Months';
    else if (f === 'yearly') unit = 'Years';
    return `Every ${ev} ${unit}`;
  }
  return repeatOpt;
}

export default function PlanTab() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, profile } = useUser();
  const currentUserId = user?.id || profile?.id || '';

  const [activeTab, setActiveTab] = useState<TabView>('today');
  const [userName, setUserName] = useState<string>(profile?.full_name ? profile.full_name.split(' ')[0] : 'Sohan');
  const [userId, setUserId] = useState<string>(currentUserId);

  // Synchronous cache hydration: instantaneous 0ms display on tab switch
  const cachedTasks = currentUserId ? (queryCache.getSync<any[]>(`user:${currentUserId}:tasks`) || []) : [];
  const [tasks, setTasks] = useState<any[]>(cachedTasks);
  const [loading, setLoading] = useState(cachedTasks.length === 0 && !profile);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isSundayModalVisible, setIsSundayModalVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Shared theme state
  const [milestoneStreakData, setMilestoneStreakData] = useState<{ habit: any; streak: number } | null>(null);

  // Notification scheduling helpers
  const {
    scheduleCalendarReminder,
    scheduleThreeStageCalendarNotifications,
    cancelNotification,
    preferences: notifPrefs,
  } = useNotifications();

  // Track notification IDs array by reminder ID for cancellation
  const notifIdMapRef = React.useRef<Record<string, string[]>>({});
  // Per-task completion timer map preventing rapid tap collisions
  const completionTimersRef = React.useRef<Record<string, any>>({});

  // Load theme from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem('darkMode');
        if (val !== null) {
          setDarkMode(val === 'true');
        }
      } catch (e) {
        console.warn('Error loading darkMode in plan.tsx:', e);
      }
    })();

    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setDarkMode(newVal);
    });
    return () => sub.remove();
  }, []);

  // Set up listener or refetch when parameters trigger (e.g. returning to this tab)
  useEffect(() => {
    if (params?.action === 'addTask') {
      setEditingTask(null);
      setIsTaskFormOpen(true);
      router.setParams({ action: '' });
    }
  }, [params?.action]);

  // Calendar Specific States
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed (1 = Jan, 12 = Dec, 5 = May)
  const [isAddingReminder, setIsAddingReminder] = useState<boolean>(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  
  const [reminderTitle, setReminderTitle] = useState<string>('');
  const [reminderDescription, setReminderDescription] = useState<string>('');
  const [reminderColor, setReminderColor] = useState<string>('#2B6BFF');
  const [reminderTag, setReminderTag] = useState<string>('Work');
  const [allUserReminders, setAllUserReminders] = useState<any[]>([]);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState<boolean>(false);
  const [pickerStep, setPickerStep] = useState<'year' | 'month'>('year');
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());

  const [allDay, setAllDay] = useState<boolean>(false);
  const [startsTime, setStartsTime] = useState<string>('08:00 AM');
  const [endsTime, setEndsTime] = useState<string>('09:00 AM');
  const [repeatOption, setRepeatOption] = useState<string>('Never');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);

  // Picker and custom repeat state variables
  const [showStartsPicker, setShowStartsPicker] = useState<boolean>(false);
  const [showEndsPicker, setShowEndsPicker] = useState<boolean>(false);
  const [showRepeatModal, setShowRepeatModal] = useState<boolean>(false);
  const [customFrequency, setCustomFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Daily');
  const [customEvery, setCustomEvery] = useState<number>(1);
  const [showCustomRepeatScreen, setShowCustomRepeatScreen] = useState<boolean>(false);
  const [showFrequencyPicker, setShowFrequencyPicker] = useState<boolean>(false);
  const [showEveryPicker, setShowEveryPicker] = useState<boolean>(false);

  // Habit Form States
  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [habitRefreshKey, setHabitRefreshKey] = useState(0);

  // Task Form States
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  // Hero Today Event Count
  const [todaysEventCount, setTodaysEventCount] = useState<number>(0);

  // Dynamic Theme definitions for plan tab
  const theme = {
    bg: darkMode ? '#0B1021' : '#F4F6FA',
    cardBg: darkMode ? '#151B2E' : '#FFFFFF',
    textPrimary: darkMode ? '#FFFFFF' : '#1E2229',
    textSecondary: darkMode ? '#8E95A9' : '#5C6479',
    borderColor: darkMode ? '#222A41' : '#E2E8F0',
    accentOrange: '#FF6B00',
    accentBlue: '#2B6BFF',
    modalBg: darkMode ? '#151B2E' : '#F1F5F9',
    modalInputBg: darkMode ? '#0B1021' : '#FFFFFF',
    modalTextPrimary: darkMode ? '#FFFFFF' : '#0F172A',
    modalTextSecondary: darkMode ? '#94A3B8' : '#64748B',
    modalBorder: darkMode ? '#222A41' : '#E2E8F0',
    white: '#FFFFFF',
    colors: { primary: '#FF6B00' },
  };

  // Calendar Default Initialization (STEP 4)
  const todayString = new Date().toISOString().split('T')[0];
  const marks: Record<string, any> = {};
  const dummyCalendarProps = {
    current: todayString,
    markedDates: { ...marks, [todayString]: { selected: true, selectedColor: theme.colors.primary } }
  };

  const fetchTasks = async (forceRefresh: boolean = false) => {
    const targetUid = currentUserId || userId;
    if (!targetUid) return;
    try {
      if (tasks.length === 0) setLoadingTasks(true);
      const cacheKey = `user:${targetUid}:tasks`;
      if (forceRefresh) {
        queryCache.invalidatePrefix(`user:${targetUid}:tasks`);
      }
      const freshTasks = await queryCache.fetchWithCache(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', targetUid)
            .eq('is_completed', false)
            .order('position', { ascending: true })
            .order('created_at', { ascending: false });
          if (error) throw error;
          return data || [];
        },
        60_000,
        forceRefresh || queryCache.isStale(cacheKey)
      );

      if (freshTasks) {
        setTasks(freshTasks);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoadingTasks(false);
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    
    // Clear any pending timeout for this task if toggled rapidly
    if (completionTimersRef.current[id]) {
      clearTimeout(completionTimersRef.current[id]);
      delete completionTimersRef.current[id];
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_completed: nextStatus } : t))
    );

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed: nextStatus,
          completed_at: nextStatus ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;

      if (nextStatus) {
        completionTimersRef.current[id] = setTimeout(() => {
          setTasks((prev) => {
            const updated = prev.filter((t) => t.id !== id);
            if (userId) {
              queryCache.setSync(`user:${userId}:tasks`, updated);
            }
            return updated;
          });
          delete completionTimersRef.current[id];
        }, 800);
        awardXP(8, 'Task Completed');
      } else {
        if (userId) {
          queryCache.setSync(`user:${userId}:tasks`, (prev: any[] = []) =>
            prev.map((t) => (t.id === id ? { ...t, is_completed: false } : t))
          );
        }
      }
    } catch (e) {
      console.error('Error toggling task completion:', e);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_completed: currentStatus } : t))
      );
      if (userId) {
        queryCache.setSync(`user:${userId}:tasks`, (prev: any[] = []) =>
          prev.map((t) => (t.id === id ? { ...t, is_completed: currentStatus } : t))
        );
      }
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete task');
      fetchTasks();
    }
  };

  const syncTaskOrder = async (newOrderData: any[]) => {
    try {
      const updates = newOrderData.map((task, index) => ({
        id: task.id,
        user_id: userId,
        title: task.title,
        position: index,
      }));

      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
    } catch (e) {
      console.error('Error syncing task order:', e);
    }
  };

  const onDragEnd = ({ data }: { data: any[] }) => {
    setTasks(data);
    syncTaskOrder(data);
  };

  const fetchTodaysEventCount = async () => {
    if (!userId) return;
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('id')
        .eq('user_id', userId)
        .eq('day', todayDateStr);
      if (data) {
        setTodaysEventCount(data.length);
      }
    } catch (e) {
      console.warn("Error fetching today's events count:", e);
    }
  };

  const isMissingTableError = (error: any) => {
    if (!error) return false;
    const msg = error.message || '';
    const code = error.code || '';
    return (
      code === '42P01' || 
      code === 'PGRST116' ||
      msg.includes('relation "public.reminders" does not exist') ||
      msg.includes('relation "reminders" does not exist')
    );
  };

  const date = getFormattedDate();
  const greeting = getGreeting();

  const doesReminderOccurOnDate = (rem: any, targetYMD: string): boolean => {
    const originYMD = String(rem.day || rem.reminder_date || '').slice(0, 10);
    if (!originYMD) return false;
    if (originYMD === targetYMD) return true;
    if (targetYMD < originYMD) return false; // recurring events only repeat on or after their start date

    const [origY, origM, origD] = originYMD.split('-').map(Number);
    const [targY, targM, targD] = targetYMD.split('-').map(Number);
    const originDate = new Date(origY, origM - 1, origD, 12, 0, 0);
    const targetDate = new Date(targY, targM - 1, targD, 12, 0, 0);
    const diffDays = Math.round((targetDate.getTime() - originDate.getTime()) / 86400000);

    const rep = rem.repeat || rem.repeat_mode || 'Never';
    if (rep === 'Never') return false;
    if (rep === 'Every Day' || rep === 'Daily') return true;
    if (rep === 'Every Week' || rep === 'Weekly') return diffDays % 7 === 0;
    if (rep === 'Every 2 Weeks') return diffDays % 14 === 0;
    if (rep === 'Every Month' || rep === 'Monthly') return originDate.getDate() === targetDate.getDate();
    if (rep === 'Every Year' || rep === 'Yearly') {
      return originDate.getDate() === targetDate.getDate() && originDate.getMonth() === targetDate.getMonth();
    }
    if (rep === 'Custom') {
      const every = Math.max(1, Number(rem.custom_every || rem.custom_repeat_every || 1));
      const unit = String(rem.custom_unit || rem.custom_frequency || rem.custom_repeat_frequency || 'Daily');
      if (unit === 'Daily') return diffDays % every === 0;
      if (unit === 'Weekly') return diffDays % (every * 7) === 0;
      if (unit === 'Monthly') {
        const monthsDiff = (targetDate.getFullYear() - originDate.getFullYear()) * 12 + (targetDate.getMonth() - originDate.getMonth());
        return monthsDiff >= 0 && monthsDiff % every === 0 && originDate.getDate() === targetDate.getDate();
      }
      if (unit === 'Yearly') {
        const yearsDiff = targetDate.getFullYear() - originDate.getFullYear();
        return yearsDiff >= 0 && yearsDiff % every === 0 && originDate.getMonth() === targetDate.getMonth() && originDate.getDate() === targetDate.getDate();
      }
    }
    return false;
  };

  const fetchReminders = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const activeUid = userId || authData?.user?.id;
      if (!activeUid) return;

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', activeUid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setAllUserReminders(data);
        const selectedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const activeRems = data.filter((item: any) => doesReminderOccurOnDate(item, selectedDate));
        const mapped = activeRems.map((item: any) => ({
          id: item.id,
          day: selectedDay,
          title: item.title,
          description: item.description,
          allDay: item.all_day,
          starts: item.start_time,
          ends: item.end_time,
          repeat: item.repeat || item.repeat_mode || 'Never',
          customRepeatFrequency: item.custom_unit || item.custom_repeat_frequency,
          customRepeatEvery: item.custom_every || item.custom_repeat_every,
          color: item.color || '#2B6BFF',
          tag: item.tag || 'Work',
          isCompleted: !!item.is_completed,
          isStarred: !!item.is_starred,
        }));
        setReminders(mapped);
        setDbError(null);
      }
    } catch (e: any) {
      console.warn('Error fetching reminders:', e);
      if (isMissingTableError(e)) {
        setDbError("Database table 'reminders' is missing. Please create it in Supabase.");
      } else {
        setDbError(e.message || 'Failed to fetch reminders');
      }
    }
  };

  useEffect(() => {
    if (currentUserId) {
      setUserId(currentUserId);
      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]);
      }
      setLoading(false);
      // Hydrate from memory or disk snapshot immediately (0ms render)
      queryCache.getOrHydrate<any[]>(`user:${currentUserId}:tasks`).then((cached) => {
        if (cached && cached.length > 0) {
          setTasks(cached);
        }
      });
      // Parallelize tasks and reminders fetch with Promise.all
      Promise.all([
        fetchTasks(),
        fetchReminders(),
        fetchTodaysEventCount(),
      ]).catch((e) => console.warn('[PlanTab] Parallel fetch warning:', e));
    }
  }, [currentUserId, profile?.full_name]);

  useEffect(() => {
    async function checkSundayReport() {
      // 1. Strict Sunday-only guardrail
      if (!isReportWindowOpen()) {
        setIsSundayModalVisible(false);
        return;
      }

      try {
        // 2. Check local dismissal state (AsyncStorage + memory cache)
        const dismissed = await isReportDismissedThisWeek(userId);
        if (dismissed) {
          setIsSundayModalVisible(false);
          return;
        }

        // 3. Query existing report to check if seen_by_user is true
        const { data: report } = await supabase
          .from('reports')
          .select('id, seen_by_user')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (report && (report as any).seen_by_user === true) {
          await markReportDismissedThisWeek(userId, supabase);
          setIsSundayModalVisible(false);
          return;
        }

        setIsSundayModalVisible(true);
      } catch (e) {
        console.warn('Error checking Sunday report eligibility:', e);
      }
    }
    if (userId) {
      checkSundayReport();
    }
  }, [userId]);

  // Task 5: Listen for AI tool execution events to refresh Plan tab data immediately
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refreshPlanData', () => {
      fetchTasks(true);
      setHabitRefreshKey(prev => prev + 1);
    });
    return () => subscription.remove();
  }, [userId]);

  const handleReadNow = async () => {
    await markReportDismissedThisWeek(userId, supabase);
    setIsSundayModalVisible(false);
    router.push({
      pathname: '/insights',
      params: { openReport: 'true' },
    });
  };

  const handleCloseSundayModal = async () => {
    await markReportDismissedThisWeek(userId, supabase);
    setIsSundayModalVisible(false);
  };

  useEffect(() => {
    if (userId) {
      fetchReminders();
      fetchTodaysEventCount();
    }
  }, [userId, selectedDay]);

  const handleToggleReminderComplete = async (rem: Reminder) => {
    const updatedStatus = !rem.isCompleted;
    setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, isCompleted: updatedStatus } : r));
    try {
      await supabase
        .from('reminders')
        .update({ is_completed: updatedStatus })
        .eq('id', rem.id);
    } catch (err) {
      console.warn('Error toggling reminder completed status:', err);
    }
  };

  const handleToggleReminderStar = async (rem: Reminder) => {
    const updatedStar = !rem.isStarred;
    setReminders(prev => prev.map(r => r.id === rem.id ? { ...r, isStarred: updatedStar } : r));
    try {
      await supabase
        .from('reminders')
        .update({ is_starred: updatedStar })
        .eq('id', rem.id);
    } catch (err) {
      console.warn('Error toggling reminder star status:', err);
    }
  };

  const handleAddReminder = async () => {
    if (!reminderTitle.trim()) return;

    if (!allDay) {
      const startD = parseTimeString(startsTime);
      const endD = parseTimeString(endsTime);
      if (endD <= startD) {
        Alert.alert('Validation Error', 'End time must be later than start time.');
        return;
      }
    }

    const selectedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const activeUid = userId || authData?.user?.id;
      if (!activeUid) {
        Alert.alert('Error', 'Please sign in to save reminders.');
        return;
      }

      const payload: Record<string, any> = {
        user_id: activeUid,
        title: reminderTitle.trim(),
        description: reminderDescription.trim() || null,
        all_day: allDay,
        day: selectedDate,
        start_time: startsTime,
        end_time: endsTime,
        repeat: repeatOption,
        repeat_mode: repeatOption,
        custom_every: repeatOption === 'Custom' ? customEvery : null,
        custom_unit: repeatOption === 'Custom' ? customFrequency : null,
        color: reminderColor,
        tag: reminderTag,
        is_completed: false,
        is_starred: false,
      };

      let insertResult = await supabase
        .from('reminders')
        .insert([payload])
        .select()
        .single();

      // Safe fallback if optional new columns trigger schema error
      if (insertResult.error) {
        console.warn('Initial insert with all fields failed, trying core payload fallback:', insertResult.error);
        const fallbackPayload = {
          user_id: activeUid,
          title: reminderTitle.trim(),
          all_day: allDay,
          day: selectedDate,
          start_time: startsTime,
          end_time: endsTime,
          repeat: repeatOption,
        };
        insertResult = await supabase
          .from('reminders')
          .insert([fallbackPayload])
          .select()
          .single();
      }

      if (insertResult.error) throw insertResult.error;

      const createdReminder = insertResult.data;
      const createdId = createdReminder?.id;

      setDbError(null);
      await fetchReminders();
      fetchTodaysEventCount();

      // Schedule 3-stage local notifications (3 days before, 24h before, start time)
      try {
        const [y, m, d] = selectedDate.split('-').map(Number);
        let eventStartDate = new Date(y, m - 1, d, 9, 0, 0);
        if (!allDay && startsTime) {
          const parsed = parseTimeString(startsTime);
          eventStartDate = new Date(y, m - 1, d, parsed.getHours(), parsed.getMinutes(), 0);
        }

        const scheduledIds = await scheduleThreeStageCalendarNotifications({
          title: reminderTitle.trim(),
          tag: reminderTag,
          eventStartDate,
          timeLabel: allDay ? 'All-day' : `${startsTime} - ${endsTime}`,
          dateLabel: selectedDate,
        });

        if (createdId && scheduledIds.length > 0) {
          notifIdMapRef.current[createdId] = scheduledIds;
        }
      } catch (notifErr) {
        console.warn('Error scheduling 3-stage notifications:', notifErr);
      }

      setReminderTitle('');
      setReminderDescription('');
      setReminderColor('#2B6BFF');
      setReminderTag('Work');
      setAllDay(false);
      setStartsTime('08:00 AM');
      setEndsTime('09:00 AM');
      setRepeatOption('Never');
      setCustomFrequency('Daily');
      setCustomEvery(1);
      setIsAddingReminder(false);
    } catch (e: any) {
      console.warn('Error adding reminder:', e);
      if (isMissingTableError(e)) {
        setDbError("Database table 'reminders' is missing. Please create it in Supabase.");
      } else {
        setDbError(e.message || 'Failed to add reminder');
      }
    }
  };

  const handleCancelReminder = () => {
    setReminderTitle('');
    setReminderDescription('');
    setReminderColor('#2B6BFF');
    setReminderTag('Work');
    setAllDay(false);
    setStartsTime('08:00 AM');
    setEndsTime('09:00 AM');
    setRepeatOption('Never');
    setCustomFrequency('Daily');
    setCustomEvery(1);
    setIsAddingReminder(false);
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      setReminders(prev => prev.filter(r => r.id !== id));

      // Cancel any scheduled notifications for this reminder
      const notifIds = notifIdMapRef.current[id];
      if (notifIds && Array.isArray(notifIds)) {
        for (const notifId of notifIds) {
          await cancelNotification(notifId);
        }
        delete notifIdMapRef.current[id];
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDbError(null);
      await fetchReminders();
      fetchTodaysEventCount();
    } catch (e: any) {
      console.warn('Error deleting reminder:', e);
      if (isMissingTableError(e)) {
        setDbError("Database table 'reminders' is missing. Please create it in Supabase.");
      } else {
        setDbError(e.message || 'Failed to delete reminder');
      }
      fetchReminders();
    }
  };

  const handleStartEdit = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setReminderTitle(reminder.title);
    setReminderDescription(reminder.description || '');
    setReminderColor(reminder.color || '#2B6BFF');
    setReminderTag(reminder.tag || 'Work');
    setAllDay(reminder.allDay);
    setStartsTime(reminder.starts);
    setEndsTime(reminder.ends);
    setRepeatOption(reminder.repeat);
    if (reminder.repeat === 'Custom') {
      setCustomFrequency((reminder.customRepeatFrequency as any) || 'Daily');
      setCustomEvery(reminder.customRepeatEvery || 1);
    } else {
      setCustomFrequency('Daily');
      setCustomEvery(1);
    }
  };

  const handleCancelEdit = () => {
    setEditingReminderId(null);
    setReminderTitle('');
    setReminderDescription('');
    setReminderColor('#2B6BFF');
    setReminderTag('Work');
    setAllDay(false);
    setStartsTime('08:00 AM');
    setEndsTime('09:00 AM');
    setRepeatOption('Never');
    setCustomFrequency('Daily');
    setCustomEvery(1);
  };

  const handleUpdateReminder = async (id: string) => {
    if (!reminderTitle.trim()) return;

    if (!allDay) {
      const startD = parseTimeString(startsTime);
      const endD = parseTimeString(endsTime);
      if (endD <= startD) {
        Alert.alert('Validation Error', 'End time must be later than start time.');
        return;
      }
    }

    const selectedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const activeUid = userId || authData?.user?.id;

      const payload: Record<string, any> = {
        title: reminderTitle.trim(),
        description: reminderDescription.trim() || null,
        all_day: allDay,
        day: selectedDate,
        start_time: startsTime,
        end_time: endsTime,
        repeat: repeatOption,
        repeat_mode: repeatOption,
        custom_every: repeatOption === 'Custom' ? customEvery : null,
        custom_unit: repeatOption === 'Custom' ? customFrequency : null,
        color: reminderColor,
        tag: reminderTag,
        user_id: activeUid || null,
      };

      let updateResult = await supabase
        .from('reminders')
        .update(payload)
        .eq('id', id);

      if (updateResult.error) {
        console.warn('Update with extra columns failed, falling back to core payload:', updateResult.error);
        const fallbackPayload = {
          title: reminderTitle.trim(),
          all_day: allDay,
          day: selectedDate,
          start_time: startsTime,
          end_time: endsTime,
          repeat: repeatOption,
          user_id: activeUid || null,
        };
        updateResult = await supabase
          .from('reminders')
          .update(fallbackPayload)
          .eq('id', id);
      }

      if (updateResult.error) throw updateResult.error;

      setEditingReminderId(null);
      setReminderTitle('');
      setReminderDescription('');
      setReminderColor('#2B6BFF');
      setReminderTag('Work');
      setAllDay(false);
      setStartsTime('08:00 AM');
      setEndsTime('09:00 AM');
      setRepeatOption('Never');
      setCustomFrequency('Daily');
      setCustomEvery(1);
      setDbError(null);

      // Cancel old notifications and schedule 3-stage notifications
      const oldNotifIds = notifIdMapRef.current[id];
      if (oldNotifIds && Array.isArray(oldNotifIds)) {
        for (const notifId of oldNotifIds) {
          await cancelNotification(notifId);
        }
        delete notifIdMapRef.current[id];
      }

      try {
        const [y, m, d] = selectedDate.split('-').map(Number);
        let eventStartDate = new Date(y, m - 1, d, 9, 0, 0);
        if (!allDay && startsTime) {
          const parsed = parseTimeString(startsTime);
          eventStartDate = new Date(y, m - 1, d, parsed.getHours(), parsed.getMinutes(), 0);
        }

        const scheduledIds = await scheduleThreeStageCalendarNotifications({
          title: reminderTitle.trim(),
          tag: reminderTag,
          eventStartDate,
          timeLabel: allDay ? 'All-day' : `${startsTime} - ${endsTime}`,
          dateLabel: selectedDate,
        });

        if (scheduledIds.length > 0) {
          notifIdMapRef.current[id] = scheduledIds;
        }
      } catch (notifErr) {
        console.warn('Error rescheduling notifications on update:', notifErr);
      }

      await fetchReminders();
      fetchTodaysEventCount();
    } catch (e: any) {
      console.warn('Error updating reminder:', e);
      if (isMissingTableError(e)) {
        setDbError("Database table 'reminders' is missing. Please create it in Supabase.");
      } else {
        setDbError(e.message || 'Failed to update reminder');
      }
    }
  };

  // Dynamically generate calendar days for the currentYear and currentMonth
  const getCalendarDays = () => {
    // Month is 0-indexed in JS Date: Jan = 0, Dec = 11
    const jsMonth = currentMonth - 1;
    // Get first day of the month
    const firstDay = new Date(currentYear, jsMonth, 1);
    // Day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
    // Convert to Mo-Su layout: Mo = 0, Tu = 1, We = 2, Th = 3, Fr = 4, Sa = 5, Su = 6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday gets converted to index 6

    // Total days in current month
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    // Total days in previous month
    const prevMonthTotalDays = new Date(currentYear, jsMonth, 0).getDate();

    const daysList = [];

    // Add padding days from the previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      daysList.push({ day: prevMonthTotalDays - i, isCurrentMonth: false });
    }

    // Add days of the current month
    for (let i = 1; i <= totalDays; i++) {
      daysList.push({ day: i, isCurrentMonth: true });
    }

    return daysList;
  };

  const calendarDays = getCalendarDays();

  const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  function getGreetingKey(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'plan.morning';
    if (hour < 17) return 'plan.afternoon';
    return 'plan.evening';
  }

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Header Greeting */}
      <Text style={[styles.greetingText, { color: theme.textPrimary }]}>
        {t(getGreetingKey())}, {userName}
      </Text>

      {/* Tab Toggle Row */}
      <View style={[styles.tabToggleRow, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'today' && { backgroundColor: darkMode ? '#2D354E' : '#4a6c8c' },
          ]}
          onPress={() => setActiveTab('today')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabButtonText, 
            { color: theme.textSecondary },
            activeTab === 'today' && { color: '#FFFFFF' }
          ]}>
            {t('plan.today')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'calendar' && { backgroundColor: darkMode ? '#2D354E' : '#4a6c8c' },
          ]}
          onPress={() => setActiveTab('calendar')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabButtonText, 
            { color: theme.textSecondary },
            activeTab === 'calendar' && { color: '#FFFFFF' }
          ]}>
            {t('plan.calendar')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Row */}
      <View style={styles.dateRow}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.dateDayText, { color: theme.textPrimary }]}>{date.day}</Text>
            <Text style={[styles.dateMonthText, { color: theme.textPrimary }]}>{date.month}</Text>
          </View>
          <Text style={[styles.dateWeekdayText, { color: theme.textSecondary }]}>{date.weekday}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
          <Text style={[styles.noEventsText, { color: theme.textSecondary }]}>
            {todaysEventCount === 0
              ? t('plan.noEvents')
              : todaysEventCount === 1
              ? `1 ${t('plan.event')}`
              : `${todaysEventCount} ${t('plan.events')}`}
          </Text>
        </View>
      </View>

      {activeTab === 'today' && (
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('plan.todo')}</Text>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerWrapper}>
      {activeTab === 'today' && (
        <>
          {/* Orange add task button */}
          <TouchableOpacity
            style={[styles.orangeButton, { backgroundColor: theme.accentOrange, shadowColor: theme.accentOrange }]}
            onPress={() => {
              setEditingTask(null);
              setIsTaskFormOpen(true);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.orangeButtonText}>{t('plan.addTask')}</Text>
          </TouchableOpacity>

          {/* Habits Tracker */}
          <View style={{ marginTop: 24 }}>
            <HabitList
              key={`habit-list-${habitRefreshKey}`}
              userId={userId}
              isDarkMode={darkMode}
              onAddHabitPress={() => {
                setEditingHabit(null);
                setIsHabitFormOpen(true);
              }}
              onEditHabitPress={(habit) => {
                setEditingHabit(habit);
                setIsHabitFormOpen(true);
              }}
              onMilestonePress={(habit, streak) => {
                setMilestoneStreakData({ habit, streak });
              }}
            />
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {activeTab === 'today' ? (
          <NestableScrollContainer
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.flatListContent, { paddingBottom: 140 }]}
          >
            {renderHeader()}
            <NestableDraggableFlatList
              data={tasks}
              keyExtractor={(item) => item.id}
              onDragEnd={onDragEnd}
              renderItem={({ item, drag, isActive }: RenderItemParams<any>) => (
                <ScaleDecorator>
                  <TaskCard
                    item={item}
                    drag={drag}
                    isActive={isActive}
                    isDarkMode={darkMode}
                    onToggle={toggleTaskCompletion}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskFormOpen(true);
                    }}
                    onDelete={deleteTask}
                  />
                </ScaleDecorator>
              )}
              ListEmptyComponent={
                loadingTasks ? (
                  <ScreenSkeleton rows={4} isDark={darkMode} />
                ) : (
                  <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>{t('plan.noTasks')}</Text>
                )
              }
            />

            <TouchableOpacity
              style={[styles.orangeButton, { backgroundColor: theme.accentOrange, shadowColor: theme.accentOrange }]}
              onPress={() => {
                setEditingTask(null);
                setIsTaskFormOpen(true);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.orangeButtonText}>{t('plan.addTask')}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 24 }}>
              <HabitList
                key={`habit-list-${habitRefreshKey}`}
                userId={userId}
                isDarkMode={darkMode}
                onAddHabitPress={() => {
                  setEditingHabit(null);
                  setIsHabitFormOpen(true);
                }}
                onEditHabitPress={(habit) => {
                  setEditingHabit(habit);
                  setIsHabitFormOpen(true);
                }}
                onMilestonePress={(habit, streak) => {
                  setMilestoneStreakData({ habit, streak });
                }}
              />
            </View>
          </NestableScrollContainer>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {renderHeader()}

            <View 
              key={darkMode ? 'dark' : 'light'}
              style={[styles.calendarCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}
            >
              {/* Month Header Navigation with Year/Month Quick Jump */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.navArrow}
                  onPress={() => {
                    if (currentMonth === 1) {
                      setCurrentMonth(12);
                      setCurrentYear(y => y - 1);
                    } else {
                      setCurrentMonth(m => m - 1);
                    }
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    setTempYear(currentYear);
                    setPickerStep('year');
                    setShowYearMonthPicker(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Text style={[styles.calendarTitle, { color: theme.textPrimary }]}>
                    {new Date(currentYear, currentMonth - 1).toLocaleString(i18n.language || 'en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.navArrow}
                  onPress={() => {
                    if (currentMonth === 12) {
                      setCurrentMonth(1);
                      setCurrentYear(y => y + 1);
                    } else {
                      setCurrentMonth(m => m + 1);
                    }
                  }}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Weekdays Row */}
              <View style={styles.weekdaysContainer}>
                {weekdays.map(wd => (
                  <Text key={wd} style={[styles.weekdayText, { color: theme.textSecondary }]}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Calendar Days Grid with Multi-Color Recurrence Dots */}
              <View style={styles.daysGrid}>
                {calendarDays.map((item, idx) => {
                  const isSelected = item.isCurrentMonth && item.day === selectedDay;
                  const today = new Date();
                  const isToday = item.isCurrentMonth && 
                                  item.day === today.getDate() && 
                                  currentMonth === (today.getMonth() + 1) && 
                                  currentYear === today.getFullYear();
                  
                  const dayYMD = item.isCurrentMonth
                    ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
                    : '';
                  const dayRems = dayYMD
                    ? allUserReminders.filter((r) => doesReminderOccurOnDate(r, dayYMD))
                    : [];

                  return (
                    <TouchableOpacity
                      key={`cal-${idx}`}
                      activeOpacity={0.8}
                      onPress={() => item.isCurrentMonth && setSelectedDay(item.day)}
                      style={styles.dayButton}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          isSelected && { backgroundColor: theme.accentOrange },
                          isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.accentOrange },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: theme.textPrimary },
                            !item.isCurrentMonth && { color: darkMode ? '#2C354E' : '#cbd5e1' },
                            isSelected && styles.dayTextSelected,
                          ]}
                        >
                          {item.day}
                        </Text>
                      </View>

                      {/* Subtle Coloured Dots Under Dates */}
                      {item.isCurrentMonth && dayRems.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2, height: 5 }}>
                          {dayRems.slice(0, 3).map((r, dIdx) => (
                            <View
                              key={`dot-${dIdx}`}
                              style={{
                                width: 4.5,
                                height: 4.5,
                                borderRadius: 2.5,
                                backgroundColor: isSelected ? '#FFFFFF' : (r.color || '#2B6BFF'),
                              }}
                            />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

              {/* Inline Error Alert Component */}
              {dbError && (
                <Text style={styles.dbErrorText}>
                  {dbError}
                </Text>
              )}

              {/* Reminders section Header with Selected Date & Plus Button */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>
                  {new Date(currentYear, currentMonth - 1, selectedDay).toLocaleDateString(i18n.language || 'en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                {!isAddingReminder && !editingReminderId && (
                  <TouchableOpacity
                    onPress={() => setIsAddingReminder(true)}
                    activeOpacity={0.75}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: theme.accentOrange,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Reminders list or Empty State */}
              <View style={styles.remindersList}>
                {reminders.length === 0 ? (
                  <Text style={[styles.noRemindersText, { color: theme.textSecondary }]}>No reminders for this day</Text>
                ) : (
                  reminders.map(rem => {
                    const isEditingThis = editingReminderId === rem.id;
                    if (isEditingThis) {
                      return (
                        <View key={`edit-${rem.id}`} style={[styles.newReminderCard, { backgroundColor: theme.modalBg, borderColor: theme.modalBorder, borderWidth: 1 }]}>
                          <Text style={[styles.newReminderTitle, { color: theme.modalTextPrimary }]}>Edit reminder</Text>

                          {/* Title Input */}
                          <TextInput
                            style={[styles.reminderInput, { backgroundColor: theme.modalInputBg, color: theme.modalTextPrimary, borderColor: theme.modalBorder }]}
                            placeholder="Reminder title"
                            placeholderTextColor={theme.modalTextSecondary}
                            value={reminderTitle}
                            onChangeText={setReminderTitle}
                          />

                          {/* Description Input */}
                          <TextInput
                            style={[styles.reminderInput, { backgroundColor: theme.modalInputBg, color: theme.modalTextPrimary, borderColor: theme.modalBorder, height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                            placeholder="Add notes or description (optional)"
                            placeholderTextColor={theme.modalTextSecondary}
                            value={reminderDescription}
                            onChangeText={setReminderDescription}
                            multiline
                          />

                          {/* Category Tag Selector */}
                          <View style={{ marginBottom: 12 }}>
                            <Text style={[styles.timeLabel, { color: theme.modalTextSecondary, marginBottom: 6 }]}>Category Tag</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                              {REMINDER_TAGS.map(t => {
                                const isTagActive = reminderTag === t.name;
                                return (
                                  <TouchableOpacity
                                    key={t.name}
                                    activeOpacity={0.75}
                                    onPress={() => {
                                      setReminderTag(t.name);
                                      setReminderColor(t.defaultColor);
                                    }}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 5,
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 999,
                                      backgroundColor: isTagActive ? t.defaultColor : theme.modalInputBg,
                                      borderWidth: 1,
                                      borderColor: isTagActive ? t.defaultColor : theme.modalBorder,
                                    }}
                                  >
                                    <Ionicons name={t.icon} size={14} color={isTagActive ? '#FFFFFF' : theme.modalTextSecondary} />
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isTagActive ? '#FFFFFF' : theme.modalTextPrimary }}>
                                      {t.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>

                          {/* Color Swatches Row */}
                          <View style={{ marginBottom: 14 }}>
                            <Text style={[styles.timeLabel, { color: theme.modalTextSecondary, marginBottom: 6 }]}>Color Accent</Text>
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                              {REMINDER_COLORS.map(c => (
                                <TouchableOpacity
                                  key={c.hex}
                                  activeOpacity={0.8}
                                  onPress={() => setReminderColor(c.hex)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: c.hex,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                >
                                  {reminderColor === c.hex && (
                                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                  )}
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>

                          {/* All-day switch row */}
                          <View style={styles.formRow}>
                            <Text style={[styles.formLabel, { color: theme.modalTextPrimary }]}>All-day</Text>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => setAllDay(!allDay)}
                              style={[
                                styles.switchTrack,
                                allDay ? { backgroundColor: theme.accentOrange } : { backgroundColor: darkMode ? '#222A41' : '#cbd5e1' },
                              ]}
                            >
                              <View
                                style={[
                                  styles.switchThumb,
                                  allDay ? styles.switchThumbOn : styles.switchThumbOff,
                                ]}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Time selector split layout (Starts/Ends) */}
                          {!allDay && (
                            <View style={styles.timeSelectRow}>
                              <View style={styles.timeSelectColumn}>
                                <Text style={[styles.timeLabel, { color: theme.modalTextSecondary }]}>Starts</Text>
                                {Platform.OS === 'ios' ? (
                                  <View style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder, justifyContent: 'center' }]}>
                                    <DateTimePicker
                                      value={parseTimeString(startsTime)}
                                      mode="time"
                                      display="compact"
                                      themeVariant={darkMode ? 'dark' : 'light'}
                                      accentColor={theme.accentOrange}
                                      onChange={(event, date) => {
                                        if (date) setStartsTime(formatTimeDisplay(date));
                                      }}
                                      style={{ width: '100%', height: 40 }}
                                    />
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder }]}
                                    onPress={() => setShowStartsPicker(true)}
                                  >
                                    <Text style={[styles.timePickerText, { color: theme.modalTextPrimary }]}>{startsTime}</Text>
                                    <Ionicons name="time-outline" size={16} color={theme.modalTextSecondary} />
                                  </TouchableOpacity>
                                )}
                                {Platform.OS === 'android' && showStartsPicker && (
                                  <DateTimePicker
                                    value={parseTimeString(startsTime)}
                                    mode="time"
                                    display="default"
                                    themeVariant={darkMode ? 'dark' : 'light'}
                                    accentColor={theme.accentOrange}
                                    onChange={(event, date) => {
                                      setShowStartsPicker(false);
                                      if (date) setStartsTime(formatTimeDisplay(date));
                                    }}
                                  />
                                )}
                              </View>

                              <View style={styles.timeSelectColumn}>
                                <Text style={[styles.timeLabel, { color: theme.modalTextSecondary }]}>Ends</Text>
                                {Platform.OS === 'ios' ? (
                                  <View style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder, justifyContent: 'center' }]}>
                                    <DateTimePicker
                                      value={parseTimeString(endsTime)}
                                      mode="time"
                                      display="compact"
                                      themeVariant={darkMode ? 'dark' : 'light'}
                                      accentColor={theme.accentOrange}
                                      onChange={(event, date) => {
                                        if (date) setEndsTime(formatTimeDisplay(date));
                                      }}
                                      style={{ width: '100%', height: 40 }}
                                    />
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder }]}
                                    onPress={() => setShowEndsPicker(true)}
                                  >
                                    <Text style={[styles.timePickerText, { color: theme.modalTextPrimary }]}>{endsTime}</Text>
                                    <Ionicons name="time-outline" size={16} color={theme.modalTextSecondary} />
                                  </TouchableOpacity>
                                )}
                                {Platform.OS === 'android' && showEndsPicker && (
                                  <DateTimePicker
                                    value={parseTimeString(endsTime)}
                                    mode="time"
                                    display="default"
                                    themeVariant={darkMode ? 'dark' : 'light'}
                                    accentColor={theme.accentOrange}
                                    onChange={(event, date) => {
                                      setShowEndsPicker(false);
                                      if (date) setEndsTime(formatTimeDisplay(date));
                                    }}
                                  />
                                )}
                              </View>
                            </View>
                          )}

                          {/* Repeat Picker selector */}
                          <View style={styles.repeatRow}>
                            <Text style={[styles.repeatLabel, { color: theme.modalTextSecondary }]}>Repeat</Text>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={[styles.repeatPickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder }]}
                              onPress={() => setShowRepeatModal(true)}
                            >
                              <Text style={[styles.repeatPickerText, { color: theme.modalTextPrimary }]}>
                                {getRepeatLabel(repeatOption, customFrequency, customEvery)}
                              </Text>
                              <Ionicons name="chevron-down" size={16} color={theme.modalTextSecondary} />
                            </TouchableOpacity>
                          </View>

                          {/* 3-Stage Notification Notice */}
                          <Text style={{ fontSize: 11, color: theme.modalTextSecondary, marginBottom: 12, fontStyle: 'italic' }}>
                            🔔 Alerts scheduled: 3 days before, 24h before, and at start time (if time permits).
                          </Text>

                          {/* Action Buttons Row */}
                          <View style={styles.actionButtonsRow}>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={handleCancelEdit}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.cancelButtonText, { color: theme.modalTextSecondary }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.addButton, { backgroundColor: theme.accentOrange, shadowColor: theme.accentOrange }]}
                              onPress={() => handleUpdateReminder(rem.id)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.addButtonText}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View 
                        key={rem.id} 
                        style={{
                          backgroundColor: darkMode ? '#151B2E' : '#FFFFFF',
                          borderColor: theme.borderColor,
                          borderWidth: 1,
                          borderRadius: 14,
                          marginBottom: 10,
                          overflow: 'hidden',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        {/* Left Vertical Inset Rounded Color Accent Bar */}
                        <View 
                          style={{ 
                            width: 4, 
                            borderRadius: 4, 
                            marginVertical: 10, 
                            marginLeft: 8, 
                            alignSelf: 'stretch',
                            backgroundColor: rem.color || '#2B6BFF',
                          }} 
                        />

                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 10 }}>
                          {/* Circular Completion Checkbox */}
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => handleToggleReminderComplete(rem)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              borderWidth: 2,
                              borderColor: rem.isCompleted ? (rem.color || '#10B981') : (darkMode ? '#334155' : '#cbd5e1'),
                              backgroundColor: rem.isCompleted ? (rem.color || '#10B981') : 'transparent',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {rem.isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                          </TouchableOpacity>

                          {/* Center Content: Title, Optional Description, and Bottom Tag + Time Row */}
                          <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: '700',
                                color: rem.isCompleted ? theme.textSecondary : theme.textPrimary,
                                textDecorationLine: rem.isCompleted ? 'line-through' : 'none',
                              }}
                            >
                              {rem.title}
                            </Text>

                            {!!rem.description && (
                              <Text
                                numberOfLines={2}
                                style={{
                                  fontSize: 12,
                                  color: theme.textSecondary,
                                  marginTop: 2,
                                }}
                              >
                                {rem.description}
                              </Text>
                            )}

                            {/* Tag Badge + Time Range in Single Horizontal Line */}
                            <View style={{ flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: 8, marginTop: 5 }}>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 999,
                                  backgroundColor: `${rem.color || '#2B6BFF'}22`,
                                }}
                              >
                                <Ionicons
                                  name={REMINDER_TAGS.find(t => t.name === rem.tag)?.icon || 'pricetag'}
                                  size={11}
                                  color={rem.color || '#2B6BFF'}
                                />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: rem.color || '#2B6BFF' }}>
                                  {rem.tag || 'Personal'}
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                                <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, flexShrink: 1 }}>
                                  {rem.allDay ? 'All-day' : `${rem.starts} - ${rem.ends}`}
                                </Text>
                              </View>

                              {rem.repeat && rem.repeat !== 'Never' && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                  <Ionicons name="repeat-outline" size={13} color={theme.textSecondary} />
                                  <Text numberOfLines={1} style={{ fontSize: 11, color: theme.textSecondary }}>
                                    {getRepeatLabel(rem.repeat, rem.customRepeatFrequency, rem.customRepeatEvery)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Right Actions: Star, Edit, Delete */}
                          <View style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <TouchableOpacity onPress={() => handleToggleReminderStar(rem)} hitSlop={8}>
                              <Ionicons
                                name={rem.isStarred ? 'star' : 'star-outline'}
                                size={18}
                                color={rem.isStarred ? '#F59E0B' : theme.textSecondary}
                              />
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <TouchableOpacity onPress={() => handleStartEdit(rem)} hitSlop={8}>
                                <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteReminder(rem.id)} hitSlop={8}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}

                {!isAddingReminder && !editingReminderId && (
                  <TouchableOpacity
                    onPress={() => setIsAddingReminder(true)}
                    activeOpacity={0.7}
                    style={{ marginTop: 6 }}
                  >
                    <Text style={[styles.addReminderText, { color: theme.accentOrange }]}>+ Add reminder</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* New Reminder Card Form Panel */}
              {isAddingReminder && (
                <View style={[styles.newReminderCard, { backgroundColor: theme.modalBg, borderColor: theme.modalBorder, borderWidth: 1 }]}>
                  <Text style={[styles.newReminderTitle, { color: theme.modalTextPrimary }]}>New reminder</Text>

                  {/* Title Input */}
                  <TextInput
                    style={[styles.reminderInput, { backgroundColor: theme.modalInputBg, color: theme.modalTextPrimary, borderColor: theme.modalBorder }]}
                    placeholder="Reminder title"
                    placeholderTextColor={theme.modalTextSecondary}
                    value={reminderTitle}
                    onChangeText={setReminderTitle}
                  />

                  {/* Description Input */}
                  <TextInput
                    style={[styles.reminderInput, { backgroundColor: theme.modalInputBg, color: theme.modalTextPrimary, borderColor: theme.modalBorder, height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                    placeholder="Add notes or description (optional)"
                    placeholderTextColor={theme.modalTextSecondary}
                    value={reminderDescription}
                    onChangeText={setReminderDescription}
                    multiline
                  />

                  {/* Category Tag Selector */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[styles.timeLabel, { color: theme.modalTextSecondary, marginBottom: 6 }]}>Category Tag</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {REMINDER_TAGS.map(t => {
                        const isTagActive = reminderTag === t.name;
                        return (
                          <TouchableOpacity
                            key={t.name}
                            activeOpacity={0.75}
                            onPress={() => {
                              setReminderTag(t.name);
                              setReminderColor(t.defaultColor);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 5,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 999,
                              backgroundColor: isTagActive ? t.defaultColor : theme.modalInputBg,
                              borderWidth: 1,
                              borderColor: isTagActive ? t.defaultColor : theme.modalBorder,
                            }}
                          >
                            <Ionicons name={t.icon} size={14} color={isTagActive ? '#FFFFFF' : theme.modalTextSecondary} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isTagActive ? '#FFFFFF' : theme.modalTextPrimary }}>
                              {t.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Color Swatches Row */}
                  <View style={{ marginBottom: 14 }}>
                    <Text style={[styles.timeLabel, { color: theme.modalTextSecondary, marginBottom: 6 }]}>Color Accent</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {REMINDER_COLORS.map(c => (
                        <TouchableOpacity
                          key={c.hex}
                          activeOpacity={0.8}
                          onPress={() => setReminderColor(c.hex)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: c.hex,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {reminderColor === c.hex && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* All-day switch row */}
                  <View style={styles.formRow}>
                    <Text style={[styles.formLabel, { color: theme.modalTextPrimary }]}>All-day</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setAllDay(!allDay)}
                      style={[
                        styles.switchTrack,
                        allDay ? { backgroundColor: theme.accentOrange } : { backgroundColor: darkMode ? '#222A41' : '#cbd5e1' },
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          allDay ? styles.switchThumbOn : styles.switchThumbOff,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Time selector split layout (Starts/Ends) */}
                  {!allDay && (
                    <View style={styles.timeSelectRow}>
                      <View style={styles.timeSelectColumn}>
                        <Text style={[styles.timeLabel, { color: theme.modalTextSecondary }]}>Starts</Text>
                        {Platform.OS === 'ios' ? (
                          <View style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder, justifyContent: 'center' }]}>
                            <DateTimePicker
                              value={parseTimeString(startsTime)}
                              mode="time"
                              display="compact"
                              themeVariant={darkMode ? 'dark' : 'light'}
                              accentColor={theme.accentOrange}
                              onChange={(event, date) => {
                                if (date) setStartsTime(formatTimeDisplay(date));
                              }}
                              style={{ width: '100%', height: 40 }}
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder }]}
                            onPress={() => setShowStartsPicker(true)}
                          >
                            <Text style={[styles.timePickerText, { color: theme.modalTextPrimary }]}>{startsTime}</Text>
                            <Ionicons name="time-outline" size={16} color={theme.modalTextSecondary} />
                          </TouchableOpacity>
                        )}
                        {Platform.OS === 'android' && showStartsPicker && (
                          <DateTimePicker
                            value={parseTimeString(startsTime)}
                            mode="time"
                            display="default"
                            themeVariant={darkMode ? 'dark' : 'light'}
                            accentColor={theme.accentOrange}
                            onChange={(event, date) => {
                              setShowStartsPicker(false);
                              if (date) setStartsTime(formatTimeDisplay(date));
                            }}
                          />
                        )}
                      </View>

                      <View style={styles.timeSelectColumn}>
                        <Text style={[styles.timeLabel, { color: theme.modalTextSecondary }]}>Ends</Text>
                        {Platform.OS === 'ios' ? (
                          <View style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder, justifyContent: 'center' }]}>
                            <DateTimePicker
                              value={parseTimeString(endsTime)}
                              mode="time"
                              display="compact"
                              themeVariant={darkMode ? 'dark' : 'light'}
                              accentColor={theme.accentOrange}
                              onChange={(event, date) => {
                                if (date) setEndsTime(formatTimeDisplay(date));
                              }}
                              style={{ width: '100%', height: 40 }}
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={[styles.timePickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder }]}
                            onPress={() => setShowEndsPicker(true)}
                          >
                            <Text style={[styles.timePickerText, { color: theme.modalTextPrimary }]}>{endsTime}</Text>
                            <Ionicons name="time-outline" size={16} color={theme.modalTextSecondary} />
                          </TouchableOpacity>
                        )}
                        {Platform.OS === 'android' && showEndsPicker && (
                          <DateTimePicker
                            value={parseTimeString(endsTime)}
                            mode="time"
                            display="default"
                            themeVariant={darkMode ? 'dark' : 'light'}
                            accentColor={theme.accentOrange}
                            onChange={(event, date) => {
                              setShowEndsPicker(false);
                              if (date) setEndsTime(formatTimeDisplay(date));
                            }}
                          />
                        )}
                      </View>
                    </View>
                  )}

                  {/* Repeat Picker selector */}
                  <View style={styles.repeatRow}>
                    <Text style={[styles.repeatLabel, { color: theme.modalTextSecondary }]}>Repeat</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.repeatPickerButton, { backgroundColor: theme.modalInputBg, borderColor: theme.modalBorder }]}
                      onPress={() => setShowRepeatModal(true)}
                    >
                      <Text style={[styles.repeatPickerText, { color: theme.modalTextPrimary }]}>
                        {getRepeatLabel(repeatOption, customFrequency, customEvery)}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={theme.modalTextSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* 3-Stage Notification Notice */}
                  <Text style={{ fontSize: 11, color: theme.modalTextSecondary, marginBottom: 12, fontStyle: 'italic' }}>
                    🔔 Alerts scheduled: 3 days before, 24h before, and at start time (if time permits).
                  </Text>

                  {/* Action Buttons Row */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancelReminder}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cancelButtonText, { color: theme.modalTextSecondary }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.addButton, { backgroundColor: theme.accentOrange, shadowColor: theme.accentOrange }]}
                      onPress={handleAddReminder}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Habit Form Modal */}
        <HabitForm
          isOpen={isHabitFormOpen}
          onClose={() => setIsHabitFormOpen(false)}
          editingHabit={editingHabit}
          userId={userId}
          isDarkMode={darkMode}
          onRefresh={() => setHabitRefreshKey((prev) => prev + 1)}
        />

        {/* Task Form Modal */}
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          editingTask={editingTask}
          userId={userId}
          isDarkMode={darkMode}
          onRefresh={() => fetchTasks(true)}
        />

        {/* Sunday Productivity Report Modal retention hook */}
        <SundayReportModal
          isVisible={isSundayModalVisible}
          onClose={handleCloseSundayModal}
          onReadNow={handleReadNow}
        />

        {/* Habit Milestone Streak Card Modal */}
        <HabitMilestoneModal
          visible={!!milestoneStreakData}
          habit={milestoneStreakData?.habit || null}
          streak={milestoneStreakData?.streak || 0}
          onClose={() => setMilestoneStreakData(null)}
        />

        {/* Year and Month Quick Jump Picker Modal */}
        <Modal
          visible={showYearMonthPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearMonthPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowYearMonthPicker(false)}
          >
            <View style={[styles.yearMonthModalContent, { backgroundColor: theme.cardBg, borderColor: theme.modalBorder, borderWidth: 1 }]}>
              {/* Header Step Toggle */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setPickerStep('year')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: pickerStep === 'year' ? theme.accentOrange : (darkMode ? '#1E253A' : '#E2E8F0'),
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: pickerStep === 'year' ? '#FFFFFF' : theme.textSecondary }}>
                      {tempYear}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPickerStep('month')}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: pickerStep === 'month' ? theme.accentOrange : (darkMode ? '#1E253A' : '#E2E8F0'),
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: pickerStep === 'month' ? '#FFFFFF' : theme.textSecondary }}>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth - 1]}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setShowYearMonthPicker(false)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Step 1: Year Grid */}
              {pickerStep === 'year' ? (
                <View style={{ width: '100%' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 }}>
                    Select Year
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {Array.from({ length: 12 }, (_, i) => 2024 + i).map((yr) => {
                      const isCurrentYear = tempYear === yr;
                      return (
                        <TouchableOpacity
                          key={yr}
                          activeOpacity={0.75}
                          onPress={() => {
                            setTempYear(yr);
                            setPickerStep('month');
                          }}
                          style={{
                            width: '30%',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isCurrentYear ? theme.accentOrange : (darkMode ? '#1E253A' : '#F1F5F9'),
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isCurrentYear ? '#FFFFFF' : theme.textPrimary }}>
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* Step 2: Month Grid */
                <View style={{ width: '100%' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 12 }}>
                    Select Month ({tempYear})
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mName, mIdx) => {
                      const isSelectedMonth = currentMonth === mIdx + 1 && currentYear === tempYear;
                      return (
                        <TouchableOpacity
                          key={mName}
                          activeOpacity={0.75}
                          onPress={() => {
                            setCurrentYear(tempYear);
                            setCurrentMonth(mIdx + 1);
                            setSelectedDay(1);
                            setShowYearMonthPicker(false);
                          }}
                          style={{
                            width: '30%',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelectedMonth ? theme.accentOrange : (darkMode ? '#1E253A' : '#F1F5F9'),
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: isSelectedMonth ? '#FFFFFF' : theme.textPrimary }}>
                            {mName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Repeat Selection Dropdown Modal */}
        <Modal
          visible={showRepeatModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRepeatModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRepeatModal(false)}
          >
            <View style={[styles.repeatModalContent, { backgroundColor: theme.cardBg, borderColor: theme.modalBorder, borderWidth: 1 }]}>
              {['Never', 'Every Day', 'Every Week', 'Every 2 Weeks', 'Every Month', 'Every Year'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.repeatOptionItem}
                  onPress={() => {
                    setRepeatOption(opt);
                    setShowRepeatModal(false);
                  }}
                >
                  <Text style={[styles.repeatOptionText, { color: theme.textPrimary }, repeatOption === opt && styles.repeatOptionTextSelected]}>
                    {opt}
                  </Text>
                  {repeatOption === opt && (
                    <Ionicons name="checkmark" size={18} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              ))}
              <View style={[styles.dropdownDivider, { backgroundColor: theme.modalBorder }]} />
              <TouchableOpacity
                style={styles.repeatOptionItem}
                onPress={() => {
                  setShowRepeatModal(false);
                  setShowCustomRepeatScreen(true);
                }}
              >
                <Text style={[styles.repeatOptionText, { color: theme.textPrimary }, repeatOption === 'Custom' && styles.repeatOptionTextSelected]}>
                  Custom
                </Text>
                {repeatOption === 'Custom' && (
                  <Ionicons name="checkmark" size={18} color="#FF6B00" />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Custom Repeat Config Modal */}
        <Modal
          visible={showCustomRepeatScreen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowCustomRepeatScreen(false)}
        >
          <SafeAreaView style={[styles.customModalContainer, { backgroundColor: theme.bg }]}>
            {/* Custom Header */}
            <View style={[styles.customModalHeader, { paddingTop: insets.top, backgroundColor: theme.cardBg, borderBottomColor: theme.modalBorder }]}>
              <TouchableOpacity
                style={[styles.customModalBackButton, { backgroundColor: darkMode ? '#1E253A' : '#F4F6FA' }]}
                onPress={() => {
                  setRepeatOption('Custom');
                  setShowCustomRepeatScreen(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.customModalTitle, { color: theme.textPrimary }]}>Custom</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.customModalContent}>
              {/* Card Container */}
              <View style={[styles.customCard, { backgroundColor: theme.cardBg, borderColor: theme.modalBorder }]}>
                {/* Frequency Row */}
                <TouchableOpacity
                  style={styles.customCardRow}
                  onPress={() => setShowFrequencyPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.customRowLabel, { color: theme.textPrimary }]}>Frequency</Text>
                  <View style={styles.customRowValueContainer}>
                    <Text style={[styles.customRowValueText, { color: theme.textSecondary }]}>{customFrequency}</Text>
                    <Ionicons name="chevron-expand-outline" size={16} color={theme.textSecondary} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>

                <View style={[styles.customCardDivider, { backgroundColor: theme.modalBorder }]} />

                {/* Every Row */}
                <TouchableOpacity
                  style={styles.customCardRow}
                  onPress={() => setShowEveryPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.customRowLabel, { color: theme.textPrimary }]}>Every</Text>
                  <View style={styles.customRowValueContainer}>
                    <Text style={[styles.customRowValueText, { color: '#ef4444' }]}>
                      {customEvery} {customFrequency === 'Daily' ? 'day' : customFrequency === 'Weekly' ? 'week' : customFrequency === 'Monthly' ? 'month' : 'year'}{customEvery > 1 ? 's' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Summary Text */}
              <Text style={[styles.customSummaryText, { color: theme.textSecondary }]}>
                {getCustomRepeatSummary(customFrequency, customEvery)}
              </Text>
            </View>

            {/* Frequency Selection Dialog Modal */}
            <Modal
              visible={showFrequencyPicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowFrequencyPicker(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowFrequencyPicker(false)}
              >
                <View style={[styles.frequencyPickerContent, { backgroundColor: theme.cardBg, borderColor: theme.modalBorder, borderWidth: 1 }]}>
                  {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={styles.repeatOptionItem}
                      onPress={() => {
                        setCustomFrequency(freq);
                        setShowFrequencyPicker(false);
                      }}
                    >
                      <Text style={[styles.repeatOptionText, { color: theme.textPrimary }, customFrequency === freq && styles.repeatOptionTextSelected]}>
                        {freq}
                      </Text>
                      {customFrequency === freq && (
                        <Ionicons name="checkmark" size={18} color="#FF6B00" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Every Selection Dialog Modal */}
            <Modal
              visible={showEveryPicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowEveryPicker(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowEveryPicker(false)}
              >
                <View style={[styles.everyPickerContent, { maxHeight: 350, backgroundColor: theme.cardBg, borderColor: theme.modalBorder, borderWidth: 1 }]}>
                  <Text style={[styles.everyPickerHeader, { color: theme.textPrimary }]}>Select Interval</Text>
                  <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => {
                      const label = `${num} ${customFrequency === 'Daily' ? 'day' : customFrequency === 'Weekly' ? 'week' : customFrequency === 'Monthly' ? 'month' : 'year'}${num > 1 ? 's' : ''}`;
                      return (
                        <TouchableOpacity
                          key={num}
                          style={styles.everyOptionItem}
                          onPress={() => {
                            setCustomEvery(num);
                            setShowEveryPicker(false);
                          }}
                        >
                          <Text style={[styles.everyOptionText, { color: theme.textPrimary }, customEvery === num && styles.everyOptionTextSelected]}>
                            {label}
                          </Text>
                          {customEvery === num && (
                            <Ionicons name="checkmark" size={18} color="#FF6B00" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </SafeAreaView>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrapper: {
    width: '100%',
    paddingTop: 16,
  },
  footerWrapper: {
    width: '100%',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  tabToggleRow: {
    flexDirection: 'row',
    borderRadius: 99,
    padding: 3,
    gap: 2,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  tabButton: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 99,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateDayText: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 48,
  },
  dateMonthText: {
    fontSize: 34,
    fontWeight: '300',
    marginLeft: 6,
    lineHeight: 48,
  },
  dateWeekdayText: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  noEventsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  orangeButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  orangeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyListText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 24,
    fontWeight: '500',
  },
  calendarCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navArrow: {
    padding: 6,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 12,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayButton: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dbErrorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 10,
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  divider: {
    height: 1,
    marginVertical: 18,
  },
  remindersList: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  noRemindersText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  addReminderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reminderCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderItemTime: {
    fontSize: 11,
    marginTop: 1,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardActionBtn: {
    padding: 6,
  },
  newReminderCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    marginBottom: 10,
  },
  newReminderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  reminderInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchTrack: {
    width: 42,
    height: 22,
    borderRadius: 99,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  timeSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  timeSelectColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timePickerButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  timePickerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  repeatRow: {
    marginBottom: 16,
  },
  repeatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  repeatPickerButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  repeatPickerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearMonthModalContent: {
    width: '85%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  repeatModalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  repeatOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
  },
  repeatOptionText: {
    fontSize: 15,
    color: '#0B1021',
    fontWeight: '500',
  },
  repeatOptionTextSelected: {
    fontWeight: '700',
    color: '#FF6B00',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  customModalContainer: {
    flex: 1,
  },
  customModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  customModalBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F6FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B1021',
  },
  customModalContent: {
    flex: 1,
    padding: 20,
  },
  customCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
  },
  customCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  customRowLabel: {
    fontSize: 15,
    color: '#0B1021',
    fontWeight: '500',
  },
  customRowValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customRowValueText: {
    fontSize: 15,
    color: '#8E95A9',
    fontWeight: '500',
  },
  customCardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  customSummaryText: {
    fontSize: 13,
    color: '#8E95A9',
    paddingHorizontal: 4,
  },
  frequencyPickerContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  everyPickerContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  everyPickerHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1021',
    marginBottom: 12,
  },
  everyOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  everyOptionText: {
    fontSize: 15,
    color: '#0B1021',
    fontWeight: '500',
  },
  everyOptionTextSelected: {
    fontWeight: '700',
    color: '#FF6B00',
  },
});
