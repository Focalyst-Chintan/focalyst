import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, RadialGradient as SvgRadialGradient, Stop, Rect } from 'react-native-svg';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '../../src/utils/UserContext';
import { useTranslation } from 'react-i18next';
import {
  fetchWeeklyData,
  fetchUserPlan,
  calculateProductivityScore,
  fetchTotalFocusHours,
} from '../../src/utils/analytics';
import { LEVEL_BENCHMARKS, LevelBenchmark } from '../../src/utils/xpService';
import { syncLevelBadges, syncStreakBadges } from '../../src/utils/badgeMilestones';
import { LevelUpModal } from '../../components/insights/LevelUpModal';
import { queryCache } from '../../src/utils/queryCache';
import WeeklyReportSheet from '../../components/WeeklyReportSheet';
import HabitGroupLeaderboardSection from '../../components/insights/HabitGroupLeaderboardSection';
import { StartingReportCard } from '../../src/onboarding/StartingReportCard';
import DistractionsSection from '../../components/insights/DistractionsSection';
import { ProductivityScoreCard } from '../../components/insights/ProductivityScoreCard';
import { TotalFocusTimeCard } from '../../components/insights/TotalFocusTimeCard';
import { TasksCompletedCard } from '../../components/insights/TasksCompletedCard';
import { ActiveHabitCard } from '../../components/insights/ActiveHabitCard';
import FocusActivityCard from '../../components/insights/FocusActivityCard';
import { HABIT_GROUP_UPDATED_EVENT } from '../../src/services/habitGroupService';
import { ScreenSkeleton, ErrorRetryBanner } from '../../components/ui/ScreenSkeleton';
import { AtmosphericScreenBackground } from '../../components/AtmosphericScreenBackground';
import { SegmentedToggle } from '../../components/ui/SegmentedToggle';
import { TactilePressable } from '../../components/ui/TactilePressable';
import { fetchYearWrapped, isWrappedWindowActive } from '../../src/services/wrappedService';

export default function InsightsTab() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user, profile, refreshProfile } = useUser();
  const currentUserId = user?.id || profile?.id || null;
  // Only the signed-in account's own profile counts (never a previous account's cached one).
  const isPro = !!profile?.isPro && (!user?.id || profile.id === user.id);
  const lastProfileRefresh = useRef(0);

  // Compute today's date key for SWR cache lookup
  const now = new Date();
  const todayKeyStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const cacheKey = currentUserId ? `user:${currentUserId}:insights:${todayKeyStr}` : '';
  const cachedData = cacheKey ? queryCache.getSync<any>(cacheKey) : null;

  const [loading, setLoading] = useState(!cachedData);
  const [userId, setUserId] = useState<string | null>(currentUserId);
  const isFetchingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const distractionsY = useRef<number | null>(null);
  const hasLoadedRef = useRef(false);
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [wrappedAvailable, setWrappedAvailable] = useState(() => isWrappedWindowActive());

  // Local YYYY-MM-DD Date Formatter (Prevents UTC midnight backward shift)
  const formatLocalYMD = (d: Date = new Date()): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Load theme and refresh insights whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const checkTheme = async () => {
        try {
          const val = await AsyncStorage.getItem('darkMode');
          if (val !== null && isMounted) {
            setIsDarkMode(val === 'true');
          }
        } catch (e) {
          console.warn('Error loading theme:', e);
        }
      };
      checkTheme();

      // Always force-refresh insights data when switching to the Insights tab
      fetchInsights(true);
      // Plan changes (a Lifetime purchase, a restore) unlock Pro sections without a restart.
      if (Date.now() - lastProfileRefresh.current > 30_000) {
        lastProfileRefresh.current = Date.now();
        void refreshProfile();
      }

      if (isWrappedWindowActive()) {
        fetchYearWrapped({ year: 2026, preview: false })
          .then((res) => {
            if (isMounted) {
              setWrappedAvailable(res.status === 'ready');
            }
          })
          .catch(() => {
            if (isMounted) setWrappedAvailable(false);
          });
      } else {
        setWrappedAvailable(false);
      }

      return () => {
        isMounted = false;
      };
    }, [currentUserId])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setIsDarkMode(newVal);
    });
    const groupSub = DeviceEventEmitter.addListener(HABIT_GROUP_UPDATED_EVENT, () => {
      fetchInsights(true);
    });
    const habitsSub = DeviceEventEmitter.addListener('refreshHabits', () => {
      fetchInsights(true);
    });
    const focusSub = DeviceEventEmitter.addListener('FOCALYST_FOCUS_ACTIVITY_UPDATED', () => {
      fetchInsights(true);
    });
    const refreshSub = DeviceEventEmitter.addListener('refreshInsights', () => {
      fetchInsights(true);
    });
    return () => {
      sub.remove();
      groupSub.remove();
      habitsSub.remove();
      focusSub.remove();
      refreshSub.remove();
    };
  }, [currentUserId]);
  
  // Chart View (Weekly vs Monthly)
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly');

  // Gamification State (XP-based) - Synchronously populated if cached
  const [totalXP, setTotalXP] = useState(cachedData?.fetchedXP || 0);
  const [currentLevel, setCurrentLevel] = useState(cachedData?.fetchedLevel || 1);
  const [currentTitle, setCurrentTitle] = useState(cachedData?.fetchedTitle || 'Ignition');
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [levelBannerSize, setLevelBannerSize] = useState({ width: 350, height: 112 });
  const [weeklyReportCardSize, setWeeklyReportCardSize] = useState({ width: 350, height: 170 });
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevelAchieved, setNewLevelAchieved] = useState<LevelBenchmark | null>(null);

  // Weekly Stats (Current and Last Week Pipeline)
  const [totalFocusHours, setTotalFocusHoursState] = useState(cachedData?.fetchedTotalFocusHours || 0);
  const [totalWeeklyMinutes, setTotalWeeklyMinutes] = useState(cachedData?.sumWeeklyMinutes || 0);
  const [tasksCompleted, setTasksCompleted] = useState(cachedData?.weeklyTasksCompleted || 0);
  const [tasksTotal, setTasksTotal] = useState(cachedData?.weeklyTasksTotal || 0);
  const [habitsCompleted, habitsCompletedSet] = useState(cachedData?.weeklyHabitsCompleted || 0);
  const [habitsTotal, habitsTotalSet] = useState(cachedData?.weeklyHabitsTotal || 0);

  // 7-day focus chart dynamic data
  const [chartData, setChartData] = useState<any[]>(cachedData?.weeklyChart || []);
  // Monthly focus chart dynamic data (W1..W4)
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>(cachedData?.monthlyChart || []);

  // Active habits list for horizontal scroll
  const [activeHabits, setActiveHabits] = useState<any[]>(cachedData?.mappedHabits || []);

  // Weekly Report Sheet visibility
  const [reportSheetOpen, setReportSheetOpen] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-expand weekly report sheet if opened from plan alert
  useEffect(() => {
    if (params && params.openReport === 'true') {
      setReportSheetOpen(true);
      router.setParams({ openReport: '' });
    }
  }, [params]);

  // S12 "View in Insights" lands on the Distractions section.
  useEffect(() => {
    if (params?.section !== 'distractions') return;
    const id = setTimeout(() => {
      if (distractionsY.current != null) scrollRef.current?.scrollTo({ y: distractionsY.current - 16, animated: true });
      router.setParams({ section: '' });
    }, 400);
    return () => clearTimeout(id);
  }, [params?.section]);

  // Load and refresh insights with queryCache & strict date bounds
  const fetchInsights = async (forceRefresh: boolean = false) => {
    const uid = currentUserId || userId;
    if (!uid) return;

    try {
      if (isMountedRef.current) setUserId(uid);
      if (!queryCache.getSync(`user:${uid}:insights:${todayKeyStr}`)) {
        if (isMountedRef.current) setLoading(true);
      }

      const activeCacheKey = `user:${uid}:insights:${todayKeyStr}`;

      const cachedResult = await queryCache.fetchWithCache(
        activeCacheKey,
        async () => {
          // Today's date in local YYYY-MM-DD
          const localNow = new Date();
          const todayYear = localNow.getFullYear();
          const todayMonth = String(localNow.getMonth() + 1).padStart(2, '0');
          const todayStr = formatLocalYMD(localNow);

          // Strict Date Boundaries for daily_focus_activity
          const startOfMonthStr = `${todayYear}-${todayMonth}-01`;
          const currentDayOfWeek = localNow.getDay(); // 0 = Sun .. 6 = Sat
          const startOfWeek = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate() - currentDayOfWeek);
          const startOfWeekStr = formatLocalYMD(startOfWeek);
          const earliestBoundStr = startOfMonthStr < startOfWeekStr ? startOfMonthStr : startOfWeekStr;
          const yearAgo = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate() - 365);
          const yearAgoStr = formatLocalYMD(yearAgo);

          // Parallelize all queries concurrently via a single Promise.all block
          const [xpRes, totalHoursRaw, weeklyData, habitsRes, logsRes, dailyActivityRes] = await Promise.all([
            !profile
              ? supabase
                  .from('users')
                  .select('total_xp, current_level, current_title')
                  .eq('id', uid)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            fetchTotalFocusHours(uid).catch((err) => {
              console.warn('Error fetching total focus hours:', err);
              return 0;
            }),
            fetchWeeklyData(uid),
            supabase
              .from('habits')
              .select('id, name, icon, color, current_streak')
              .eq('user_id', uid)
              .eq('is_active', true),
            supabase
              .from('habit_logs')
              .select('habit_id')
              .eq('user_id', uid)
              .gte('completed_date', yearAgoStr),
            supabase
              .from('daily_focus_activity')
              .select('focus_time_minutes, break_time_minutes, date')
              .eq('user_id', uid)
              .gte('date', earliestBoundStr)
              .lte('date', todayStr),
          ]);

          // XP data
          let fetchedXP = profile?.total_xp ?? 0;
          let fetchedLevel = profile?.current_level ?? 1;
          let fetchedTitle = profile?.current_title ?? 'Ignition';
          if (!profile && xpRes?.data) {
            fetchedXP = (xpRes.data as any).total_xp || 0;
            fetchedLevel = (xpRes.data as any).current_level || 1;
            fetchedTitle = (xpRes.data as any).current_title || 'Ignition';
          }

          const fetchedTotalFocusHours = parseFloat(String(totalHoursRaw)) || 0;

          // Habit completion counts
          const habitsList = habitsRes?.data || [];
          const logData = logsRes?.data || [];
          const completionsCountMap: Record<string, number> = {};
          logData.forEach((log: any) => {
            completionsCountMap[log.habit_id] = (completionsCountMap[log.habit_id] || 0) + 1;
          });

          const mappedHabits = habitsList.map((h: any) => ({
            ...h,
            total_days: completionsCountMap[h.id] || 0,
          }));

          const focusRows = dailyActivityRes?.data || [];

          // ─── Weekly 7-Day Chart Generation (Sun -> Sat with Strict Local Date Matching) ───
          const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const tempWeeklyChart: any[] = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
            const exactDateStr = formatLocalYMD(d);

            let focusMinutes = 0;
            let breakMinutes = 0;

            focusRows.forEach((row: any) => {
              const rowDateStr = String(row.date || row.activity_date || '').slice(0, 10);
              if (rowDateStr === exactDateStr) {
                focusMinutes += Number(row.focus_time_minutes) || 0;
                breakMinutes += Number(row.break_time_minutes) || 0;
              }
            });

            tempWeeklyChart.push({
              dateStr: exactDateStr,
              label: weekdays[i],
              focusMinutes,
              breakMinutes,
              isToday: exactDateStr === todayStr,
            });
          }

          // ─── Monthly Chart Generation (Every Day 1..daysInMonth) ───
          const daysInMonth = new Date(todayYear, localNow.getMonth() + 1, 0).getDate();
          const tempMonthlyChart: any[] = [];

          for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(todayYear, localNow.getMonth(), day);
            const exactDateStr = formatLocalYMD(d);

            let focusMinutes = 0;
            let breakMinutes = 0;

            focusRows.forEach((row: any) => {
              const rowDateStr = String(row.date || row.activity_date || '').slice(0, 10);
              if (rowDateStr === exactDateStr) {
                focusMinutes += Number(row.focus_time_minutes) || 0;
                breakMinutes += Number(row.break_time_minutes) || 0;
              }
            });

            tempMonthlyChart.push({
              dateStr: exactDateStr,
              label: String(day),
              dayNum: day,
              focusMinutes,
              breakMinutes,
              isToday: exactDateStr === todayStr,
            });
          }

          const sumWeeklyMins = tempWeeklyChart.reduce((acc, item) => acc + (item.focusMinutes || 0), 0);

          return {
            fetchedXP,
            fetchedLevel,
            fetchedTitle,
            fetchedTotalFocusHours,
            weeklyTasksCompleted: weeklyData.tasksCompleted,
            weeklyTasksTotal: weeklyData.tasksTotal,
            weeklyHabitsCompleted: weeklyData.habitsCompleted,
            weeklyHabitsTotal: weeklyData.habitsTotal,
            mappedHabits,
            weeklyChart: tempWeeklyChart,
            monthlyChart: tempMonthlyChart,
            sumWeeklyMinutes: sumWeeklyMins,
          };
        },
        120_000,
        forceRefresh
      );

      if (isMountedRef.current) {
        setTotalXP(cachedResult.fetchedXP);
        setCurrentLevel(cachedResult.fetchedLevel);
        setCurrentTitle(cachedResult.fetchedTitle);
        setTotalFocusHoursState(cachedResult.fetchedTotalFocusHours);
        setTasksCompleted(cachedResult.weeklyTasksCompleted);
        setTasksTotal(cachedResult.weeklyTasksTotal);
        habitsCompletedSet(cachedResult.weeklyHabitsCompleted);
        habitsTotalSet(cachedResult.weeklyHabitsTotal);
        setActiveHabits(cachedResult.mappedHabits);
        setChartData(cachedResult.weeklyChart);
        setMonthlyChartData(cachedResult.monthlyChart);
        setTotalWeeklyMinutes(cachedResult.sumWeeklyMinutes);
      }

      // Check for Level Up trigger & sync badges silently
      void syncLevelBadges(cachedResult.fetchedLevel, uid);
      const bestHabitStreak = (cachedResult.mappedHabits || []).reduce(
        (max: number, h: any) => Math.max(max, Number(h.longest_streak || 0), Number(h.current_streak || 0)),
        0
      );
      if (bestHabitStreak > 0) {
        void syncStreakBadges(bestHabitStreak, uid);
      }

      const lastSeenLevelStr = await AsyncStorage.getItem(`last_seen_level_${uid}`);
      if (lastSeenLevelStr && isMountedRef.current) {
        const lastSeenLevelNum = parseInt(lastSeenLevelStr, 10);
        if (cachedResult.fetchedLevel > lastSeenLevelNum) {
          const benchmark = LEVEL_BENCHMARKS.find(b => b.level === cachedResult.fetchedLevel) || LEVEL_BENCHMARKS[0];
          setNewLevelAchieved(benchmark);
          setShowLevelUpModal(true);
        }
      }
      await AsyncStorage.setItem(`last_seen_level_${uid}`, cachedResult.fetchedLevel.toString());

    } catch (e) {
      console.error('Error loading insights screen:', e);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading && !cachedData) {
    return (
      <AtmosphericScreenBackground isDarkMode={isDarkMode} withHeaderPadding={true} style={styles.container}>
        <View style={{ padding: 16 }}>
          <ScreenSkeleton isDark={isDarkMode} showChart={true} rows={3} />
        </View>
      </AtmosphericScreenBackground>
    );
  }

  // XP-based level progress calculations
  const currentBenchmark = LEVEL_BENCHMARKS.find(b => b.level === currentLevel) || LEVEL_BENCHMARKS[0];
  const nextBenchmark = LEVEL_BENCHMARKS.find(b => b.level === currentLevel + 1) || LEVEL_BENCHMARKS[14];
  const xpIntoLevel = totalXP - currentBenchmark.xp;
  const xpRequiredForNext = nextBenchmark.xp - currentBenchmark.xp;
  const progressPercent = Math.min(100, Math.max(0, (xpIntoLevel / xpRequiredForNext) * 100));
  const xpRemaining = nextBenchmark.xp - totalXP;

  // Compute local productivity score for display
  const { score: displayScore } = calculateProductivityScore(
    totalWeeklyMinutes / 60,
    tasksCompleted,
    tasksTotal,
    habitsCompleted,
    habitsTotal
  );


  return (
    <AtmosphericScreenBackground isDarkMode={isDarkMode} withHeaderPadding={true} style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 140, // Ample clearance above bottom tab bar and floating menu
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* 2026 Year Wrapped Entry Card (Dec 31 – Jan 5 only) */}
        {isWrappedWindowActive() && wrappedAvailable && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/wrapped?year=2026' as any)}
            style={{ marginBottom: 14 }}
          >
            <LinearGradient
              colors={['#020307', '#061547', '#0043EE']}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={{
                borderRadius: 18,
                paddingVertical: 15,
                paddingHorizontal: 18,
                borderWidth: 1,
                borderColor: 'rgba(61, 200, 255, 0.28)',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    color: '#3DC8FF',
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 1.6,
                  }}
                >
                  FOCALYST · 2026
                </Text>
                <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700' }}>
                  Your 2026 Wrapped is Here
                </Text>
                <Text style={{ color: 'rgba(226, 232, 240, 0.78)', fontSize: 12 }}>
                  Open your Dec 31 – Jan 5 annual story
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#3DC8FF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Gamification Level Banner */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => setTimelineExpanded(!timelineExpanded)}
        >
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (
                width > 0 &&
                height > 0 &&
                (Math.abs(width - levelBannerSize.width) > 1 ||
                  Math.abs(height - levelBannerSize.height) > 1)
              ) {
                setLevelBannerSize({ width, height });
              }
            }}
            style={[
              styles.levelBanner,
              {
                backgroundColor: isDarkMode ? '#0A0E14' : '#B91C1C',
                borderColor: isDarkMode
                  ? 'rgba(239, 68, 68, 0.34)'
                  : 'rgba(254, 202, 202, 0.48)',
              },
            ]}
          >
            {/* Base obsidian-charcoal (Dark) / rich crimson jewel-tone (Light) surface */}
            <LinearGradient
              colors={
                isDarkMode
                  ? ['#0A0E14', '#0D1219', '#0F1722']
                  : ['#7F1D1D', '#B91C1C', '#DC2626', '#EF4444']
              }
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Lower-center crimson radial shine + bottom-center specular rim highlight */}
            <Svg
              width={levelBannerSize.width}
              height={levelBannerSize.height}
              viewBox={`0 0 ${levelBannerSize.width} ${levelBannerSize.height}`}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                {isDarkMode ? (
                  <SvgRadialGradient id="levelCrimsonGlow" cx="50%" cy="102%" rx="72%" ry="58%">
                    <Stop offset="0%" stopColor="#EF4444" stopOpacity="0.58" />
                    <Stop offset="32%" stopColor="#DC2626" stopOpacity="0.36" />
                    <Stop offset="65%" stopColor="#991B1B" stopOpacity="0.14" />
                    <Stop offset="100%" stopColor="#0A0E14" stopOpacity="0" />
                  </SvgRadialGradient>
                ) : (
                  <SvgRadialGradient id="levelCrimsonGlow" cx="50%" cy="102%" rx="72%" ry="58%">
                    <Stop offset="0%" stopColor="#FECACA" stopOpacity="0.50" />
                    <Stop offset="38%" stopColor="#FCA5A5" stopOpacity="0.28" />
                    <Stop offset="75%" stopColor="#EF4444" stopOpacity="0" />
                  </SvgRadialGradient>
                )}

                <SvgLinearGradient id="levelBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop
                    offset="0%"
                    stopColor={isDarkMode ? '#DC2626' : '#FCA5A5'}
                    stopOpacity={0}
                  />
                  <Stop
                    offset="25%"
                    stopColor={isDarkMode ? '#EF4444' : '#FECACA'}
                    stopOpacity={isDarkMode ? 0.48 : 0.55}
                  />
                  <Stop
                    offset="50%"
                    stopColor={isDarkMode ? '#FCA5A5' : '#FEF2F2'}
                    stopOpacity={isDarkMode ? 0.9 : 0.92}
                  />
                  <Stop
                    offset="75%"
                    stopColor={isDarkMode ? '#EF4444' : '#FECACA'}
                    stopOpacity={isDarkMode ? 0.48 : 0.55}
                  />
                  <Stop
                    offset="100%"
                    stopColor={isDarkMode ? '#DC2626' : '#FCA5A5'}
                    stopOpacity={0}
                  />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={levelBannerSize.width}
                height={levelBannerSize.height}
                fill="url(#levelCrimsonGlow)"
              />
              <Rect
                x={0}
                y={levelBannerSize.height - 3}
                width={levelBannerSize.width}
                height={3}
                fill="url(#levelBottomRim)"
              />
            </Svg>

            {/* Row 1: Level & XP Remaining */}
            <View style={styles.levelTopRow}>
              <Text
                style={[
                  styles.levelNumText,
                  !isDarkMode && { color: 'rgba(255, 255, 255, 0.88)' },
                ]}
              >
                Level {currentLevel}
              </Text>
              <Text
                style={[
                  styles.levelRemainingText,
                  !isDarkMode && { color: 'rgba(255, 255, 255, 0.88)' },
                ]}
              >
                {Math.max(0, xpRemaining)} XP remaining to Level {nextBenchmark.level}
              </Text>
            </View>

            {/* Row 2: Large Bold Level Title & Chevron */}
            <View style={styles.levelMiddleRow}>
              <Text
                style={[
                  styles.bannerLevelName,
                  { color: '#FFFFFF' },
                ]}
              >
                {currentTitle}
              </Text>
              <Ionicons
                name={timelineExpanded ? 'chevron-up' : 'chevron-down'}
                size={23}
                color="#FFFFFF"
              />
            </View>

            {/* Row 3: Full-Width XP Progress Bar */}
            <View
              style={[
                styles.bannerProgressBg,
                !isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.28)' },
              ]}
            >
              <View
                style={[
                  styles.bannerProgressBar,
                  !isDarkMode && { backgroundColor: '#FFFFFF' },
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expandable Level Timeline Accordion */}
        {timelineExpanded && (
          <View
            style={[
              styles.timelineCard,
              isDarkMode
                ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
                : { backgroundColor: '#FFFFFF', borderColor: 'rgba(15, 23, 42, 0.08)' },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={[styles.timelineTitle, { marginBottom: 0 }, isDarkMode ? { color: '#F87171' } : { color: '#DC2626' }]}>
                Level Timeline
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/badges' as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(255,107,0,0.4)' : 'rgba(255,107,0,0.35)',
                  backgroundColor: isDarkMode ? 'rgba(255,107,0,0.14)' : 'rgba(255,107,0,0.08)',
                }}
              >
                <Ionicons name="ribbon" size={12} color="#FF6B00" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#0F172A' }}>
                  See Badges
                </Text>
                <Ionicons name="chevron-forward" size={12} color={isDarkMode ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timelineScroll} nestedScrollEnabled>
              {LEVEL_BENCHMARKS.map((benchmark) => {
                const isCompleted = totalXP >= benchmark.xp && benchmark.level !== currentLevel;
                const isCurrent = benchmark.level === currentLevel;
                const isLocked = totalXP < benchmark.xp;

                return (
                  <View key={`timeline-lvl-${benchmark.level}`} style={styles.timelineItem}>
                    {/* Circle Indicator and Connecting Vertical Line */}
                    <View style={styles.timelineIndicatorColumn}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isCompleted && [
                            styles.timelineCircleCompleted,
                            { backgroundColor: isDarkMode ? '#EF4444' : '#DC2626' },
                          ],
                          isCurrent && [
                            styles.timelineCircleCurrent,
                            { backgroundColor: isDarkMode ? '#EF4444' : '#DC2626' },
                          ],
                          isCurrent && isDarkMode && { borderColor: '#111521' },
                          isLocked && styles.timelineCircleLocked,
                          isLocked && isDarkMode && { backgroundColor: '#080c18', borderColor: 'rgba(255, 255, 255, 0.1)' },
                        ]}
                      >
                        {isCompleted && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                        {isCurrent && (
                          <Text style={styles.timelineCurrentNum}>{benchmark.level}</Text>
                        )}
                        {isLocked && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E95A9' : '#94a3b8'} />}
                      </View>
                      {benchmark.level < 15 && <View style={[styles.timelineLine, isDarkMode && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />}
                    </View>

                    {/* Timeline Level Detail Info */}
                    <View style={styles.timelineInfoColumn}>
                      <Text
                        style={[
                          styles.timelineLvlName,
                          isDarkMode && { color: '#FFFFFF' },
                          isCurrent && { color: isDarkMode ? '#F87171' : '#DC2626' },
                          isLocked && styles.timelineLvlNameLocked,
                          isLocked && isDarkMode && { color: '#8E95A9' },
                        ]}
                      >
                        Level {benchmark.level} — {benchmark.title}
                      </Text>
                      
                      {isCurrent ? (
                        <View
                          style={[
                            styles.currentLvlInfoBox,
                            isDarkMode
                              ? { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.45)', borderWidth: 1 }
                              : { backgroundColor: '#FEF2F2', borderColor: 'rgba(220, 38, 38, 0.35)', borderWidth: 1 },
                          ]}
                        >
                          <Text style={[styles.timelineHoursText, isDarkMode && { color: '#CBD5E1' }]}>
                            {totalXP} XP / {nextBenchmark.xp} XP base
                          </Text>
                          <View
                            style={[
                              styles.timelineProgressBarBg,
                              { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.18)' : '#FEE2E2' },
                            ]}
                          >
                            <View
                              style={[
                                styles.timelineProgressBarFill,
                                {
                                  backgroundColor: isDarkMode ? '#FFFFFF' : '#DC2626',
                                  width: `${progressPercent}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.timelineRemainingText, isDarkMode ? { color: '#F87171' } : { color: '#DC2626' }]}>
                            {Math.max(0, xpRemaining)} XP remaining to Level {nextBenchmark.level}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.timelineHoursText, isDarkMode && { color: '#8E95A9' }]}>{benchmark.xp} XP required</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Stats Grid Layout */}
        <View style={styles.gridContainer}>
          {/* Tasks Completed */}
          <TasksCompletedCard
            title={t('insights.tasksCompleted')}
            subtitle={
              tasksCompleted === tasksTotal && tasksTotal > 0
                ? 'Incredible! You completed all tasks.'
                : t('insights.tasksSub')
            }
            tasksCompleted={tasksCompleted}
            tasksTotal={tasksTotal}
            isDarkMode={isDarkMode}
          />

          {/* Square Cards Grid Row */}
          <View style={styles.gridRow}>
            {/* Total Focus Time Card */}
            <TotalFocusTimeCard
              formattedTime={(() => {
                const totalMinutes = Math.round(totalFocusHours * 60);
                return Math.floor(totalMinutes / 60) + 'h ' + (totalMinutes % 60) + 'm';
              })()}
              label={t('insights.totalFocus')}
              deltaText="-9%"
              isDarkMode={isDarkMode}
            />

            {/* Productivity Score (Subscription Gated Card) */}
            <ProductivityScoreCard
              score={displayScore}
              label={t('insights.productivityScore')}
              isDarkMode={isDarkMode}
              isLocked={!isPro}
              lockedOverlay={
                <View style={[styles.paywallOverlay, isDarkMode ? { backgroundColor: '#111521' } : { backgroundColor: '#FFFFFF' }]}>
                  <Ionicons name="lock-closed" size={24} color={isDarkMode ? '#8E98AD' : '#1951fc'} />
                  <TouchableOpacity
                    style={[
                      styles.paywallUpgradeBtn,
                      isDarkMode
                        ? { backgroundColor: 'rgba(25, 81, 252, 0.15)', borderColor: '#1951fc' }
                        : { backgroundColor: '#EBF3FF', borderColor: '#3781fc' },
                    ]}
                    activeOpacity={0.9}
                    onPress={() => router.push('/paywall')}
                  >
                    <Text style={[styles.paywallUpgradeText, isDarkMode ? { color: '#3781fc' } : { color: '#1951fc' }]}>{t('insights.upgradeToPro')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.paywallLabel, isDarkMode ? { color: '#8E98AD' } : { color: '#52607A' }]}>{t('insights.productivityScore')}</Text>
                </View>
              }
            />
          </View>
        </View>

        {/* Focus Activity Card (Visual Aesthetic & Interactive Pop-Up) */}
        <FocusActivityCard
          isDarkMode={isDarkMode}
          isPro={isPro}
          chartView={chartView}
          weeklyData={chartData}
          monthlyData={monthlyChartData}
          onChartViewChange={(val) => setChartView(val)}
          onRequirePro={() => router.push('/paywall')}
        />

        {/* Active Habits list (Flex layout for side-by-side equal width) */}
        <View style={styles.habitsSection}>
          <Text style={[styles.habitsSectionTitle, isDarkMode ? { color: '#FFFFFF' } : { color: '#0A1530' }]}>{t('insights.activeHabits')}</Text>
          {activeHabits.length === 0 ? (
            <View
              style={[
                styles.emptyHabitsCard,
                isDarkMode
                  ? { backgroundColor: '#111521', borderColor: 'rgba(255, 255, 255, 0.08)' }
                  : { backgroundColor: '#FFFFFF', borderColor: 'rgba(15, 23, 42, 0.07)' },
              ]}
            >
              <Text style={[styles.emptyHabitsText, isDarkMode && { color: '#8E95A9' }]}>No active habits tracked. Add one in Plan!</Text>
            </View>
          ) : (
            <View style={styles.habitsRow}>
              {activeHabits.slice(0, 2).map((habit) => (
                <ActiveHabitCard
                  key={habit.id}
                  id={habit.id}
                  name={habit.name}
                  icon={habit.icon}
                  color={habit.color}
                  totalDaysLabel={t('plan.totalDays', { count: habit.total_days || 0 })}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>
          )}
        </View>

        {/* 6. NEW: Habit Group Leaderboard Preview Card (strictly below Active habits and above Weekly Report) */}
        <HabitGroupLeaderboardSection
          isDark={isDarkMode}
          activeHabits={activeHabits}
          userId={userId}
          onRefreshInsights={() => fetchInsights(false)}
        />

        {/* Distractions: blocked attempts, tempting apps, time of day, unlock reasons */}
        <View onLayout={(e) => (distractionsY.current = e.nativeEvent.layout.y)}>
          <DistractionsSection isDarkMode={isDarkMode} isPro={isPro} />
        </View>

        {/* 7. Persistent Weekly Productivity Report Entry Card */}
        <View
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (
              width > 0 &&
              height > 0 &&
              (Math.abs(width - weeklyReportCardSize.width) > 1 ||
                Math.abs(height - weeklyReportCardSize.height) > 1)
            ) {
              setWeeklyReportCardSize({ width, height });
            }
          }}
            style={[
              styles.weeklyReportEntryCard,
              {
                backgroundColor: isDarkMode ? '#0B060B' : '#9D174D',
                borderColor: isDarkMode
                  ? 'rgba(236, 72, 153, 0.36)'
                  : 'rgba(251, 207, 232, 0.50)',
              },
              !isPro && styles.lockedReportCard,
            ]}
        >
          {/* Base obsidian-charcoal (Dark) / rich berry-pink jewel-tone (Light) surface */}
          <LinearGradient
            colors={
              isDarkMode
                ? ['#0B060B', '#120812', '#190A18']
                : ['#831843', '#9D174D', '#DB2777', '#EC4899']
            }
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Full-bleed bottom-center vibrant-pink radial glow + specular rim highlight */}
          <Svg
            width={weeklyReportCardSize.width}
            height={weeklyReportCardSize.height}
            viewBox={`0 0 ${weeklyReportCardSize.width} ${weeklyReportCardSize.height}`}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Defs>
              {isDarkMode ? (
                <SvgRadialGradient id="weeklyPinkGlow" cx="50%" cy="102%" rx="72%" ry="55%">
                  <Stop offset="0%" stopColor="#EC4899" stopOpacity="0.58" />
                  <Stop offset="35%" stopColor="#DB2777" stopOpacity="0.35" />
                  <Stop offset="68%" stopColor="#9D174D" stopOpacity="0.14" />
                  <Stop offset="100%" stopColor="#0B060B" stopOpacity="0" />
                </SvgRadialGradient>
              ) : (
                <SvgRadialGradient id="weeklyPinkGlow" cx="50%" cy="102%" rx="72%" ry="55%">
                  <Stop offset="0%" stopColor="#FBCFE8" stopOpacity="0.52" />
                  <Stop offset="38%" stopColor="#F9A8D4" stopOpacity="0.28" />
                  <Stop offset="75%" stopColor="#EC4899" stopOpacity="0" />
                </SvgRadialGradient>
              )}

              <SvgLinearGradient id="weeklyBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop
                  offset="0%"
                  stopColor={isDarkMode ? '#9D174D' : '#F9A8D4'}
                  stopOpacity={0}
                />
                <Stop
                  offset="25%"
                  stopColor={isDarkMode ? '#EC4899' : '#FBCFE8'}
                  stopOpacity={isDarkMode ? 0.48 : 0.55}
                />
                <Stop
                  offset="50%"
                  stopColor={isDarkMode ? '#FBCFE8' : '#FDF2F8'}
                  stopOpacity={isDarkMode ? 0.9 : 0.92}
                />
                <Stop
                  offset="75%"
                  stopColor={isDarkMode ? '#EC4899' : '#FBCFE8'}
                  stopOpacity={isDarkMode ? 0.48 : 0.55}
                />
                <Stop
                  offset="100%"
                  stopColor={isDarkMode ? '#9D174D' : '#F9A8D4'}
                  stopOpacity={0}
                />
              </SvgLinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={weeklyReportCardSize.width}
              height={weeklyReportCardSize.height}
              fill="url(#weeklyPinkGlow)"
            />
            <Rect
              x={0}
              y={weeklyReportCardSize.height - 3}
              width={weeklyReportCardSize.width}
              height={3}
              fill="url(#weeklyBottomRim)"
            />
          </Svg>

          {!isPro ? (
            <>
              <View style={styles.weeklyReportEntryHeader}>
                <Ionicons name="lock-closed" size={20} color={isDarkMode ? '#F472B6' : '#FFFFFF'} />
                <Text style={[styles.weeklyReportEntryTitle, { color: '#FFFFFF' }]}>
                  {t('insights.report')}
                </Text>
              </View>
              <Text style={[styles.weeklyReportEntrySubtitle, { color: isDarkMode ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.88)' }]}>
                Unlock weekly performance analysis, habit consistency grading, and AI-powered Catalyst insights.
              </Text>
              <TactilePressable
                style={[
                  styles.weeklyReportEntryBtn,
                  !isDarkMode && {
                    backgroundColor: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                ]}
                onPress={() => router.push('/paywall')}
              >
                {isDarkMode && (
                  <LinearGradient
                    colors={['#F43F85', '#DB2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text
                  style={[
                    styles.weeklyReportEntryBtnText,
                    !isDarkMode && { color: '#BE185D' },
                  ]}
                >
                  Unlock Catalyst Report
                </Text>
              </TactilePressable>
            </>
          ) : (
            <>
              <View style={styles.weeklyReportEntryHeader}>
                <Text style={[styles.weeklyReportEntryTitle, { color: '#FFFFFF' }]}>
                  {t('insights.report')}
                </Text>
              </View>
              <Text style={[styles.weeklyReportEntrySubtitle, { color: isDarkMode ? 'rgba(255, 255, 255, 0.78)' : 'rgba(255, 255, 255, 0.88)' }]}>
                Review your performance, check your habit consistency, and get AI-powered Catalyst insights.
              </Text>
              <TactilePressable
                style={[
                  styles.weeklyReportEntryBtn,
                  !isDarkMode && {
                    backgroundColor: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                ]}
                onPress={() => setReportSheetOpen(true)}
              >
                {isDarkMode && (
                  <LinearGradient
                    colors={['#F43F85', '#DB2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text
                  style={[
                    styles.weeklyReportEntryBtnText,
                    !isDarkMode && { color: '#BE185D' },
                  ]}
                >
                  Read
                </Text>
              </TactilePressable>
            </>
          )}
        </View>

        {/* Starting report: always last, below the weekly report */}
        <StartingReportCard isDark={isDarkMode} />
      </ScrollView>

      {/* Level Up Achievement Modal */}
      <LevelUpModal
        visible={showLevelUpModal}
        level={newLevelAchieved || LEVEL_BENCHMARKS[0]}
        userId={currentUserId || undefined}
        isDarkMode={isDarkMode}
        onClose={() => setShowLevelUpModal(false)}
        onViewAllBadges={() => router.push('/badges' as any)}
      />

      {/* Conditionally rendered Gorhom Bottom Sheet Weekly Productivity Report */}
      {reportSheetOpen && (
        <WeeklyReportSheet
          isOpen={reportSheetOpen}
          onClose={() => setReportSheetOpen(false)}
          isDarkMode={isDarkMode}
          weeklyFocusMinutes={totalWeeklyMinutes}
          tasksCompleted={tasksCompleted}
          tasksTotal={tasksTotal}
          habitsCompleted={habitsCompleted}
          habitsTotal={habitsTotal}
          isPro={isPro}
          userId={userId}
        />
      )}
    </AtmosphericScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  scrollContainer: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  levelBanner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  levelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelNumText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
  },
  levelRemainingText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.82)',
  },
  levelMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  bannerLevelName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bannerProgressBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  bannerProgressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#03195b',
  },
  timelineScroll: {
    maxHeight: 280,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 65,
  },
  timelineIndicatorColumn: {
    width: 24,
    alignItems: 'center',
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineCircleCompleted: {
    backgroundColor: '#10b981',
  },
  timelineCircleCurrent: {
    backgroundColor: '#1951fc',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  timelineCircleLocked: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
  },
  timelineCurrentNum: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  timelineInfoColumn: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 14,
  },
  timelineLvlName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  timelineLvlNameCurrent: {
    color: '#1951fc',
  },
  timelineLvlNameLocked: {
    color: '#94a3b8',
  },
  timelineHoursText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  currentLvlInfoBox: {
    marginTop: 6,
    backgroundColor: '#EBF3FF',
    borderRadius: 10,
    padding: 10,
    width: '90%',
  },
  timelineProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(25, 81, 252, 0.15)',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
  timelineProgressBarFill: {
    height: '100%',
    backgroundColor: '#1951fc',
    borderRadius: 99,
  },
  timelineRemainingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0b2cb1',
  },
  gridContainer: {
    gap: 16,
    marginBottom: 16,
  },
  wideBlueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(15, 23, 42, 0.07)',
    borderWidth: 1,
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wideCardText: {
    flex: 1,
    gap: 4,
  },
  wideCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1530',
  },
  wideCardSubtitle: {
    fontSize: 11,
    color: '#52607A',
  },
  wideCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#52607A',
    marginTop: 6,
  },
  orangeHighlight: {
    color: '#1951fc',
    fontSize: 24,
    fontWeight: '900',
  },
  wideCardPercentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideCardPercent: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1951fc',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  squareWhiteCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.07)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  squareCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusIconBg: {
    width: 28,
    height: 28,
    backgroundColor: '#EBF3FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonBadge: {
    backgroundColor: '#fee2e2',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  comparisonText: {
    fontSize: 10,
    color: '#ef4444',
    fontWeight: '700',
  },
  squareCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A1530',
    marginTop: 12,
  },
  squareCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52607A',
    marginTop: 2,
  },
  paywallOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  paywallUpgradeBtn: {
    backgroundColor: '#EBF3FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderColor: '#3781fc',
    borderWidth: 1,
  },
  paywallUpgradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1951fc',
  },
  paywallLabel: {
    fontSize: 10,
    color: '#8E98AD',
    fontWeight: '600',
  },
  scoreContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.07)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A1530',
  },
  chartTogglerContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
  },
  toggleBtnActive: {
    backgroundColor: '#1951fc',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  toggleBtnTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  toggleBtnLocked: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleBtnTextLocked: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E98AD',
  },
  barChartContainer: {
    height: 140,
    paddingTop: 10,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barOutline: {
    width: 24,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFocusSegment: {
    width: '100%',
    backgroundColor: '#1951fc',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  barBreakSegment: {
    width: '100%',
    backgroundColor: '#38BDF8',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartDayLabel: {
    fontSize: 11,
    color: '#52607A',
    fontWeight: '600',
    marginTop: 8,
  },
  chartLegends: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#52607A',
    fontWeight: '600',
  },
  habitsSection: {
    marginBottom: 16,
  },
  habitsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A1530',
    marginTop: 4,
    marginBottom: 12,
  },
  emptyHabitsCard: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.07)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyHabitsText: {
    fontSize: 13,
    color: '#8E98AD',
    textAlign: 'center',
  },
  habitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  habitCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: 'rgba(15, 23, 42, 0.07)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  habitEmojiContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitEmojiText: {
    fontSize: 20,
  },
  habitCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A1530',
    textAlign: 'center',
  },
  habitCardStreak: {
    fontSize: 11,
    color: '#52607A',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1951fc',
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalDiamond: {
    width: 110,
    height: 110,
    backgroundColor: '#1951fc',
    transform: [{ rotate: '45deg' }],
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  modalDiamondInner: {
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  modalDiamondLevelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  modalLevelName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A1530',
    marginTop: 10,
  },
  modalDescText: {
    fontSize: 13,
    color: '#52607A',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: '#1951fc',
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  weeklyReportEntryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0A1530',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  weeklyReportEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  weeklyReportEntryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A1530',
  },
  weeklyReportEntrySubtitle: {
    fontSize: 13,
    color: '#52607A',
    lineHeight: 18,
  },
  weeklyReportEntryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251, 207, 232, 0.45)',
  },
  weeklyReportEntryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  lockedReportCard: {
    backgroundColor: '#f1f5f9',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    opacity: 0.85,
  },
});
