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
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { useUser } from '../../src/utils/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { awardXP } from '../../src/utils/xpService';
import { recordMilestoneForReview } from '../../src/services/reviewPromptService';
import { queryCache } from '../../src/utils/queryCache';
import { useNotifications } from '../../src/hooks/useNotifications';
import { SeamlessRadialTimerDial } from '../../components/focus/SeamlessRadialTimerDial';
import { BlockDistractionsCard } from '../../components/blocking/BlockDistractionsCard';
import { BlockingStatusStrip } from '../../components/blocking/BlockingStatusStrip';
import { TactilePressable } from '../../components/ui/TactilePressable';
import { TactileSwitch } from '../../components/ui/TactileSwitch';
import { Dialog } from '../../components/blocking/Overlays';
import { PendingCountdownCard } from '../../src/onboarding/PendingCountdownCard';
import { useRecommendedPreset } from '../../src/onboarding/useRecommendedPreset';
import { FREE_COUNTDOWN_MAX_DAYS } from '../../src/onboarding/plan';
import { SessionSummaryModal } from '../../components/blocking/SessionSummaryModal';
import { useHideDevFab } from '../../src/blocking/devFab';
import { formatClock } from '../../src/blocking/levels';
import { useBlocking } from '../../src/blocking/BlockingContext';
import AtmosphericScreenBackground from '../../components/AtmosphericScreenBackground';
import { useColumnStyle } from '../../src/layout/adaptive';
import {
  type CountdownWidgetItem,
  ensureWidgetStateHydrated,
  formatDateDMY,
  getWidgetPayload,
  POMODORO_SESSION_STORAGE_KEY,
  reconcileWidgetsToApp,
  registerWidgetPomodoroSyncHandler,
  SELECTED_WIDGET_COUNTDOWN_KEY,
  subscribeToWidgetPayload,
  syncAllWidgetsFromApp,
} from '../../src/services/widgetSync';

type ActiveView = 'config' | 'pomodoro' | 'break';

export interface CountdownItem {
  id: string;
  user_id?: string;
  event_name: string;
  target_date: string;
  is_active?: boolean;
  showHoursMinutes?: boolean;
  created_at?: string;
  [key: string]: any;
}

const getCountdownParts = (targetDateInput: string | number | Date) => {
  const targetMs = new Date(targetDateInput).getTime();
  const diffMs = Math.max(0, targetMs - Date.now());
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    totalDays,
    hours: pad(hours),
    minutes: pad(minutes),
  };
};

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
  const columnStyle = useColumnStyle();

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
  const params = useLocalSearchParams<{
    section?: string;
    action?: string;
    autoStart?: string;
    quickStartTs?: string;
    t?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
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
  const [confirmEndEarly, setConfirmEndEarly] = useState(false);
  const timerRef = useRef<any>(null);
  const sessionStartedAtRef = useRef<string>(new Date().toISOString());
  const pomodoroNotifIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
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

  const timerRunningRef = useRef(timerRunning);
  timerRunningRef.current = timerRunning;

  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const currentSetRef = useRef(currentSet);
  currentSetRef.current = currentSet;

  const totalSetsRef = useRef(totalSets);
  totalSetsRef.current = totalSets;

  const focusDurationMinRef = useRef(focusDurationMin);
  focusDurationMinRef.current = focusDurationMin;

  const breakDurationMinRef = useRef(breakDurationMin);
  breakDurationMinRef.current = breakDurationMin;

  const endTimeMsRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const lastHandledTriggerRef = useRef<string | null>(null);
  const completedPhaseKeysRef = useRef<Set<string>>(new Set());
  const isTransitioningRef = useRef(false);
  const isEndingRef = useRef(false);
  const lastPhaseTransitionAtRef = useRef<number>(0);
  // Widget, deep link and route "end" requests obey the blocking level like the End button does.
  const requestExternalEndRef = useRef<() => void>(() => {});
  // Set when every set finished, so the summary can tell "complete" from "ended early".
  const sessionCompletedRef = useRef(false);
  const lastTimerViewRef = useRef<ActiveView>('config');
  const blocking = useBlocking();
  const blockingArmed = blocking.supported && !!blocking.config.setupCompletedAt && blocking.config.enabled;

  const persistPomodoroSnapshot = useCallback((opts: {
    view: ActiveView;
    durationSeconds: number;
    isRunning: boolean;
    endTimeMs: number;
    setNumber: number;
  }) => {
    const now = Date.now();
    const taskLabel = opts.view === 'break' ? 'Break' : 'Focus';
    const storagePayload = {
      taskLabel,
      durationSeconds: opts.durationSeconds,
      isRunning: opts.isRunning,
      endTimeMs: opts.endTimeMs,
      updatedAtMs: now,
      view: opts.view,
      currentSet: opts.setNumber,
    };

    AsyncStorage.setItem(POMODORO_SESSION_STORAGE_KEY, JSON.stringify(storagePayload)).catch(() => {});
    try {
      syncAllWidgetsFromApp({
        pomodoro: {
          taskLabel,
          durationSeconds: opts.durationSeconds,
          isRunning: opts.isRunning,
          endTimeMs: opts.endTimeMs,
          updatedAtMs: now,
        },
      });
    } catch (e) {
      console.warn('Error syncing widgets:', e);
    }
  }, []);

  const beginTimerPhase = useCallback(
    ({ view, durationSec, setNumber }: { view: 'pomodoro' | 'break'; durationSec: number; setNumber: number }) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const safeDurationSec = Math.max(1, Math.round(durationSec));
      const now = Date.now();
      const endTimeMs = now + safeDurationSec * 1000;

      // Synchronously update refs BEFORE React state updates
      endTimeMsRef.current = endTimeMs;
      timeLeftRef.current = safeDurationSec;
      activeViewRef.current = view;
      timerRunningRef.current = true;
      isPausedRef.current = false;
      currentSetRef.current = setNumber;
      lastPhaseTransitionAtRef.current = now;

      setCurrentSet(setNumber);
      setActiveView(view);
      setTimeLeft(safeDurationSec);
      setTimerRunning(true);

      persistPomodoroSnapshot({
        view,
        durationSeconds: safeDurationSec,
        isRunning: true,
        endTimeMs,
        setNumber,
      });

      if (pomodoroNotifIdRef.current) {
        const prevId = pomodoroNotifIdRef.current;
        pomodoroNotifIdRef.current = null;
        cancelNotification(prevId).catch(() => {});
      }
      if (notifPrefs.pomodoro_alerts_enabled) {
        schedulePomodoroAlert(safeDurationSec)
          .then((id) => {
            if (id && timerRunningRef.current && !isPausedRef.current) {
              pomodoroNotifIdRef.current = id;
            } else if (id) {
              cancelNotification(id).catch(() => {});
            }
          })
          .catch(() => {});
      }
    },
    [cancelNotification, notifPrefs.pomodoro_alerts_enabled, persistPomodoroSnapshot, schedulePomodoroAlert]
  );

  const startTimer = useCallback((customSeconds?: number) => {
    try {
      const remainingSeconds = customSeconds ?? focusDuration;
      const now = Date.now();

      sessionStartedAtRef.current = new Date().toISOString();
      sessionIdRef.current = `${userId || 'user'}_${now}`;
      loggedMinutesRef.current = 0;
      sessionCompletedRef.current = false;
      completedPhaseKeysRef.current.clear();
      isTransitioningRef.current = false;
      isEndingRef.current = false;
      setConfirmEndEarly(false);

      beginTimerPhase({
        view: 'pomodoro',
        durationSec: remainingSeconds,
        setNumber: 1,
      });
    } catch (e) {
      console.warn('Error in startTimer:', e);
    }
  }, [focusDuration, userId, beginTimerPhase]);

  const handleQuickStartPomodoro = useCallback((triggerId?: string) => {
    const id = triggerId || `${Date.now()}`;
    if (lastHandledTriggerRef.current === id) return;
    lastHandledTriggerRef.current = id;

    const isSessionActive =
      timerRunningRef.current ||
      isPausedRef.current ||
      activeViewRef.current === 'pomodoro' ||
      activeViewRef.current === 'break';

    if (isSessionActive) {
      return;
    }

    focusDurationMinRef.current = 25;
    breakDurationMinRef.current = 5;
    totalSetsRef.current = 4;
    setFocusDurationMin(25);
    setBreakDurationMin(5);
    setTotalSets(4);
    startTimer(25 * 60);
  }, [startTimer]);

  const stopTimer = useCallback(() => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const resetSec = focusDurationMinRef.current * 60;
      endTimeMsRef.current = null;
      isPausedRef.current = false;
      timerRunningRef.current = false;
      activeViewRef.current = 'config';
      timeLeftRef.current = resetSec;
      lastPhaseTransitionAtRef.current = Date.now();
      sessionIdRef.current = null;

      setTimerRunning(false);
      setTimeLeft(resetSec);
      setActiveView('config');

      persistPomodoroSnapshot({
        view: 'config',
        durationSeconds: 1500,
        isRunning: false,
        endTimeMs: 0,
        setNumber: 1,
      });

      if (pomodoroNotifIdRef.current) {
        const prevId = pomodoroNotifIdRef.current;
        pomodoroNotifIdRef.current = null;
        cancelNotification(prevId).catch(() => {});
      }
    } catch (e) {
      console.warn('Error in stopTimer:', e);
    }
  }, [cancelNotification, persistPomodoroSnapshot]);

  const syncFromWidgetState = useCallback(
    (pomoOverride?: any) => {
      try {
        // The widget only knows the original end time; it must not un-pause a paused timer.
        if (isPausedRef.current) return;
        const pomo = pomoOverride ?? getWidgetPayload().pomodoro;
        if (pomo.isRunning && pomo.endTimeMs && pomo.endTimeMs > Date.now()) {
          // Do not let stale running widget state clobber an active in-app phase that just transitioned.
          if (
            isTransitioningRef.current ||
            Date.now() - lastPhaseTransitionAtRef.current < 3000
          ) {
            return;
          }
          if (
            timerRunningRef.current &&
            (activeViewRef.current === 'pomodoro' || activeViewRef.current === 'break') &&
            endTimeMsRef.current &&
            Math.abs(endTimeMsRef.current - pomo.endTimeMs) < 2000
          ) {
            return;
          }

          const remainingSecs = Math.max(1, Math.ceil((pomo.endTimeMs - Date.now()) / 1000));
          const targetView: 'pomodoro' | 'break' =
            pomo.view === 'break' || pomo.taskLabel === 'Break' ? 'break' : 'pomodoro';
          endTimeMsRef.current = pomo.endTimeMs;
          timeLeftRef.current = remainingSecs;
          activeViewRef.current = targetView;
          timerRunningRef.current = true;
          if (!sessionIdRef.current) {
            sessionIdRef.current = `${userId || 'user'}_${Date.now()}`;
            sessionStartedAtRef.current = new Date().toISOString();
          }
          setActiveView(targetView);
          setTimeLeft(remainingSecs);
          setTimerRunning(true);
        } else if (!pomo.isRunning) {
          if (
            isTransitioningRef.current ||
            Date.now() - lastPhaseTransitionAtRef.current < 3000
          ) {
            return;
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          const resetSec = focusDurationMinRef.current * 60;
          endTimeMsRef.current = null;
          timerRunningRef.current = false;
          activeViewRef.current = 'config';
          timeLeftRef.current = resetSec;
          sessionIdRef.current = null;
          setTimerRunning(false);
          setTimeLeft(resetSec);
          setActiveView('config');
        }
      } catch (e) {
        console.warn('Error in syncFromWidgetState:', e);
      }
    },
    [userId]
  );

  // Sync state whenever the Focus tab is focused
  useFocusEffect(
    useCallback(() => {
      reconcileWidgetsToApp().then(() => {
        syncFromWidgetState();
      });
      syncFromWidgetState();
    }, [syncFromWidgetState])
  );

  // Synchronize Pomodoro state from widget or storage on mount and when app becomes active
  // Blocking follows the Pomodoro only after the timer state is restored, so a session that is
  // still running isn't mistaken for "ended" during the initial 'config' render.
  const [pomodoroHydrated, setPomodoroHydrated] = useState(false);

  useEffect(() => {
    const initAndSync = async () => {
      try {
        await ensureWidgetStateHydrated();
        await reconcileWidgetsToApp();
        syncFromWidgetState();
      } catch {}
      setPomodoroHydrated(true);
    };

    initAndSync();

    const unsubPomoSync = registerWidgetPomodoroSyncHandler((pomo) => {
      syncFromWidgetState(pomo);
    });

    const unsubPayload = subscribeToWidgetPayload(() => {
      syncFromWidgetState();
    });

    const startSub = DeviceEventEmitter.addListener('FOCALYST_POMODORO_START', () => startTimer());
    const autoStartSub = DeviceEventEmitter.addListener('FOCALYST_POMODORO_AUTOSTART', () => startTimer());
    const endSub = DeviceEventEmitter.addListener('FOCALYST_POMODORO_END', () => requestExternalEndRef.current());
    const quickStartSub = DeviceEventEmitter.addListener('FOCALYST_QUICK_START_POMODORO', (data?: { quickStartTs?: string }) => {
      handleQuickStartPomodoro(data?.quickStartTs);
    });

    return () => {
      unsubPomoSync();
      unsubPayload();
      startSub.remove();
      autoStartSub.remove();
      endSub.remove();
      quickStartSub.remove();
    };
  }, [startTimer, stopTimer, syncFromWidgetState, handleQuickStartPomodoro]);

  useEffect(() => {
    if (!params) return;
    try {
      const action = params.action;
      if (action === 'startSession') {
        handleQuickStartPomodoro(params.quickStartTs || params.t);
        router.setParams({ action: undefined, autoStart: undefined, quickStartTs: undefined, t: undefined } as any);
      } else if (action === 'start' || params.autoStart === 'true') {
        if (!timerRunningRef.current) {
          startTimer();
        }
        router.setParams({ action: undefined, autoStart: undefined, quickStartTs: undefined, t: undefined } as any);
      } else if (action === 'end' || action === 'stop') {
        requestExternalEndRef.current();
        router.setParams({ action: undefined, autoStart: undefined, quickStartTs: undefined, t: undefined } as any);
      }
    } catch (e) {
      console.warn('Error handling params in focus:', e);
    }
  }, [params?.action, params?.autoStart, params?.quickStartTs, params?.t, handleQuickStartPomodoro, startTimer]);

  // Scroll to Countdown section when targeted
  useEffect(() => {
    if (params?.section === 'countdown') {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [params?.section]);

  // Robust Deep Link Listener for WidgetKit actions (e.g. focalyst://focus?action=start, view=countdown)
  useEffect(() => {
    let subscription: any = null;
    try {
      const handleIncomingUrl = (urlStr: string | null) => {
        if (!urlStr) return;
        try {
          const urlLower = urlStr.toLowerCase();
          if (urlLower.includes('action=start') || urlLower.includes('action=startsession')) {
            if (!timerRunningRef.current) {
              startTimer();
            }
          } else if (urlLower.includes('action=end') || urlLower.includes('action=stop')) {
            requestExternalEndRef.current();
          } else if (urlLower.includes('view=countdown') || urlLower.includes('section=countdown')) {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 150);
          }
        } catch (err) {
          console.warn('[FocusTab] deep link parse error:', err);
        }
      };

      Linking.getInitialURL()
        .then((url) => {
          if (url) handleIncomingUrl(url);
        })
        .catch((err) => {
          console.warn('[FocusTab] Linking.getInitialURL error:', err);
        });

      subscription = Linking.addEventListener('url', (event) => {
        handleIncomingUrl(event.url);
      });
    } catch (e) {
      console.warn('[FocusTab] Deep linking listener setup error:', e);
    }

    return () => {
      try {
        if (subscription) subscription.remove();
      } catch {}
    };
  }, [startTimer, stopTimer]);

  // Countdown States
  const [countdowns, setCountdowns] = useState<CountdownItem[]>([]);
  const [activeMenuCountdownId, setActiveMenuCountdownId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Keep hours & minutes live in real time
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  
  // Countdown Form Overlay States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<any | null>(null);
  const [eventName, setEventName] = useState('');
  const [targetDate, setTargetDate] = useState('2026-05-31');
  const [targetDateObject, setTargetDateObject] = useState<Date>(new Date(2026, 4, 31));
  const [targetTime, setTargetTime] = useState('11:00 AM');
  const [targetTimeObject, setTargetTimeObject] = useState<Date>(() => {
    const d = new Date(2026, 4, 31, 11, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [getReminders, setGetReminders] = useState(false);
  const [submittingCountdown, setSubmittingCountdown] = useState(false);
  // Free plan: countdowns can be up to 30 days away (design doc section 9).
  const [countdownProSheet, setCountdownProSheet] = useState(false);

  // The plan's preset from onboarding, once (design doc 6.1).
  useRecommendedPreset({
    ready: !!profile,
    isPro,
    busy: timerRunning || !pomodoroHydrated,
    apply: (fMin, bMin, sets) => {
      setFocusDurationMin(fMin);
      setBreakDurationMin(bMin);
      setTotalSets(sets);
    },
  });

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
        // Deduplicate active countdowns having identical normalized event_name and target calendar date (YYYY-MM-DD)
        const seen = new Set<string>();
        const deduplicatedRaw: any[] = [];
        const duplicateIdsToDeactivate: string[] = [];

        for (const item of freshCountdowns) {
          const normalizedName = (item.event_name || '').trim().toLowerCase();
          const targetYMD = item.target_date ? new Date(item.target_date).toISOString().slice(0, 10) : '';
          const dedupKey = `${normalizedName}_${targetYMD}`;

          if (seen.has(dedupKey)) {
            duplicateIdsToDeactivate.push(item.id);
          } else {
            seen.add(dedupKey);
            deduplicatedRaw.push(item);
          }
        }

        // Silently mark redundant duplicates as inactive in Supabase in the background
        if (duplicateIdsToDeactivate.length > 0) {
          supabase
            .from('countdowns')
            .update({ is_active: false })
            .in('id', duplicateIdsToDeactivate)
            .then(({ error }) => {
              if (error) {
                console.warn('Failed to deactivate duplicate countdowns in background:', error);
              }
            });
        }

        // Hydrate showHoursMinutes from local storage
        let savedPrefs: Record<string, boolean> = {};
        try {
          const raw = await AsyncStorage.getItem(`@countdowns_hours_mins_prefs_${uid}`);
          if (raw) savedPrefs = JSON.parse(raw);
        } catch {}

        const merged: CountdownItem[] = deduplicatedRaw.map((c: any) => ({
          ...c,
          showHoursMinutes: Boolean(savedPrefs[c.id] ?? c.showHoursMinutes ?? false),
        }));

        queryCache.setSync(cacheKey, merged);
        setCountdowns(merged);
      }
    } catch (e) {
      console.warn('Error loading countdowns:', e);
    }
  };

  const toggleCountdownHoursMinutes = async (countdownId: string) => {
    const updated = countdowns.map((c) =>
      c.id === countdownId ? { ...c, showHoursMinutes: !c.showHoursMinutes } : c
    );
    setCountdowns(updated);

    try {
      const targetUid = currentUserId || userId;
      if (targetUid) {
        const prefsMap: Record<string, boolean> = {};
        updated.forEach((c) => {
          if (c.showHoursMinutes !== undefined) {
            prefsMap[c.id] = c.showHoursMinutes;
          }
        });
        await AsyncStorage.setItem(
          `@countdowns_hours_mins_prefs_${targetUid}`,
          JSON.stringify(prefsMap)
        );
      }
    } catch (err) {
      console.warn('Error saving countdown hours/mins preference:', err);
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

  // Synchronize Countdown Widget
  useEffect(() => {
    let cancelled = false;
    const syncCountdowns = async () => {
      if (!countdowns || countdowns.length === 0) {
        await syncAllWidgetsFromApp({ countdowns: [] });
        return;
      }

      const countdownList: CountdownWidgetItem[] = countdowns.map((item) => {
        const targetIso = item.target_date || new Date().toISOString();
        return {
          id: item.id,
          title: item.event_name || item.title || item.name || item.description || 'Countdown',
          dateLabel: formatDateDMY(targetIso),
          targetDateIso: targetIso,
        };
      });

      let savedId: string | null = null;
      try {
        savedId = await AsyncStorage.getItem(SELECTED_WIDGET_COUNTDOWN_KEY);
      } catch {}
      if (cancelled) return;

      const activeCountdown =
        (savedId && countdownList.find((c) => c.id === savedId)) || countdownList[0];

      syncAllWidgetsFromApp({
        countdown: {
          title: activeCountdown.title,
          dateLabel: activeCountdown.dateLabel,
          targetDateIso: activeCountdown.targetDateIso,
        },
        countdowns: countdownList,
      });
    };

    syncCountdowns();
    return () => {
      cancelled = true;
    };
  }, [countdowns]);

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
        void recordMilestoneForReview('focus');
      }
    } catch (e) {
      console.warn('Error logging pomodoro session:', e);
    }
  };

  const triggerPhaseFeedback = useCallback(
    (message?: string) => {
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (message) {
        blocking.showSnackbar(message);
      }
    },
    [blocking]
  );

  // ─── Unified Single-Fire Phase Completion ───────────────────────────────────
  const completeCurrentPhase = useCallback(() => {
    const view = activeViewRef.current;
    const setNum = currentSetRef.current;
    if (view !== 'pomodoro' && view !== 'break') return;
    if (!timerRunningRef.current || isEndingRef.current || isTransitioningRef.current) return;

    const phaseKey = `${sessionIdRef.current || 'session'}:${view}:${setNum}`;
    if (completedPhaseKeysRef.current.has(phaseKey)) return;

    isTransitioningRef.current = true;
    completedPhaseKeysRef.current.add(phaseKey);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endTimeMsRef.current = null;

    try {
      const plannedSets = totalSetsRef.current;
      const fMin = focusDurationMinRef.current;
      const bMin = breakDurationMinRef.current;

      if (view === 'pomodoro') {
        const isFinalSet = setNum >= plannedSets;
        loggedMinutesRef.current += fMin;
        try {
          void logPomodoroSession(fMin, isFinalSet, 1);
        } catch (e) {
          console.warn('Error logging completed focus phase:', e);
        }

        if (!isFinalSet) {
          beginTimerPhase({
            view: 'break',
            durationSec: bMin * 60,
            setNumber: setNum,
          });
          triggerPhaseFeedback(`Focus complete! ${bMin} min break started.`);
        } else {
          sessionCompletedRef.current = true;
          stopTimer();
          if (!blocking.session) {
            triggerPhaseFeedback('All sets complete! Fantastic focus session.');
          } else {
            triggerPhaseFeedback();
          }
        }
      } else if (view === 'break') {
        try {
          void logPomodoroSession(0, false, 0, bMin);
        } catch (e) {
          console.warn('Error logging completed break phase:', e);
        }

        if (setNum < plannedSets) {
          const nextSet = setNum + 1;
          beginTimerPhase({
            view: 'pomodoro',
            durationSec: fMin * 60,
            setNumber: nextSet,
          });
          triggerPhaseFeedback(`Break over! Starting Set ${nextSet}.`);
        } else {
          sessionCompletedRef.current = true;
          stopTimer();
          if (!blocking.session) {
            triggerPhaseFeedback('All sets complete! Fantastic focus session.');
          } else {
            triggerPhaseFeedback();
          }
        }
      }
    } finally {
      queueMicrotask(() => {
        isTransitioningRef.current = false;
      });
    }
  }, [beginTimerPhase, blocking.session, stopTimer, triggerPhaseFeedback]);

  // ─── Background-resilient timer via AppState & exact endTimeMs ──────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (
          timerRunningRef.current &&
          !isPausedRef.current &&
          (activeViewRef.current === 'pomodoro' || activeViewRef.current === 'break') &&
          endTimeMsRef.current
        ) {
          const rem = Math.max(0, Math.ceil((endTimeMsRef.current - Date.now()) / 1000));
          if (rem <= 0) {
            completeCurrentPhase();
          } else {
            timeLeftRef.current = rem;
            setTimeLeft(rem);
          }
        }

        reconcileWidgetsToApp()
          .then(() => {
            const recentlyTransitioned = Date.now() - lastPhaseTransitionAtRef.current < 3000;
            if (isTransitioningRef.current || recentlyTransitioned) {
              const pomo = getWidgetPayload().pomodoro;
              if (pomo.isRunning) return;
            }
            syncFromWidgetState();
          })
          .catch(() => {});
      }
    });

    return () => subscription.remove();
  }, [completeCurrentPhase, syncFromWidgetState]);

  // Wall-clock-only Timer Engine
  useEffect(() => {
    if (!timerRunning || (activeView !== 'pomodoro' && activeView !== 'break')) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!endTimeMsRef.current || endTimeMsRef.current <= 0) {
      endTimeMsRef.current = Date.now() + Math.max(1, timeLeftRef.current) * 1000;
    }

    const tick = () => {
      if (!endTimeMsRef.current || !timerRunningRef.current || isPausedRef.current) return;
      const rem = Math.max(0, Math.ceil((endTimeMsRef.current - Date.now()) / 1000));
      if (rem <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        completeCurrentPhase();
        return;
      }
      if (rem !== timeLeftRef.current) {
        timeLeftRef.current = rem;
        setTimeLeft(rem);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning, activeView, currentSet, completeCurrentPhase]);

  const handleNextSession = () => {
    const setNum = currentSetRef.current;
    const plannedSets = totalSetsRef.current;
    if (setNum < plannedSets) {
      const nextSet = setNum + 1;
      beginTimerPhase({
        view: 'pomodoro',
        durationSec: focusDurationMinRef.current * 60,
        setNumber: nextSet,
      });
    } else {
      sessionCompletedRef.current = true;
      stopTimer();
    }
  };

  const handleEndFocusSession = async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    const endedView = activeViewRef.current;
    const endedSet = currentSetRef.current;
    const endedTimeLeft = endTimeMsRef.current
      ? Math.max(0, Math.ceil((endTimeMsRef.current - Date.now()) / 1000))
      : timeLeftRef.current;

    if (endedView === 'pomodoro' || endedView === 'break') {
      completedPhaseKeysRef.current.add(`${sessionIdRef.current || 'session'}:${endedView}:${endedSet}`);
    }

    // 1. Immediately and synchronously reset UI state & restore floating bottom nav bar
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const resetSec = focusDurationMinRef.current * 60;
    endTimeMsRef.current = null;
    isPausedRef.current = false;
    timerRunningRef.current = false;
    activeViewRef.current = 'config';
    timeLeftRef.current = resetSec;
    lastPhaseTransitionAtRef.current = Date.now();

    setConfirmEndEarly(false);
    setTimerRunning(false);
    setActiveView('config');
    setTimeLeft(resetSec);
    DeviceEventEmitter.emit('FOCALYST_POMODORO_ACTIVE_CHANGED', false);

    try {
      stopTimer();
    } catch (e) {
      console.warn('Error stopping timer:', e);
    }

    // 2. Perform background logging and cache invalidation non-blockingly
    try {
      if (endedView === 'pomodoro') {
        const elapsedInCurrentSetSeconds = Math.max(0, focusDuration - endedTimeLeft);
        const partialMinutes =
          elapsedInCurrentSetSeconds >= 60
            ? Math.max(1, Math.round(elapsedInCurrentSetSeconds / 60))
            : 0;

        if (partialMinutes > 0) {
          void logPomodoroSession(partialMinutes, false, 1);
          loggedMinutesRef.current += partialMinutes;
        }
      } else if (endedView === 'break') {
        const elapsedBreakSeconds = Math.max(0, breakDuration - endedTimeLeft);
        const partialBreakMinutes =
          elapsedBreakSeconds >= 60
            ? Math.max(1, Math.round(elapsedBreakSeconds / 60))
            : 0;

        if (partialBreakMinutes > 0) {
          void logPomodoroSession(0, false, 0, partialBreakMinutes);
        }
      }

      const uid = userId;
      if (uid) {
        queryCache.invalidatePrefix(`user:${uid}:insights`);
      }
      queryCache.invalidatePrefix('insights');
      DeviceEventEmitter.emit('refreshInsights');
      DeviceEventEmitter.emit('FOCALYST_FOCUS_ACTIVITY_UPDATED');
    } catch (e) {
      console.warn('Error logging ended focus session:', e);
    } finally {
      isEndingRef.current = false;
    }
  };

  const skipBreak = () => {
    const breakKey = `${sessionIdRef.current || 'session'}:break:${currentSetRef.current}`;
    completedPhaseKeysRef.current.add(breakKey);

    const remainingBreakSec = endTimeMsRef.current
      ? Math.max(0, Math.ceil((endTimeMsRef.current - Date.now()) / 1000))
      : timeLeftRef.current;
    const elapsedBreakSeconds = Math.max(0, breakDuration - remainingBreakSec);
    const partialBreakMinutes =
      elapsedBreakSeconds >= 60
        ? Math.max(1, Math.round(elapsedBreakSeconds / 60))
        : 0;
    if (partialBreakMinutes > 0) {
      void logPomodoroSession(0, false, 0, partialBreakMinutes);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    handleNextSession();
  };

  const startFocusSession = async () => {
    startTimer();
  };

  // Pausing freezes the remaining time; resuming moves the end time forward by the pause length.
  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rem = endTimeMsRef.current
      ? Math.max(1, Math.ceil((endTimeMsRef.current - Date.now()) / 1000))
      : timeLeftRef.current;
    isPausedRef.current = true;
    endTimeMsRef.current = null;
    timerRunningRef.current = false;
    timeLeftRef.current = rem;
    setTimeLeft(rem);
    setTimerRunning(false);

    if (pomodoroNotifIdRef.current) {
      const prevId = pomodoroNotifIdRef.current;
      pomodoroNotifIdRef.current = null;
      cancelNotification(prevId).catch(() => {});
    }

    persistPomodoroSnapshot({
      view: activeViewRef.current,
      durationSeconds: rem,
      isRunning: false,
      endTimeMs: 0,
      setNumber: currentSetRef.current,
    });
  };

  const resumeTimer = () => {
    const rem = Math.max(1, timeLeftRef.current);
    beginTimerPhase({
      view: activeViewRef.current === 'break' ? 'break' : 'pomodoro',
      durationSec: rem,
      setNumber: currentSetRef.current,
    });
  };

  // Keep native blocking in step with the Pomodoro: start, break, next set, pause and end.
  useEffect(() => {
    if (!pomodoroHydrated) return;
    const previousView = lastTimerViewRef.current;
    lastTimerViewRef.current = activeView;
    const justEnded = activeView === 'config' && previousView !== 'config';
    const completedAll = sessionCompletedRef.current;
    blocking.syncPomodoro({
      ended: justEnded
        ? {
            focusMinutes: loggedMinutesRef.current,
            completedAll,
            completedSets: completedAll ? totalSets : previousView === 'break' ? currentSet : Math.max(0, currentSet - 1),
          }
        : undefined,
      view: activeView,
      running: timerRunning,
      timeLeftSec: timeLeftRef.current,
      currentSet,
      totalSets,
      focusMin: focusDurationMin,
      breakMin: breakDurationMin,
    });
    // Only phase changes matter here; per-second ticks are read from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroHydrated, activeView, timerRunning, currentSet]);

  const resetFocusSession = async () => {
    stopTimer();
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

  // Open creation countdown sheet
  const handleOpenNewCountdown = () => {
    setEditingCountdown(null);
    setEventName('');
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    defaultDate.setHours(11, 0, 0, 0);
    setTargetDateObject(defaultDate);
    const formattedDate = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-${String(defaultDate.getDate()).padStart(2, '0')}`;
    setTargetDate(formattedDate);
    setTargetTimeObject(defaultDate);
    setTargetTime(defaultDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    setShowDatePicker(Platform.OS === 'ios');
    setShowTimePicker(Platform.OS === 'ios');
    setGetReminders(false);
    setIsFormOpen(true);
  };

  // Open edit countdown sheet
  const handleOpenEditCountdown = (item: any) => {
    setEditingCountdown(item);
    setEventName(item.event_name);
    const dateStr = item.target_date ? item.target_date.split('T')[0] : '2026-05-31';
    setTargetDate(dateStr);
    let parsedDate = new Date(2026, 4, 31, 11, 0, 0);
    if (item.target_date) {
      const fullDate = new Date(item.target_date);
      if (!isNaN(fullDate.getTime())) {
        parsedDate = fullDate;
      } else {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 11, 0, 0);
        }
      }
    }
    setTargetDateObject(parsedDate);
    setTargetTimeObject(parsedDate);
    setTargetTime(parsedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    setShowDatePicker(Platform.OS === 'ios');
    setShowTimePicker(Platform.OS === 'ios');
    setGetReminders(false);
    setIsFormOpen(true);
  };

  // Save countdown trigger (insert or update)
  const handleSaveCountdown = async () => {
    if (submittingCountdown) return;
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

      // Combine targetDateObject and targetTimeObject
      const combinedTarget = new Date(
        targetDateObject.getFullYear(),
        targetDateObject.getMonth(),
        targetDateObject.getDate(),
        targetTimeObject.getHours(),
        targetTimeObject.getMinutes(),
        0
      );
      const dateString = combinedTarget.toISOString();

      // Free plan: at most 30 days away. Pro: no date limit.
      if (!isPro && combinedTarget.getTime() - Date.now() > FREE_COUNTDOWN_MAX_DAYS * 24 * 60 * 60 * 1000) {
        setCountdownProSheet(true);
        return;
      }

      const cacheKey = `user:${currentUserId}:countdowns`;

      if (editingCountdown) {
        // Update countdown
        const { data, error } = await supabase
          .from('countdowns')
          .update({
            event_name: eventName.trim(),
            target_date: dateString,
          })
          .eq('id', editingCountdown.id)
          .select()
          .single();

        if (error) throw error;

        // Immediate optimistic update in state & cache
        const updatedItem = data || {
          ...editingCountdown,
          event_name: eventName.trim(),
          target_date: dateString,
        };
        const nextList = countdowns
          .map(c => (c.id === editingCountdown.id ? { ...c, ...updatedItem } : c))
          .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());

        setCountdowns(nextList);
        queryCache.setSync(cacheKey, nextList);

        Alert.alert('Success', 'Countdown updated successfully.');
      } else {
        // Insert new countdown - check free tier limit
        if (!isPro && countdowns.length >= 1) {
          setSubmittingCountdown(false);
          setIsFormOpen(false);
          router.push('/paywall');
          return;
        }

        const { data, error } = await supabase
          .from('countdowns')
          .insert([
            {
              user_id: currentUserId,
              event_name: eventName.trim(),
              target_date: dateString,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // Immediate optimistic update in state & cache
        if (data) {
          const deduplicated = [
            data,
            ...countdowns.filter(c => c.id !== data.id)
          ].sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());

          setCountdowns(deduplicated);
          queryCache.setSync(cacheKey, deduplicated);
        }

        Alert.alert('Success', 'New countdown saved!');
      }

      // Immediately sync with CountdownWidget
      syncAllWidgetsFromApp({
        countdown: {
          title: eventName.trim() || 'Audit',
          dateLabel: formatDateDMY(combinedTarget),
          targetDateIso: dateString,
        },
      });

      setIsFormOpen(false);
      await fetchCountdowns(currentUserId, true);

      // Schedule countdown alert if getReminders is enabled AND task reminders are enabled
      if (getReminders && notifPrefs.task_reminders_enabled) {
        await scheduleCountdownAlert(eventName.trim(), combinedTarget);
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
      const targetUserId = currentUserId || userId;
      const nextList = countdowns.filter(c => c.id !== id);
      setCountdowns(nextList);
      if (targetUserId) {
        queryCache.setSync(`user:${targetUserId}:countdowns`, nextList);
      }

      const { error } = await supabase
        .from('countdowns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (targetUserId) {
        await fetchCountdowns(targetUserId, true);
      }
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to delete countdown.');
      const targetUserId = currentUserId || userId;
      if (targetUserId) fetchCountdowns(targetUserId, true);
    }
  };

  const isTimerRunning = activeView === 'pomodoro' || activeView === 'break';
  useHideDevFab(isTimerRunning);

  useEffect(() => {
    DeviceEventEmitter.emit('FOCALYST_POMODORO_ACTIVE_CHANGED', isTimerRunning);
    return () => {
      DeviceEventEmitter.emit('FOCALYST_POMODORO_ACTIVE_CHANGED', false);
    };
  }, [isTimerRunning]);
  const theme = {
    background: isDarkMode ? '#0B1021' : '#F4F6FA',
    colors: {
      text: isDarkMode ? '#FFFFFF' : '#1E2229'
    }
  };
  const progress = 1 - (timeLeft / focusDuration);
  // Short phones (iPhone SE, 667pt) shrink the dial ~12% so pill, dial, bar and buttons all fit.
  const isCompactHeight = height < 720;

  // Distraction blocking on the timer screen: a status strip, and Pause/End follow the level.
  const showBlockingStrip = blockingArmed || !!blocking.session || blocking.shield.active;
  const sessionRulesLevel =
    blocking.session && blocking.session.phase !== 'timer_only' ? blocking.session.level : 'gentle';
  const lockedUntilLabel = formatClock(blocking.session?.plannedEndAt ?? Date.now() + timeLeft * 1000);
  const requestEndSession = () => {
    if (blocking.session?.phase === 'break_open') {
      void handleEndFocusSession();
      return;
    }
    if (sessionRulesLevel === 'firm') setConfirmEndEarly(true);
    else void handleEndFocusSession();
  };
  requestExternalEndRef.current = () => {
    if (!timerRunningRef.current && activeView === 'config') return;
    if (sessionRulesLevel === 'locked') {
      blocking.showSnackbar(`Locked until ${lockedUntilLabel}`);
      return;
    }
    requestEndSession();
  };
  const dialSize = isLandscape
    ? Math.max(200, Math.min(height - 135, 240))
    : Math.min(width * 0.85, 340);
  const stripDialSize = Math.round(Math.min(dialSize, 300) * (isCompactHeight ? 0.88 : 1));

  // Main Config settings view
  return (
    <AtmosphericScreenBackground isDarkMode={isDarkMode} withHeaderPadding={true}>
      <View style={[styles.container, { backgroundColor: 'transparent', flex: 1 }]}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        


        {/* Pomodoro settings configuration card */}
        <View style={[styles.card, isDarkMode && { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.cardTitle, isDarkMode ? { color: '#FFFFFF' } : { color: '#0A1530' }]}>{t('focus.pomodoro')}</Text>
            <TactilePressable style={styles.startBtn} onPress={startFocusSession}>
              <Text style={styles.startBtnText}>{t('focus.start')}</Text>
            </TactilePressable>
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
                return [styles.presetBase, { backgroundColor: '#1951fc', borderColor: '#1951fc' }];
              } else {
                return [styles.presetBase, {
                  backgroundColor: isDarkMode ? '#1C2233' : '#F1F5F9',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                }];
              }
            };

            const getPresetTextStyle = (isActive: boolean) => {
              if (isActive) {
                return [styles.presetActiveText, { color: '#FFFFFF' }];
              } else {
                return [styles.presetLockedText, { color: isDarkMode ? '#8E98AD' : '#0A1530' }];
              }
            };

            return (
              <View style={styles.presetsGrid}>
                <View style={styles.presetsRow}>
                  <TactilePressable
                    style={getPresetStyle(isDefaultPreset)}
                    onPress={() => {
                      setFocusDurationMin(25);
                      setBreakDurationMin(5);
                      setTotalSets(4);
                    }}
                  >
                    <Text numberOfLines={1} style={getPresetTextStyle(isDefaultPreset)}>25/5×4</Text>
                  </TactilePressable>
                  
                  <TactilePressable
                    style={getPresetStyle(isPreset45)}
                    onPress={() => handlePresetSelect('45/10×3', 45, 10, 3)}
                  >
                    <Text numberOfLines={1} style={getPresetTextStyle(isPreset45)}>45/10×3</Text>
                    {!isPro && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E98AD' : '#64748b'} style={{ marginLeft: 4 }} />}
                  </TactilePressable>
                </View>

                <View style={styles.presetsRow}>
                  <TactilePressable
                    style={getPresetStyle(isPreset60)}
                    onPress={() => handlePresetSelect('60/15×2', 60, 15, 2)}
                  >
                    <Text numberOfLines={1} style={getPresetTextStyle(isPreset60)}>60/15×2</Text>
                    {!isPro && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E98AD' : '#64748b'} style={{ marginLeft: 4 }} />}
                  </TactilePressable>

                  <TactilePressable
                    style={getPresetStyle(isPreset90)}
                    onPress={() => handlePresetSelect('90/30×2', 90, 30, 2)}
                  >
                    <Text numberOfLines={1} style={getPresetTextStyle(isPreset90)}>90/30×2</Text>
                    {!isPro && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E98AD' : '#64748b'} style={{ marginLeft: 4 }} />}
                  </TactilePressable>
                </View>
              </View>
            );
          })()}
        </View>

        {/* S1: Block distractions (setup, on/off, permission and quick block states) */}
        <BlockDistractionsCard
          containerStyle={[
            styles.shieldCard,
            styles.shieldCardStacked,
            isDarkMode && { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' },
          ]}
        />

        {/* Countdown list component widget */}
        <View style={{ width: '100%' }}>
          <PendingCountdownCard isDark={isDarkMode} isPro={isPro} />
          <Text style={[styles.sectionSubtitle, isDarkMode ? { color: '#FFFFFF' } : { color: '#0A1530' }]}>{t('focus.countdown')}</Text>

          {countdowns.length === 0 ? (
            <View style={[styles.emptyCard, isDarkMode && { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Text style={[styles.emptyText, isDarkMode && { color: '#8E95A9' }]}>No active countdowns. Add one!</Text>
            </View>
          ) : (
            countdowns.map(item => {
              const parts = getCountdownParts(item.target_date);
              const formattedDateStr = item.target_date ? new Date(item.target_date.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) : 'May 31, 2026';
              const isMenuOpen = activeMenuCountdownId === item.id;

              return (
                <View key={item.id} style={[styles.countdownCard, isDarkMode && { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
                  <View style={styles.countdownCardRow}>
                    {!item.showHoursMinutes ? (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.daysNumberText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                          {parts.totalDays}
                        </Text>
                        <Text style={[styles.daysLabelText, { color: isDarkMode ? '#8E95A9' : '#111827' }]}>
                          {' '}total days
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 34, fontWeight: '800', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                          {parts.totalDays}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#8E95A9' : '#334155', marginLeft: 4, marginRight: 14 }}>
                          days
                        </Text>

                        <Text style={{ fontSize: 34, fontWeight: '800', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                          {parts.hours}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#8E95A9' : '#334155', marginLeft: 4, marginRight: 14 }}>
                          hrs
                        </Text>

                        <Text style={{ fontSize: 34, fontWeight: '800', color: isDarkMode ? '#FFFFFF' : '#000000' }}>
                          {parts.minutes}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#8E95A9' : '#334155', marginLeft: 4 }}>
                          mins
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => setActiveMenuCountdownId(isMenuOpen ? null : item.id)}
                      activeOpacity={0.7}
                      style={styles.optionsDotBtn}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color={isDarkMode ? '#8E95A9' : '#64748b'} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.countdownMetaText, { color: isDarkMode ? '#8E95A9' : '#334155' }]}>
                    {formattedDateStr} • {item.event_name}
                  </Text>
                </View>
              );
            })
          )}

          {/* Add new countdown button trigger */}
          <TactilePressable
            style={styles.addCountdownBtn}
            onPress={handleOpenNewCountdown}
          >
            <Text style={[styles.addCountdownBtnText, { color: isDarkMode ? '#FFFFFF' : '#1D4ED8' }]}>{t('focus.addnew')}</Text>
          </TactilePressable>
        </View>

        {/* Single Countdown Action Menu Modal */}
        {(() => {
          const activeItem = countdowns.find((c) => c.id === activeMenuCountdownId);
          if (!activeItem) return null;
          return (
            <Modal
              transparent={true}
              visible={true}
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
                    <Text style={[styles.modalMenuTitle, isDarkMode && { color: '#8E95A9' }]}>{activeItem.event_name}</Text>
                    <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
                    <TouchableOpacity
                      onPress={() => {
                        setActiveMenuCountdownId(null);
                        handleOpenEditCountdown(activeItem);
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={[styles.menuItemText, isDarkMode && { color: '#FFFFFF' }]}>Edit</Text>
                    </TouchableOpacity>

                    {/* Show hours & minutes toggle row */}
                    <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
                        Show hours & minutes
                      </Text>
                      <TactileSwitch
                        value={Boolean(activeItem?.showHoursMinutes)}
                        onValueChange={() => {
                          if (activeItem) {
                            toggleCountdownHoursMinutes(activeItem.id);
                          }
                        }}
                        isDarkMode={isDarkMode}
                      />
                    </View>

                    <View style={[styles.menuDivider, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />
                    <TouchableOpacity
                      onPress={() => {
                        const id = activeItem.id;
                        setActiveMenuCountdownId(null);
                        handleDeleteCountdown(id);
                      }}
                      style={styles.menuItem}
                    >
                      <Text style={[styles.menuItemText, styles.menuItemDelete]}>Delete</Text>
                    </TouchableOpacity>
                  </Pressable>
                </View>
              </Pressable>
            </Modal>
          );
        })()}
      </ScrollView>
    </View>

    {/* Full-screen Pomodoro View — fills screen and covers tab bar with zero native UIViewController collisions */}
    {isTimerRunning && (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, zIndex: 9999, elevation: 10 }]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        {activeView === 'pomodoro' || (activeView === 'break' && showBlockingStrip) ? (
          <View
            style={[
              styles.timerContent,
              showBlockingStrip && !isLandscape && (isCompactHeight ? styles.timerContentCompact : styles.timerContentWithStrip),
              isLandscape && styles.timerContentLandscape,
            ]}
          >
            {/* Top section: Pill Header Indicator + Set Tracker */}
            <View style={[styles.timerTopHeader, isLandscape && styles.timerTopHeaderLandscape]}>
              <View
                style={[
                  styles.focusPill,
                  activeView === 'break'
                    ? {
                        backgroundColor: isDarkMode ? 'rgba(55, 129, 252, 0.14)' : '#cbe9fd',
                        borderColor: isDarkMode ? 'rgba(203, 233, 253, 0.35)' : '#3781fc',
                      }
                    : {
                        backgroundColor: isDarkMode ? 'rgba(25, 81, 252, 0.22)' : '#1951fc',
                        borderColor: isDarkMode ? '#3781fc' : '#1951fc',
                      },
                  isLandscape && styles.focusPillLandscape,
                ]}
              >
                <Text
                  style={[
                    styles.focusPillText,
                    activeView === 'break'
                      ? { color: isDarkMode ? '#cbe9fd' : '#03195b' }
                      : { color: isDarkMode ? '#cbe9fd' : '#FFFFFF' },
                    isLandscape && styles.focusPillTextLandscape,
                  ]}
                >
                  {activeView === 'break' ? 'BREAK TIME' : t('focus.focusTime')}
                </Text>
              </View>
              <Text style={[styles.setTrackerText, isDarkMode ? { color: '#8E95A9' } : { color: '#64748b' }, isLandscape && styles.setTrackerTextLandscape]}>
                {t('focus.setCount', { current: currentSet, total: totalSets })}
              </Text>
            </View>

            {/* Middle section: Seamless Feathered Blue Radial Gradient Dial with centered countdown digits */}
            <View
              pointerEvents="none"
              style={isLandscape ? styles.dialContainerLandscape : [styles.dialContainerPortrait, showBlockingStrip && styles.dialFlex]}
            >
              <SeamlessRadialTimerDial
                progress={activeView === 'break' ? 1 - timeLeft / Math.max(1, breakDuration) : progress}
                size={showBlockingStrip && !isLandscape ? stripDialSize : dialSize}
                isDark={isDarkMode}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit={false}
                  style={[
                    styles.hugeTimerDisplay,
                    {
                      color: isDarkMode ? '#FFFFFF' : '#0A1530',
                    },
                    isLandscape && styles.hugeTimerDisplayLandscape,
                  ]}
                >
                  {formatTimerString(timeLeft)}
                </Text>
              </SeamlessRadialTimerDial>
            </View>

            {/* Blocking bar and buttons share one container so their edges line up exactly */}
            <View style={isLandscape ? undefined : [styles.sessionActions, { paddingBottom: insets.bottom + 28 }]}>
            {showBlockingStrip && !isLandscape && (
              <BlockingStatusStrip
                isBreak={activeView === 'break'}
                isPaused={activeView === 'pomodoro' && !timerRunning}
                timeLeftSec={timeLeft}
                onAutoEnd={handleEndFocusSession}
              />
            )}

            {/* Bottom section: Media Buttons Row Controls (strictness rules decide what's allowed) */}
            <View style={[styles.timerControlsRow, isLandscape && styles.timerControlsRowLandscape]}>
              {sessionRulesLevel === 'locked' &&
              timerRunning &&
              timeLeft > 0 &&
              (!endTimeMsRef.current || Date.now() < endTimeMsRef.current) ? (
                <View style={[styles.resetBtn, styles.lockedUntilBtn, isDarkMode && styles.sessionBtnDark]}>
                  <Text style={[styles.resetBtnText, isDarkMode && { color: '#9AA0B4' }]}>
                    Locked until {lockedUntilLabel}
                  </Text>
                </View>
              ) : (
                <>
                  <TactilePressable
                    style={[styles.pauseBtn, isDarkMode && styles.sessionBtnDark, isLandscape && styles.controlBtnLandscape]}
                    onPress={activeView === 'break' ? skipBreak : timerRunning ? pauseTimer : resumeTimer}
                    hitSlop={8}
                  >
                    <Text style={[styles.pauseBtnText, isDarkMode && { color: '#FFFFFF' }, isLandscape && styles.controlBtnTextLandscape]}>
                      {activeView === 'break' ? t('focus.skip') : timerRunning ? t('focus.pause') : t('focus.resume')}
                    </Text>
                  </TactilePressable>

                  <TactilePressable
                    style={[styles.resetBtn, isDarkMode && styles.sessionBtnDark, isLandscape && styles.controlBtnLandscape]}
                    onPress={requestEndSession}
                    hitSlop={8}
                  >
                    <Text style={[styles.resetBtnText, isDarkMode && { color: '#FFFFFF' }, isLandscape && styles.controlBtnTextLandscape]}>
                      End
                    </Text>
                  </TactilePressable>
                </>
              )}
            </View>
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
              
              <TouchableOpacity style={styles.backBtn} onPress={requestEndSession} activeOpacity={0.8}>
                <Text style={styles.backBtnText}>{t('focus.back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
      </View>
    )}

    {/* S12: session summary after a Pomodoro with blocking */}
    {blocking.lastSummary && (
      <SessionSummaryModal
        record={blocking.lastSummary}
        onClose={blocking.dismissSummary}
        onStartNext={() => {
          blocking.dismissSummary();
          setTimeout(() => startTimer(), 300);
        }}
        onViewInsights={() => {
          blocking.dismissSummary();
          router.push('/(tabs)/insights?section=distractions');
        }}
      />
    )}

    {/* S13b: Firm end-early confirmation */}
    {isTimerRunning && (
      <Dialog
        visible={confirmEndEarly}
        title="End this session early?"
        body="Your apps unlock now and this counts as an unfinished session."
        primary={{ label: 'Keep going', onPress: () => setConfirmEndEarly(false) }}
        secondary={{
          label: 'End session',
          danger: true,
          onPress: () => {
            setConfirmEndEarly(false);
            handleEndFocusSession();
          },
        }}
        onClose={() => setConfirmEndEarly(false)}
      />
    )}

    {/* Countdown Form overlay slider state sheets */}
    <Modal
        visible={isFormOpen}
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}
        transparent={false}
      >
        <SafeAreaProvider>
          <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.formContainer, isDarkMode && { backgroundColor: '#0B1021' }, { paddingTop: 12 }]}>
            <ScrollView contentContainerStyle={[styles.formScrollContainer, columnStyle]} showsVerticalScrollIndicator={false}>
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
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDarkMode ? '#141927' : '#FFFFFF',
                      borderColor: isDarkMode ? '#232A3E' : '#cbd5e1',
                      color: isDarkMode ? '#FFFFFF' : '#0F172A',
                    },
                  ]}
                  placeholder="Give it a name"
                  placeholderTextColor={isDarkMode ? '#7C859E' : '#64748B'}
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
                          backgroundColor: isDarkMode ? '#141824' : '#FFFFFF',
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
                          <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#1E2229' }}>{targetDate}</Text>
                        </TouchableOpacity>
                      ) : (
                        <DateTimePicker
                          value={targetDateObject}
                          mode="date"
                          themeVariant={isDarkMode ? 'dark' : 'light'}
                          textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                          accentColor="#1951fc"
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
                      themeVariant={isDarkMode ? 'dark' : 'light'}
                      textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                      accentColor="#1951fc"
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
                  <View
                    style={[
                      styles.formIconInput,
                      {
                        justifyContent: 'center',
                        backgroundColor: isDarkMode ? '#141824' : '#FFFFFF',
                        borderColor: isDarkMode ? '#222A41' : '#cbd5e1',
                      },
                    ]}
                  >
                    {Platform.OS === 'android' ? (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}
                        onPress={() => setShowTimePicker(true)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: isDarkMode ? '#FFFFFF' : '#1E2229' }}>{targetTime}</Text>
                      </TouchableOpacity>
                    ) : (
                      <DateTimePicker
                        value={targetTimeObject}
                        mode="time"
                        themeVariant={isDarkMode ? 'dark' : 'light'}
                        textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                        accentColor="#1951fc"
                        display="compact"
                        onChange={(event, date) => {
                          if (date) {
                            setTargetTimeObject(date);
                            setTargetTime(date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
                          }
                        }}
                        style={{ height: 36, alignSelf: 'flex-start' }}
                      />
                    )}
                  </View>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={isDarkMode ? '#8E95A9' : '#64748b'}
                    style={styles.rightIcon}
                    pointerEvents="none"
                  />
                </View>
                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={targetTimeObject}
                    mode="time"
                    display="default"
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                    accentColor="#1951fc"
                    onChange={(event, date) => {
                      setShowTimePicker(false);
                      if (date) {
                        setTargetTimeObject(date);
                        setTargetTime(date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
                      }
                    }}
                  />
                )}
              </View>
            </View>

            {/* Switch alert alerts */}
            <View style={styles.remindersRow}>
              <Text style={[styles.remindersLabel, isDarkMode && { color: '#FFFFFF' }]}>Get reminders</Text>
              <Switch
                value={getReminders}
                onValueChange={setGetReminders}
                trackColor={{ false: isDarkMode ? '#222D47' : '#cbd5e1', true: '#1951fc' }}
                thumbColor={getReminders ? '#ffffff' : (isDarkMode ? '#8E95A9' : '#f1f5f9')}
              />
            </View>

            {/* CTA action buttons */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#1951fc' }]}
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
        {/* Free plan: countdowns beyond 30 days are part of Pro */}
        <Dialog
          visible={countdownProSheet}
          title="Countdowns beyond 30 days are part of Pro."
          body="Pick a date within 30 days, or see Pro for countdowns with no date limit."
          primary={{
            label: 'See Pro',
            onPress: () => {
              setCountdownProSheet(false);
              setIsFormOpen(false);
              router.push('/paywall');
            },
          }}
          secondary={{ label: 'Not now', onPress: () => setCountdownProSheet(false) }}
          onClose={() => setCountdownProSheet(false)}
        />
      </SafeAreaProvider>
    </Modal>
    </AtmosphericScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9', // premium Light Mode layout background
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 140,
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
    borderColor: 'rgba(15, 23, 42, 0.07)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    color: '#0A1530',
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
    backgroundColor: '#1951fc',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 0,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  presetBase: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  presetActive: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#1951fc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetActiveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  presetLocked: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  presetLockedText: {
    fontSize: 14,
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
  shieldCardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.07)',
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  countdownCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  daysNumberText: {
    color: '#000000',
    fontSize: 34,
    fontWeight: '700',
  },
  daysLabelText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  optionsDotBtn: {
    padding: 6,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownMetaText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  addCountdownBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginTop: 4,
  },
  addCountdownBtnText: {
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
    justifyContent: 'center',
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
    minHeight: 48,
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
    backgroundColor: '#1951fc',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
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
  dialFlex: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContentWithStrip: {
    paddingTop: 48,
    paddingBottom: 40,
  },
  timerContentCompact: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  dialContainerLandscape: {
    marginVertical: 0,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusPill: {
    borderRadius: 99,
    borderWidth: 1,
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
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    flex: 0,
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
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    minWidth: 136,
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    minWidth: 136,
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionActions: {
    width: '100%',
    maxWidth: 316,
    alignSelf: 'center',
  },
  sessionBtnDark: {
    backgroundColor: '#111521',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  lockedUntilBtn: {
    paddingHorizontal: 24,
  },
  resetBtnText: {
    color: '#0F172A',
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
    backgroundColor: '#1951fc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: 100,
    alignItems: 'center',
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
