import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Pressable,
  useWindowDimensions,
  AppState,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { useUser } from '../../src/utils/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { awardXP } from '../../src/utils/xpService';
import { queryCache } from '../../src/utils/queryCache';
import { useNotifications } from '../../src/hooks/useNotifications';
import { SeamlessRadialTimerDial } from '../../components/focus/SeamlessRadialTimerDial';

type ActiveView = 'config' | 'pomodoro' | 'break';

function getDaysRemaining(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  // Parse YYYY-MM-DD
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateParts = targetDateStr.split('T')[0].split('-');
  if (dateParts.length < 3) return 0;
  
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  
  const targetDate = new Date(year, month, day);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export default function FocusTab() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const { user, profile } = useUser();
  const currentUserId = user?.id || profile?.id || '';
  const [userId, setUserId] = useState(currentUserId);
  const isPro = profile?.isPro || false;
  const [loading, setLoading] = useState(false);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load theme on focus
  useFocusEffect(
    useCallback(() => {
      const checkTheme = async () => {
        try {
          const val = await AsyncStorage.getItem('darkMode');
          if (val !== null) {
            setIsDarkMode(val === 'true');
          }
        } catch (e) {
          console.warn('Error loading theme:', e);
        }
      };
      checkTheme();
    }, [])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setIsDarkMode(newVal);
    });
    return () => sub.remove();
  }, []);
  const params = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // App View State machine
  const [activeView, setActiveView] = useState<ActiveView>('config');

  useEffect(() => {
    if (activeView === 'pomodoro' || activeView === 'break') {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'none',
        }
      });
      navigation.setOptions({
        headerShown: false,
      });
    } else {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 5,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
        }
      });
      navigation.setOptions({
        headerShown: true,
      });
    }
    
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 5,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 0),
        }
      });
      navigation.setOptions({
        headerShown: true,
      });
    };
  }, [activeView, navigation, insets.bottom]);

  // Pomodoro Configuration / Engine States
  const [currentSet, setCurrentSet] = useState(1);
  const [focusDurationMin, setFocusDurationMin] = useState(25);
  const [breakDurationMin, setBreakDurationMin] = useState(5);
  const [totalSets, setTotalSets] = useState(4);

  const focusDuration = focusDurationMin * 60; // in seconds
  const breakDuration = breakDurationMin * 60; // in seconds

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);
  const sessionStartedAtRef = useRef<string>(new Date().toISOString());
  const backgroundTimestampRef = useRef<number | null>(null);
  const pomodoroNotifIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const completedSessionIdsRef = useRef<Set<string>>(new Set());
  const loggedMinutesRef = useRef<number>(0);

  // Notification scheduling helpers
  const {
    schedulePomodoroAlert,
    scheduleCountdownAlert,
    cancelNotification,
    preferences: notifPrefs,
  } = useNotifications();

  useEffect(() => {
    if (activeView === 'config') {
      setTimeLeft(focusDurationMin * 60);
    }
  }, [focusDurationMin, activeView]);

  useEffect(() => {
    if (params?.action === 'startSession') {
      sessionStartedAtRef.current = new Date().toISOString();
      sessionIdRef.current = `${userId || 'user'}_${Date.now()}`;
      loggedMinutesRef.current = 0;
      setCurrentSet(1);
      setActiveView('pomodoro');
      setTimeLeft(focusDuration);
      setTimerRunning(true);
      router.setParams({ action: '' });
    }
  }, [params?.action, focusDuration, userId]);

  // Blocker Switch State
  const [distractionsBlocked, setDistractionsBlocked] = useState(false);

  // Countdown States
  const [countdowns, setCountdowns] = useState<any[]>([]);
  const [activeMenuCountdownId, setActiveMenuCountdownId] = useState<string | null>(null);
  
  // Countdown Form Overlay States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<any | null>(null);
  const [eventName, setEventName] = useState('');
  const [targetDate, setTargetDate] = useState('2026-05-31');
  const [targetDateObject, setTargetDateObject] = useState<Date>(new Date(2026, 4, 31)); // May is index 4
  const [targetTime, setTargetTime] = useState('11:00 AM');
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [getReminders, setGetReminders] = useState(false);
  const [submittingCountdown, setSubmittingCountdown] = useState(false);

  // Load user and countdowns with SWR caching
  const fetchCountdowns = async (uid: string, forceRefresh: boolean = false) => {
    if (!uid) return;
    try {
      const cacheKey = `user:${uid}:countdowns`;
      const freshCountdowns = await queryCache.fetchWithCache(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('countdowns')
            .select('*')
            .eq('user_id', uid)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data || [];
        },
        120_000,
        forceRefresh || queryCache.isStale(cacheKey)
      );

      if (freshCountdowns) {
        setCountdowns(freshCountdowns);
      }
    } catch (e) {
      console.warn('Error loading countdowns:', e);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      setUserId(currentUserId);
      const cached = queryCache.getSync<any[]>(`user:${currentUserId}:countdowns`);
      if (cached) setCountdowns(cached);
      fetchCountdowns(currentUserId);
    }
  }, [currentUserId]);

  // ─── Local YYYY-MM-DD Date Formatter (Prevents UTC midnight backward shift) ──
  const getLocalYMD = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ─── Direct Helper to Record Focus / Break Minutes to Supabase ─────────────
  const recordFocusActivityToSupabase = async (
    focusMinsToAdd: number,
    breakMinsToAdd: number = 0
  ) => {
    if (focusMinsToAdd <= 0 && breakMinsToAdd <= 0) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || userId;
      if (!uid) return;

      const todayStr = getLocalYMD();

      // 1. Try atomic increment RPC if installed
      let rpcSucceeded = false;
      try {
        const { error: rpcErr } = await supabase.rpc('increment_daily_focus', {
          p_user_id: uid,
          p_date: todayStr,
          p_focus_mins: focusMinsToAdd,
          p_break_mins: breakMinsToAdd,
        });
        if (!rpcErr) rpcSucceeded = true;
      } catch {}

      // 2. Direct fallback query & upsert on daily_focus_activity table
      if (!rpcSucceeded) {
        const { data: existingRow } = await supabase
          .from('daily_focus_activity')
          .select('focus_time_minutes, break_time_minutes')
          .eq('user_id', uid)
          .eq('date', todayStr)
          .maybeSingle();

        if (existingRow) {
          const newFocus = (existingRow.focus_time_minutes || 0) + focusMinsToAdd;
          const newBreak = (existingRow.break_time_minutes || 0) + breakMinsToAdd;
          await supabase
            .from('daily_focus_activity')
            .update({
              focus_time_minutes: newFocus,
              break_time_minutes: newBreak,
            })
            .eq('user_id', uid)
            .eq('date', todayStr);
        } else {
          await supabase
            .from('daily_focus_activity')
            .insert([{
              user_id: uid,
              date: todayStr,
              focus_time_minutes: focusMinsToAdd,
              break_time_minutes: breakMinsToAdd,
            }]);
        }
      }

      // 3. Additively increment total_focus_minutes on users table
      if (focusMinsToAdd > 0) {
        const { data: userData } = await supabase
          .from('users')
          .select('total_focus_minutes')
          .eq('id', uid)
          .single();

        const currentMinutes = (userData as any)?.total_focus_minutes || 0;
        await supabase
          .from('users')
          .update({ total_focus_minutes: currentMinutes + focusMinsToAdd })
          .eq('id', uid);
      }

      // 4. Invalidate cache on both RAM & AsyncStorage and notify Insights tab
      queryCache.invalidatePrefix(`user:${uid}:insights`);
      queryCache.invalidatePrefix('insights');
      DeviceEventEmitter.emit('refreshInsights');
      DeviceEventEmitter.emit('FOCALYST_FOCUS_ACTIVITY_UPDATED');
    } catch (e) {
      console.warn('Error recording focus activity to Supabase:', e);
    }
  };

  // ─── Log Pomodoro session to Supabase ────────────────────────────────────────
  // elapsedMinutes: exact minutes focused (supports completed sets & partial sessions)
  const logPomodoroSession = async (
    elapsedMinutes: number,
    wasCompleted: boolean,
    setsCompleted: number = 1,
    explicitBreakMinutes: number = 0
  ) => {
    try {
      if (elapsedMinutes <= 0 && explicitBreakMinutes <= 0) return;

      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || userId;
      if (!uid) return;

      const logEntryId = `${sessionIdRef.current || uid}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const calculatedBreakMinutes =
        explicitBreakMinutes > 0
          ? explicitBreakMinutes
          : wasCompleted
          ? Math.round(breakDuration / 60)
          : 0;

      // Insert pomodoro_sessions row
      await supabase.from('pomodoro_sessions').insert([{
        user_id: uid,
        focus_minutes: elapsedMinutes,
        break_minutes: calculatedBreakMinutes,
        sets_planned: totalSets,
        sets_completed: setsCompleted,
        was_completed: wasCompleted,
        started_at: sessionStartedAtRef.current || new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }]);

      // Additive upsert into daily_focus_activity and users table
      await recordFocusActivityToSupabase(elapsedMinutes, calculatedBreakMinutes);

      // Award XP with idempotency key for completed focus sessions
      if (wasCompleted) {
        await awardXP(10, 'Focus Session Complete', `focus_${logEntryId}`);
      }
    } catch (e) {
      console.warn('Error logging pomodoro session:', e);
    }
  };

  // ─── Task 3: Background-resilient timer via AppState ──────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (timerRunning) {
          backgroundTimestampRef.current = Date.now();
        }
      } else if (nextAppState === 'active' && backgroundTimestampRef.current !== null) {
        const elapsedMs = Date.now() - backgroundTimestampRef.current;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        backgroundTimestampRef.current = null;

        if (timerRunning) {
          setTimeLeft(prev => {
            const newTime = prev - elapsedSeconds;
            if (newTime <= 0) {
              // Timer would have finished in background
              clearInterval(timerRef.current!);
              setTimerRunning(false);

              if (activeView === 'pomodoro') {
                logPomodoroSession(focusDurationMin, currentSet >= totalSets, 1);
                loggedMinutesRef.current += focusDurationMin;

                if (currentSet < totalSets) {
                  Alert.alert('Focus Session Complete!', 'Well done! Time for a short break.');
                  setActiveView('break');
                  setTimeLeft(breakDuration);
                  setTimerRunning(true);
                } else {
                  Alert.alert('All sets complete!', 'Fantastic focus session today! You are all set.');
                  resetFocusSession();
                }
                return 0;
              } else if (activeView === 'break') {
                logPomodoroSession(0, false, 0, breakDurationMin);
                handleNextSession();
              }
              return 0;
            }
            return newTime;
          });
        }
      }
    });

    return () => subscription.remove();
  }, [timerRunning, activeView, currentSet, totalSets, focusDurationMin, breakDuration, breakDurationMin]);

  // Timer Engine
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            
            if (activeView === 'pomodoro') {
              logPomodoroSession(focusDurationMin, currentSet >= totalSets, 1);
              loggedMinutesRef.current += focusDurationMin;

              if (currentSet < totalSets) {
                // Transition to break timer
                Alert.alert('Focus Session Complete!', 'Well done! Time for a short break.');
                setActiveView('break');
                setTimeLeft(breakDuration);
                setTimerRunning(true); // Automatically run break timer
              } else {
                Alert.alert('All sets complete!', 'Fantastic focus session today! You are all set.');
                resetFocusSession();
              }
              return 0;
            } else if (activeView === 'break') {
              // Break finished, record completed break minutes and advance set
              logPomodoroSession(0, false, 0, breakDurationMin);
              handleNextSession();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, activeView, currentSet, totalSets, focusDurationMin, breakDuration, breakDurationMin]);

  const handleNextSession = () => {
    if (currentSet < totalSets) {
      const nextSet = currentSet + 1;
      setCurrentSet(nextSet);
      setActiveView('pomodoro');
      setTimeLeft(focusDuration);
      setTimerRunning(true);
    } else {
      Alert.alert('All sets complete!', 'Fantastic focus session today! You are all set.');
      resetFocusSession();
    }
  };

  const handleEndFocusSession = async () => {
    try {
      if (activeView === 'pomodoro') {
        const elapsedInCurrentSetSeconds = Math.max(0, focusDuration - timeLeft);
        const partialMinutes =
          elapsedInCurrentSetSeconds >= 60
            ? Math.max(1, Math.round(elapsedInCurrentSetSeconds / 60))
            : 0;

        if (partialMinutes > 0) {
          await logPomodoroSession(partialMinutes, false, 1);
          loggedMinutesRef.current += partialMinutes;
        }
      } else if (activeView === 'break') {
        const elapsedBreakSeconds = Math.max(0, breakDuration - timeLeft);
        const partialBreakMinutes =
          elapsedBreakSeconds >= 60
            ? Math.max(1, Math.round(elapsedBreakSeconds / 60))
            : 0;

        if (partialBreakMinutes > 0) {
          await logPomodoroSession(0, false, 0, partialBreakMinutes);
        }
      }
    } catch (e) {
      console.warn('Error ending focus session:', e);
    } finally {
      const uid = userId;
      if (uid) {
        queryCache.invalidatePrefix(`user:${uid}:insights`);
      }
      queryCache.invalidatePrefix('insights');
      DeviceEventEmitter.emit('refreshInsights');
      DeviceEventEmitter.emit('FOCALYST_FOCUS_ACTIVITY_UPDATED');
      await resetFocusSession();
    }
  };

  const skipBreak = () => {
    // If the user spent time on break before skipping, record it
    const elapsedBreakSeconds = Math.max(0, breakDuration - timeLeft);
    const partialBreakMinutes =
      elapsedBreakSeconds >= 60
        ? Math.max(1, Math.round(elapsedBreakSeconds / 60))
        : 0;
    if (partialBreakMinutes > 0) {
      logPomodoroSession(0, false, 0, partialBreakMinutes);
    }
    clearInterval(timerRef.current!);
    setTimerRunning(false);
    handleNextSession();
  };

  const startFocusSession = async () => {
    sessionStartedAtRef.current = new Date().toISOString();
    sessionIdRef.current = `${userId || 'user'}_${Date.now()}`;
    loggedMinutesRef.current = 0;
    setCurrentSet(1);
    setActiveView('pomodoro');
    setTimeLeft(focusDuration);
    setTimerRunning(true);

    // Schedule a local notification for when this focus session ends
    if (notifPrefs.pomodoro_alerts_enabled) {
      const notifId = await schedulePomodoroAlert(focusDuration);
      pomodoroNotifIdRef.current = notifId;
    }
  };

  const resetFocusSession = async () => {
    // Cancel any scheduled pomodoro notification
    if (pomodoroNotifIdRef.current) {
      await cancelNotification(pomodoroNotifIdRef.current);
      pomodoroNotifIdRef.current = null;
    }

    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveView('config');
    setCurrentSet(1);
    setTimeLeft(focusDuration);
    sessionIdRef.current = null;
    loggedMinutesRef.current = 0;
  };

  const handlePresetSelect = (presetName: string, fMin: number, bMin: number, sets: number) => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    setFocusDurationMin(fMin);
    setBreakDurationMin(bMin);
    setTotalSets(sets);
  };

  const formatTimerString = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Switch Blocker toggle alert
  const handleBlockerToggle = (value: boolean) => {
    Alert.alert('Upcoming Feature', 'Block distractions will be available in a future update.');
    setDistractionsBlocked(false); // Force switch to remain false
  };

  // Open creation countdown sheet
  const handleOpenNewCountdown = () => {
    setEditingCountdown(null);
    setEventName('');
    const defaultDate = new Date(2026, 4, 31);
    setTargetDateObject(defaultDate);
    setTargetDate('2026-05-31');
    setTargetTime('11:00 AM');
    setShowDatePicker(Platform.OS === 'ios');
    setGetReminders(false);
    setIsFormOpen(true);
  };

  // Open edit countdown sheet
  const handleOpenEditCountdown = (item: any) => {
    setEditingCountdown(item);
    setEventName(item.event_name);
    // Parse target date 'YYYY-MM-DD'
    const dateStr = item.target_date ? item.target_date.split('T')[0] : '2026-05-31';
    setTargetDate(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setTargetDateObject(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
    } else {
      setTargetDateObject(new Date(2026, 4, 31));
    }
    setTargetTime('11:00 AM');
    setShowDatePicker(Platform.OS === 'ios');
    setGetReminders(false);
    setIsFormOpen(true);
  };

  // Save countdown trigger (insert or update)
  const handleSaveCountdown = async () => {
    if (!eventName.trim() || !targetDate.trim()) {
      Alert.alert('Required Fields', 'Please describe the event and pick a target date.');
      return;
    }
    setSubmittingCountdown(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId;
      if (!currentUserId) {
        throw new Error('Active user session not found.');
      }

      // target_date format YYYY-MM-DD
      const dateString = targetDate.trim();

      if (editingCountdown) {
        // Update countdown
        const { error } = await supabase
          .from('countdowns')
          .update({
            event_name: eventName.trim(),
            target_date: dateString,
          })
          .eq('id', editingCountdown.id);

        if (error) throw error;
        Alert.alert('Success', 'Countdown updated successfully.');
      } else {
        // Insert new countdown - check free tier limit
        if (!isPro && countdowns.length >= 1) {
          setSubmittingCountdown(false);
          setIsFormOpen(false);
          router.push('/paywall');
          return;
        }

        const { error } = await supabase
          .from('countdowns')
          .insert([
            {
              user_id: currentUserId,
              event_name: eventName.trim(),
              target_date: dateString,
              is_active: true,
            },
          ]);

        if (error) throw error;
        Alert.alert('Success', 'New countdown saved!');
      }

      setIsFormOpen(false);
      await fetchCountdowns(currentUserId);

      // Schedule countdown alert 2 hours before target date (10 PM the day before)
      if (notifPrefs.task_reminders_enabled && dateString) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const targetDateObj = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
          );
          await scheduleCountdownAlert(eventName.trim(), targetDateObj);
        }
      }
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to save countdown.');
    } finally {
      setSubmittingCountdown(false);
    }
  };

  // Delete countdown hook
  const handleDeleteCountdown = async (id: string) => {
    try {
      setCountdowns(prev => prev.filter(c => c.id !== id));
      const { error } = await supabase
        .from('countdowns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to delete countdown.');
      if (userId) fetchCountdowns(userId);
    }
  };

  const isTimerRunning = activeView === 'pomodoro' || activeView === 'break';
  const theme = {
    background: isDarkMode ? '#0B1021' : '#F4F6FA',
    colors: {
      text: isDarkMode ? '#FFFFFF' : '#1E2229'
    }
  };
  const progress = 1 - (timeLeft / focusDuration);
  const dialSize = isLandscape
    ? Math.max(200, Math.min(height - 135, 240))
    : Math.min(width * 0.85, 340);

  // Main Config settings view
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.container, isDarkMode && { backgroundColor: '#0B1021' }, { flex: 1 }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        


        {/* Pomodoro settings configuration card */}
        <View style={[styles.card, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.cardTitle, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.pomodoro')}</Text>
            <TouchableOpacity style={styles.startBtn} onPress={startFocusSession} activeOpacity={0.9}>
              <Text style={styles.startBtnText}>{t('focus.start')}</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs Row */}
          <View style={styles.inputSplitRow}>
            <View style={styles.inputColumn}>
              <Text style={[styles.inputLabel, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.duration')}</Text>
              <View style={[styles.readOnlyInput, isPro && { backgroundColor: '#ffffff' }, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
                <TextInput
                  style={[styles.readOnlyInputText, isPro && { color: '#4a6c8c' }, isDarkMode && { color: '#FFFFFF' }, { flex: 1, padding: 0 }]}
                  value={focusDurationMin.toString()}
                  onChangeText={(val) => {
                    const parsed = parseInt(val, 10);
                    setFocusDurationMin(isNaN(parsed) ? 0 : parsed);
                  }}
                  keyboardType="number-pad"
                  editable={isPro}
                />
                {!isPro && <Ionicons name="lock-closed" size={14} color={isDarkMode ? '#8E95A9' : '#94a3b8'} />}
              </View>
            </View>

            <View style={styles.inputColumn}>
              <Text style={[styles.inputLabel, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.break')}</Text>
              <View style={[styles.readOnlyInput, isPro && { backgroundColor: '#ffffff' }, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
                <TextInput
                  style={[styles.readOnlyInputText, isPro && { color: '#4a6c8c' }, isDarkMode && { color: '#FFFFFF' }, { flex: 1, padding: 0 }]}
                  value={breakDurationMin.toString()}
                  onChangeText={(val) => {
                    const parsed = parseInt(val, 10);
                    setBreakDurationMin(isNaN(parsed) ? 0 : parsed);
                  }}
                  keyboardType="number-pad"
                  editable={isPro}
                />
                {!isPro && <Ionicons name="lock-closed" size={14} color={isDarkMode ? '#8E95A9' : '#94a3b8'} />}
              </View>
            </View>
          </View>

          <View style={styles.fullWidthInputColumn}>
            <Text style={[styles.inputLabel, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.sets')}</Text>
            <View style={[styles.readOnlyInput, isPro && { backgroundColor: '#ffffff' }, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
              <TextInput
                style={[styles.readOnlyInputText, isPro && { color: '#4a6c8c' }, isDarkMode && { color: '#FFFFFF' }, { flex: 1, padding: 0 }]}
                value={totalSets.toString()}
                onChangeText={(val) => {
                  const parsed = parseInt(val, 10);
                  setTotalSets(isNaN(parsed) ? 0 : parsed);
                }}
                keyboardType="number-pad"
                editable={isPro}
              />
              {!isPro && <Ionicons name="lock-closed" size={14} color={isDarkMode ? '#8E95A9' : '#94a3b8'} />}
            </View>
          </View>

          {/* 2x2 presets configuration grid with lock icons on free tier boundaries */}
          {(() => {
            const isDefaultPreset = focusDurationMin === 25 && breakDurationMin === 5 && totalSets === 4;
            const isPreset45 = focusDurationMin === 45 && breakDurationMin === 10 && totalSets === 3;
            const isPreset60 = focusDurationMin === 60 && breakDurationMin === 15 && totalSets === 2;
            const isPreset90 = focusDurationMin === 90 && breakDurationMin === 30 && totalSets === 2;

            const getPresetStyle = (isActive: boolean) => {
              if (isActive) {
                return [styles.presetActive, isDarkMode && { backgroundColor: '#FFFFFF' }];
              } else {
                return [styles.presetLocked, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }];
              }
            };

            const getPresetTextStyle = (isActive: boolean) => {
              if (isActive) {
                return [styles.presetActiveText, isDarkMode && { color: '#0B1021' }];
              } else {
                return [styles.presetLockedText, isDarkMode && { color: '#8E95A9' }];
              }
            };

            return (
              <View style={styles.presetsGrid}>
                <TouchableOpacity
                  style={getPresetStyle(isDefaultPreset)}
                  activeOpacity={0.8}
                  onPress={() => {
                    setFocusDurationMin(25);
                    setBreakDurationMin(5);
                    setTotalSets(4);
                  }}
                >
                  <Text style={getPresetTextStyle(isDefaultPreset)}>25/5×4</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={getPresetStyle(isPreset45)}
                  activeOpacity={0.8}
                  onPress={() => handlePresetSelect('45/10×3', 45, 10, 3)}
                >
                  <Text style={getPresetTextStyle(isPreset45)}>45/10×3</Text>
                  {!isPro && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E95A9' : '#94a3b8'} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={getPresetStyle(isPreset60)}
                  activeOpacity={0.8}
                  onPress={() => handlePresetSelect('60/15×2', 60, 15, 2)}
                >
                  <Text style={getPresetTextStyle(isPreset60)}>60/15×2</Text>
                  {!isPro && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E95A9' : '#94a3b8'} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={getPresetStyle(isPreset90)}
                  activeOpacity={0.8}
                  onPress={() => handlePresetSelect('90/30×2', 90, 30, 2)}
                >
                  <Text style={getPresetTextStyle(isPreset90)}>90/30×2</Text>
                  {!isPro && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E95A9' : '#94a3b8'} style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>

        {/* Shield Block Distractions switch toggle */}
        <View style={[styles.shieldCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
          <View style={styles.shieldDetails}>
            <View style={[styles.shieldIconContainer, isDarkMode && { backgroundColor: '#222A41' }]}>
              <Ionicons name="shield-half-outline" size={20} color="#ff6b2b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shieldTitle, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.block')}</Text>
              <Text style={[styles.shieldSubtitle, isDarkMode && { color: '#8E95A9' }]}>{t('focus.offMessage')}</Text>
            </View>
          </View>
          <Switch
            value={distractionsBlocked}
            onValueChange={handleBlockerToggle}
            trackColor={{ false: isDarkMode ? '#222D47' : '#cbd5e1', true: '#4a6c8c' }}
            thumbColor={distractionsBlocked ? '#ffffff' : (isDarkMode ? '#8E95A9' : '#f1f5f9')}
          />
        </View>

        {/* Countdown list component widget */}
        <View style={{ width: '100%' }}>
          <Text style={[styles.sectionSubtitle, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.countdown')}</Text>

          {countdowns.length === 0 ? (
            <View style={[styles.emptyCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
              <Text style={[styles.emptyText, isDarkMode && { color: '#8E95A9' }]}>No active countdowns. Add one!</Text>
            </View>
          ) : (
            countdowns.map(item => {
              const daysLeft = getDaysRemaining(item.target_date);
              const formattedDateStr = item.target_date ? new Date(item.target_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) : 'May 31, 2026';
              const isMenuOpen = activeMenuCountdownId === item.id;

              return (
                <View key={item.id} style={[styles.countdownCard, isDarkMode && { backgroundColor: '#151B2E' }]}>
                  <View style={styles.countdownCardRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <Text style={[styles.daysNumberText, isDarkMode && { color: '#FFFFFF' }]}>{daysLeft}</Text>
                      <Text style={[styles.daysLabelText, isDarkMode && { color: '#8E95A9' }]}> total days</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setActiveMenuCountdownId(isMenuOpen ? null : item.id)}
                      activeOpacity={0.7}
                      style={styles.optionsDotBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={isDarkMode ? '#8E95A9' : '#64748b'} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.countdownMetaText, isDarkMode && { color: '#8E95A9' }]}>
                    {formattedDateStr} • {item.event_name}
                  </Text>

                  {/* Absolute menu selection centered modal popup inside relative list element to avoid clippings */}
                  <Modal
                    transparent={true}
                    visible={isMenuOpen}
                    animationType="fade"
                    onRequestClose={() => setActiveMenuCountdownId(null)}
                  >
                    <Pressable
                      style={[styles.modalOverlay, isDarkMode && { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
                      onPress={() => setActiveMenuCountdownId(null)}
                    >
                      <View style={styles.modalCenterContainer}>
                        <Pressable
                          onPress={(e) => e.stopPropagation()}
                          style={[styles.modalDropdownMenu, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}
                        >
                          <Text style={[styles.modalMenuTitle, isDarkMode && { color: '#8E95A9' }]}>{item.event_name}</Text>
                          <View style={[styles.menuDivider, isDarkMode && { backgroundColor: '#222A41' }]} />
                          <TouchableOpacity
                            onPress={() => {
                              setActiveMenuCountdownId(null);
                              handleOpenEditCountdown(item);
                            }}
                            style={styles.menuItem}
                          >
                            <Text style={[styles.menuItemText, isDarkMode && { color: '#FFFFFF' }]}>Edit</Text>
                          </TouchableOpacity>
                          <View style={[styles.menuDivider, isDarkMode && { backgroundColor: '#222A41' }]} />
                          <TouchableOpacity
                            onPress={() => {
                              setActiveMenuCountdownId(null);
                              handleDeleteCountdown(item.id);
                            }}
                            style={styles.menuItem}
                          >
                            <Text style={[styles.menuItemText, styles.menuItemDelete]}>Delete</Text>
                          </TouchableOpacity>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Modal>
                </View>
              );
            })
          )}

          {/* Add new countdown button trigger */}
          <TouchableOpacity
            style={styles.orangeAddBtn}
            onPress={handleOpenNewCountdown}
            activeOpacity={0.9}
          >
            <Text style={styles.orangeAddBtnText}>{t('focus.addnew')}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>

    {/* Bulletproof full-screen Pomodoro Modal — renders on the topmost native layer, covering tab bar */}
    <Modal 
      visible={isTimerRunning} 
      animationType="fade" 
      presentationStyle="fullScreen"
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={handleEndFocusSession}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        {activeView === 'pomodoro' ? (
          <View style={[styles.timerContent, isLandscape && styles.timerContentLandscape]}>
            {/* Top section: Pill Header Indicator + Set Tracker */}
            <View style={[styles.timerTopHeader, isLandscape && styles.timerTopHeaderLandscape]}>
              <View style={[styles.focusPill, isLandscape && styles.focusPillLandscape]}>
                <Text style={[styles.focusPillText, isLandscape && styles.focusPillTextLandscape]}>{t('focus.focusTime')}</Text>
              </View>
              <Text style={[styles.setTrackerText, isDarkMode ? { color: '#8E95A9' } : { color: '#64748b' }, isLandscape && styles.setTrackerTextLandscape]}>
                {t('focus.setCount', { current: currentSet, total: totalSets })}
              </Text>
            </View>

            {/* Middle section: Seamless Feathered Blue Radial Gradient Dial with centered countdown digits */}
            <View style={isLandscape ? styles.dialContainerLandscape : styles.dialContainerPortrait}>
              <SeamlessRadialTimerDial
                progress={progress}
                size={dialSize}
                isDark={isDarkMode}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit={false}
                  style={[
                    styles.hugeTimerDisplay,
                    {
                      color: theme.colors.text,
                    },
                    isLandscape && styles.hugeTimerDisplayLandscape,
                  ]}
                >
                  {formatTimerString(timeLeft)}
                </Text>
              </SeamlessRadialTimerDial>
            </View>

            {/* Bottom section: Media Buttons Row Controls */}
            <View style={[styles.timerControlsRow, isLandscape && styles.timerControlsRowLandscape]}>
              <TouchableOpacity
                style={[styles.pauseBtn, isDarkMode && { backgroundColor: '#151B2E' }, isLandscape && styles.controlBtnLandscape]}
                onPress={() => setTimerRunning(!timerRunning)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pauseBtnText, isDarkMode && { color: '#FFFFFF' }, isLandscape && styles.controlBtnTextLandscape]}>
                  {timerRunning ? t('focus.pause') : t('focus.resume')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.resetBtn, isDarkMode && { backgroundColor: '#151B2E' }, isLandscape && styles.controlBtnLandscape]}
                onPress={handleEndFocusSession}
                activeOpacity={0.8}
              >
                <Text style={[styles.resetBtnText, isDarkMode && { color: '#FFFFFF' }, isLandscape && styles.controlBtnTextLandscape]}>
                  End
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.breakContent, isLandscape && styles.breakContentLandscape, { width: '100%', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={[styles.breakHeaderTitle, isDarkMode ? { color: '#FFFFFF' } : { color: '#4a6c8c' }, isLandscape && styles.breakHeaderTitleLandscape]}>
              {t('focus.wellDone')}
            </Text>
            <Text style={[styles.breakSubtitle, isDarkMode ? { color: '#8E95A9' } : { color: '#1e293b' }, isLandscape && styles.breakSubtitleLandscape]}>
              {t('focus.setComplete', { current: currentSet, total: totalSets })}
            </Text>
            <Text style={[styles.breakLabelText, isDarkMode ? { color: '#8E95A9' } : { color: '#64748b' }, isLandscape && styles.breakLabelTextLandscape]}>
              {t('focus.nextSessionIn')}
            </Text>

            {/* Break Massive Digit Timer */}
            <Text style={[styles.breakTimerDisplay, isDarkMode ? { color: '#FFFFFF' } : { color: '#1E2229' }, isLandscape && styles.breakTimerDisplayLandscape]}>
              {formatTimerString(timeLeft)}
            </Text>

            {/* Controls button row */}
            <View style={styles.breakControlsRow}>
              <TouchableOpacity style={[styles.skipBtn, isDarkMode && { backgroundColor: '#151B2E' }]} onPress={skipBreak} activeOpacity={0.8}>
                <Text style={[styles.skipBtnText, isDarkMode && { color: '#FFFFFF' }]}>{t('focus.skip')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.backBtn, { backgroundColor: '#FF6B00' }]} onPress={handleEndFocusSession} activeOpacity={0.8}>
                <Text style={styles.backBtnText}>{t('focus.back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>

    {/* Countdown Form overlay slider state sheets */}
    <Modal
        visible={isFormOpen}
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}
        transparent={false}
      >
        <SafeAreaProvider>
          <SafeAreaView edges={['top', 'bottom']} style={[styles.formContainer, isDarkMode && { backgroundColor: '#0B1021' }, { paddingTop: 12 }]}>
            <ScrollView contentContainerStyle={styles.formScrollContainer} showsVerticalScrollIndicator={false}>
              {/* Header toolbar */}
              <View style={styles.formToolbar}>
                <Text style={[styles.formTitle, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={1}>
                  {editingCountdown ? 'Edit countdown' : 'New countdown'}
                </Text>
                <TouchableOpacity onPress={() => setIsFormOpen(false)} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#8E95A9' : '#64748b'} />
                </TouchableOpacity>
              </View>

              {/* Event name Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, isDarkMode && { color: '#FFFFFF' }]}>Describe</Text>
                <TextInput
                  style={[styles.formInput, isDarkMode && { backgroundColor: '#FFFFFF', color: '#1E2229', borderColor: '#222A41' }]}
                  placeholder="Give it a name"
                  placeholderTextColor="#94a3b8"
                  value={eventName}
                  onChangeText={setEventName}
                />
              </View>

              {/* Split row date and time pickers details */}
              <View style={styles.formSplitRow}>
                <View style={styles.formColumn}>
                  <Text style={[styles.formLabel, isDarkMode && { color: '#FFFFFF' }]}>Date</Text>
                  <View style={styles.inputIconWrapper}>
                    <View
                      style={[
                        styles.formIconInput,
                        {
                          justifyContent: 'center',
                          alignItems: 'flex-start',
                          backgroundColor: '#FFFFFF',
                          borderColor: isDarkMode ? '#222A41' : '#cbd5e1',
                        },
                      ]}
                    >
                      {Platform.OS === 'android' ? (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}
                          onPress={() => setShowDatePicker(true)}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E2229' }}>{targetDate}</Text>
                        </TouchableOpacity>
                      ) : (
                        <DateTimePicker
                          value={targetDateObject}
                          mode="date"
                          themeVariant="light"
                          display="compact"
                          onChange={(event, date) => {
                            if (date) {
                              setTargetDateObject(date);
                              const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                              setTargetDate(formatted);
                            }
                          }}
                          style={{ height: 36, alignSelf: 'flex-start' }}
                        />
                      )}
                    </View>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={isDarkMode ? '#8E95A9' : '#64748b'}
                      style={styles.rightIcon}
                      pointerEvents="none"
                    />
                  </View>
                  {Platform.OS === 'android' && showDatePicker && (
                    <DateTimePicker
                      value={targetDateObject}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) {
                          setTargetDateObject(date);
                          const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          setTargetDate(formatted);
                        }
                      }}
                    />
                  )}
                </View>

              <View style={styles.formColumn}>
                <Text style={[styles.formLabel, isDarkMode && { color: '#FFFFFF' }]}>Time</Text>
                <View style={styles.inputIconWrapper}>
                  <TextInput
                    style={[styles.formIconInput, isDarkMode && { backgroundColor: '#FFFFFF', color: '#1E2229', borderColor: '#222A41' }]}
                    placeholder="11:00 AM"
                    placeholderTextColor="#94a3b8"
                    value={targetTime}
                    onChangeText={setTargetTime}
                  />
                  <Ionicons name="time-outline" size={16} color={isDarkMode ? '#8E95A9' : '#64748b'} style={styles.rightIcon} />
                </View>
              </View>
            </View>

            {/* Switch alert alerts */}
            <View style={styles.remindersRow}>
              <Text style={[styles.remindersLabel, isDarkMode && { color: '#FFFFFF' }]}>Get reminders</Text>
              <Switch
                value={getReminders}
                onValueChange={setGetReminders}
                trackColor={{ false: isDarkMode ? '#222D47' : '#cbd5e1', true: '#FF6B00' }}
                thumbColor={getReminders ? '#ffffff' : (isDarkMode ? '#8E95A9' : '#f1f5f9')}
              />
            </View>

            {/* CTA action buttons */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#FF6B00' }]}
              onPress={handleSaveCountdown}
              disabled={submittingCountdown}
              activeOpacity={0.9}
            >
              {submittingCountdown ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9', // premium Light Mode layout background
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121c2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabHeader: {
    width: '100%',
    marginBottom: 4,
  },
  greetingText: {
    color: '#4a6c8c',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    color: '#4a6c8c',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  startBtn: {
    backgroundColor: '#ff6b2b', // CTA Accent Orange Start button
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
    shadowColor: '#ff6b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  inputSplitRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  inputColumn: {
    flex: 1,
  },
  fullWidthInputColumn: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#4a6c8c',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  readOnlyInput: {
    height: 44,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyInputText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  presetActive: {
    width: '48%',
    height: 40,
    backgroundColor: '#4a6c8c', // solid active brand color background
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetActiveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  presetLocked: {
    width: '48%',
    height: 40,
    backgroundColor: '#f1f5f9', // light gray background for locked preset
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  presetLockedText: {
    color: '#94a3b8', // muted preset text color
    fontSize: 13,
    fontWeight: '600',
  },
  shieldCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  shieldDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  shieldIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff4f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldTitle: {
    color: '#4a6c8c',
    fontSize: 15,
    fontWeight: '700',
  },
  shieldSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  sectionSubtitle: {
    color: '#4a6c8c',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  emptyCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  countdownCard: {
    width: '100%',
    backgroundColor: '#dbe1ec', // soft blue-gray background matching blueprints
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  countdownCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  daysNumberText: {
    color: '#4a6c8c', // large brand color days font
    fontSize: 34,
    fontWeight: '700',
  },
  daysLabelText: {
    color: '#4a6c8c',
    fontSize: 15,
    fontWeight: '600',
  },
  optionsDotBtn: {
    padding: 6,
  },
  countdownMetaText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  orangeAddBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#ff6b2b', // Accent orange full-width CTA button
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 4,
  },
  orangeAddBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Centered transparent modal layouts overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Dim screen slightly
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCenterContainer: {
    width: '80%',
    maxWidth: 280,
  },
  modalDropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modalMenuTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    color: '#4a6c8c',
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  menuItemDelete: {
    color: '#ef4444',
  },

  // Full screen form slider container
  formContainer: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  formScrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  formToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  formTitle: {
    color: '#4a6c8c',
    fontSize: 22,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  formGroup: {
    width: '100%',
  },
  formLabel: {
    color: '#4a6c8c',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    height: 48,
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#4a6c8c',
    fontSize: 14,
    fontWeight: '500',
  },
  formSplitRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  formColumn: {
    flex: 1,
  },
  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  formIconInput: {
    height: 48,
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 36,
    color: '#4a6c8c',
    fontSize: 14,
    fontWeight: '500',
  },
  rightIcon: {
    position: 'absolute',
    right: 14,
  },
  remindersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    marginBottom: 10,
  },
  remindersLabel: {
    color: '#4a6c8c',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#ff6b2b', // active orange CTA button
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Active Timer views style sheets
  timerContainer: {
    flex: 1,
    backgroundColor: '#ffffff', // pure white background for active Pomodoro timer
  },
  timerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 64,
    paddingHorizontal: 24,
  },
  timerTopHeader: {
    alignItems: 'center',
  },
  timerTopHeaderLandscape: {
    marginTop: 0,
    marginBottom: 0,
    gap: 4,
  },
  dialContainerPortrait: {},
  dialContainerLandscape: {
    marginVertical: 0,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPill: {
    backgroundColor: '#4b6c8d', // dark slate-blue pill
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 7,
    marginBottom: 8,
  },
  focusPillLandscape: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 0,
  },
  focusPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  focusPillTextLandscape: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  setTrackerText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  hugeTimerDisplay: {
    fontSize: 68,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timerControlsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnLandscape: {
    height: 34,
    minWidth: 86,
    paddingHorizontal: 18,
    paddingVertical: 0,
    borderRadius: 999, // Sleek pill shape
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnTextLandscape: {
    fontSize: 13,
    fontWeight: '600',
  },
  pauseBtn: {
    backgroundColor: '#4a6c8c', // brand color pause
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  pauseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: '#e2e8f0', // light blue-gray reset
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#4a6c8c',
    fontSize: 14,
    fontWeight: '700',
  },

  // Active Break Timer stylesheet layout
  breakContainer: {
    flex: 1,
    backgroundColor: '#e2e8f0', // full screen soft blue-gray background
  },
  breakContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  breakHeaderTitle: {
    color: '#4a6c8c',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 8,
  },
  breakSubtitle: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  breakLabelText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 24,
  },
  breakTimerDisplay: {
    fontSize: 84,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 48,
    textShadowColor: 'rgba(74, 108, 140, 0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  breakControlsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
  skipBtn: {
    backgroundColor: '#4a6c8c', // brand blue Skip
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 100,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: {
    backgroundColor: '#ff6b2b', // active orange Back
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#ff6b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  landscapeContainer: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  timerContentLandscape: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    paddingTop: 14,
    paddingBottom: 18,
    paddingHorizontal: 56,
  },
  breakContentLandscape: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  leftColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rightColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  setTrackerTextLandscape: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    marginBottom: 0,
  },
  timerControlsRowLandscape: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 4,
    zIndex: 10,
  },
  hugeTimerDisplayLandscape: {
    fontSize: 112,
    lineHeight: 118,
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  breakHeaderTitleLandscape: {
    fontSize: 24, // scaled to breathe beautifully in landscape height bounds
    fontWeight: '700',
    marginBottom: 4,
  },
  breakSubtitleLandscape: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  breakLabelTextLandscape: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  breakControlsRowLandscape: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  breakTimerDisplayLandscape: {
    fontSize: 110, // massive bold timer text centered perfectly
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(74, 108, 140, 0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
});
