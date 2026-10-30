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
import { queryCache } from '../../src/utils/queryCache';
import WeeklyReportSheet from '../../components/WeeklyReportSheet';
import HabitGroupLeaderboardSection from '../../components/insights/HabitGroupLeaderboardSection';
import { StartingReportCard } from '../../src/onboarding/StartingReportCard';
import DistractionsSection from '../../components/insights/DistractionsSection';
import { HABIT_GROUP_UPDATED_EVENT } from '../../src/services/habitGroupService';
import { ScreenSkeleton, ErrorRetryBanner } from '../../components/ui/ScreenSkeleton';

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
      fetchInsights(false);
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
          const sixDaysAgo = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate() - 6);
          const sevenDaysAgoStr = formatLocalYMD(sixDaysAgo);
          const earliestBoundStr = startOfMonthStr < sevenDaysAgoStr ? startOfMonthStr : sevenDaysAgoStr;

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
              .eq('user_id', uid),
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

          // ─── Weekly 7-Day Chart Generation (Strict Local Date Matching) ───
          const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const tempWeeklyChart: any[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate() - i);
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
              label: weekdays[d.getDay()],
              focusMinutes,
              breakMinutes,
            });
          }

          // ─── Monthly Chart Generation (Strict W1..W4 Buckets) ───
          // Filter strictly to current YYYY-MM prefix and <= todayStr
          const currentMonthPrefix = `${todayYear}-${todayMonth}`;
          const currentMonthRows = focusRows.filter((row: any) => {
            const rowDateStr = String(row.date).slice(0, 10);
            return rowDateStr.startsWith(currentMonthPrefix) && rowDateStr <= todayStr;
          });

          const monthlyBuckets = [
            { label: 'W1', focusMinutes: 0, breakMinutes: 0 },
            { label: 'W2', focusMinutes: 0, breakMinutes: 0 },
            { label: 'W3', focusMinutes: 0, breakMinutes: 0 },
            { label: 'W4', focusMinutes: 0, breakMinutes: 0 },
          ];

          currentMonthRows.forEach((row: any) => {
            const rowDateStr = String(row.date).slice(0, 10);
            const dayNum = parseInt(rowDateStr.split('-')[2], 10);
            const fMins = Number(row.focus_time_minutes) || 0;
            const bMins = Number(row.break_time_minutes) || 0;

            if (dayNum >= 1 && dayNum <= 7) {
              monthlyBuckets[0].focusMinutes += fMins;
              monthlyBuckets[0].breakMinutes += bMins;
            } else if (dayNum >= 8 && dayNum <= 14) {
              monthlyBuckets[1].focusMinutes += fMins;
              monthlyBuckets[1].breakMinutes += bMins;
            } else if (dayNum >= 15 && dayNum <= 21) {
              monthlyBuckets[2].focusMinutes += fMins;
              monthlyBuckets[2].breakMinutes += bMins;
            } else if (dayNum >= 22) {
              monthlyBuckets[3].focusMinutes += fMins;
              monthlyBuckets[3].breakMinutes += bMins;
            }
          });

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
            monthlyChart: monthlyBuckets,
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

      // Check for Level Up trigger
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
      <View style={[styles.container, isDarkMode && { backgroundColor: '#0B1021' }]}>
        <View style={{ padding: 16 }}>
          <ScreenSkeleton isDark={isDarkMode} showChart={true} rows={3} />
        </View>
      </View>
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

  // Current dynamic chart view data
  const currentChartData = chartView === 'weekly' ? chartData : monthlyChartData;

  return (
    <View
      style={[styles.container, { backgroundColor: isDarkMode ? '#0B1021' : '#f8fafc' }]}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 120, // Ample clearance above bottom tab bar and floating menu
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* Gamification Level Banner */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => setTimelineExpanded(!timelineExpanded)}
        >
          <LinearGradient
            colors={['#f59e0b', '#ff6b2b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.levelBanner}
          >
            <View style={styles.bannerRow}>
              {/* Badge Icon */}
              <View style={styles.bannerBadgeContainer}>
                <Ionicons name="star" size={24} color="#ffffff" />
                <Text style={styles.bannerBadgeLevel}>Level {currentLevel}</Text>
              </View>

              {/* Text Info */}
              <View style={styles.bannerTextInfo}>
                <Text style={styles.bannerLevelName}>{currentTitle}</Text>
                <View style={styles.bannerProgressBg}>
                  <View style={[styles.bannerProgressBar, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.bannerSubtext}>
                  {totalXP} XP / {nextBenchmark.xp} XP base
                </Text>
                <Text style={styles.bannerSubtext}>
                  {Math.max(0, xpRemaining)} XP remaining to Level {nextBenchmark.level}
                </Text>
              </View>

              <Ionicons
                name={timelineExpanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color="#ffffff"
                style={styles.bannerArrow}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Expandable Level Timeline Accordion */}
        {timelineExpanded && (
          <View style={[styles.timelineCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
            <Text style={[styles.timelineTitle, isDarkMode && { color: '#FFFFFF' }]}>Level Timeline</Text>
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
                          isCompleted && styles.timelineCircleCompleted,
                          isCurrent && styles.timelineCircleCurrent,
                          isCurrent && isDarkMode && { borderColor: '#151B2E', shadowColor: '#FF6B00' },
                          isLocked && styles.timelineCircleLocked,
                          isLocked && isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' },
                        ]}
                      >
                        {isCompleted && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                        {isCurrent && (
                          <Text style={styles.timelineCurrentNum}>{benchmark.level}</Text>
                        )}
                        {isLocked && <Ionicons name="lock-closed" size={12} color={isDarkMode ? '#8E95A9' : '#94a3b8'} />}
                      </View>
                      {benchmark.level < 15 && <View style={[styles.timelineLine, isDarkMode && { backgroundColor: '#222A41' }]} />}
                    </View>

                    {/* Timeline Level Detail Info */}
                    <View style={styles.timelineInfoColumn}>
                      <Text
                        style={[
                          styles.timelineLvlName,
                          isDarkMode && { color: '#FFFFFF' },
                          isCurrent && styles.timelineLvlNameCurrent,
                          isCurrent && { color: '#FF6B00' },
                          isLocked && styles.timelineLvlNameLocked,
                          isLocked && isDarkMode && { color: '#8E95A9' },
                        ]}
                      >
                        Level {benchmark.level} — {benchmark.title}
                      </Text>
                      
                      {isCurrent ? (
                        <View style={[styles.currentLvlInfoBox, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#FF6B00', borderWidth: 1 }]}>
                          <Text style={[styles.timelineHoursText, isDarkMode && { color: '#8E95A9' }]}>
                            {totalXP} XP / {nextBenchmark.xp} XP base
                          </Text>
                          <View style={[styles.timelineProgressBarBg, isDarkMode && { backgroundColor: 'rgba(255,107,0,0.2)' }]}>
                            <View
                              style={[
                                styles.timelineProgressBarFill,
                                isDarkMode && { backgroundColor: '#FF6B00' },
                                { width: `${progressPercent}%` },
                              ]}
                            />
                          </View>
                          <Text style={[styles.timelineRemainingText, isDarkMode && { color: '#FF6B00' }]}>
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
          {/* Tasks Completed (Wide Blue Card) */}
          <View style={[styles.wideBlueCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
            <View style={styles.wideCardText}>
              <Text style={[styles.wideCardTitle, isDarkMode && { color: '#FFFFFF' }]}>{t('insights.tasksCompleted')}</Text>
              <Text style={[styles.wideCardSubtitle, isDarkMode && { color: '#8E95A9' }]}>
                {tasksCompleted === tasksTotal && tasksTotal > 0
                  ? 'Incredible! You completed all tasks.'
                  : t('insights.tasksSub')}
              </Text>
              <Text style={[styles.wideCardValue, isDarkMode && { color: '#8E95A9' }]}>
                <Text style={styles.orangeHighlight}>{tasksCompleted}</Text> / {tasksTotal} tasks
              </Text>
            </View>
            <View style={styles.wideCardPercentContainer}>
              <Text style={[styles.wideCardPercent, isDarkMode && { color: '#FFFFFF' }]}>
                {tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0}%
              </Text>
            </View>
          </View>

          {/* Square Cards Grid Row */}
          <View style={styles.gridRow}>
            {/* Total Focus Time Card */}
            <View style={[styles.squareWhiteCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
              <View style={styles.squareCardHeader}>
                <View style={[styles.focusIconBg, isDarkMode && { backgroundColor: '#222A41' }]}>
                  <Ionicons name="stopwatch" size={16} color="#ff6b2b" />
                </View>
                <View style={styles.comparisonBadge}>
                  <Text style={styles.comparisonText}>-9%</Text>
                </View>
              </View>
              <Text style={[styles.squareCardValue, isDarkMode && { color: '#FFFFFF' }]}>
                {(() => {
                  const totalMinutes = Math.round(totalFocusHours * 60);
                  return Math.floor(totalMinutes / 60) + 'h ' + (totalMinutes % 60) + 'm';
                })()}
              </Text>
              <Text style={[styles.squareCardLabel, isDarkMode && { color: '#8E95A9' }]}>{t('insights.totalFocus')}</Text>
            </View>

            {/* Productivity Score (Subscription Gated Card) */}
            <View style={[styles.squareWhiteCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
              {!isPro ? (
                // Locked Paywall Overlay
                <View style={[styles.paywallOverlay, isDarkMode && { backgroundColor: '#151B2E' }]}>
                  <Ionicons name="lock-closed" size={24} color={isDarkMode ? '#8E95A9' : '#4a6c8c'} />
                  <TouchableOpacity
                    style={[styles.paywallUpgradeBtn, isDarkMode && { backgroundColor: '#222A41', borderColor: '#222A41' }]}
                    activeOpacity={0.9}
                    onPress={() => router.push('/paywall')}
                  >
                    <Text style={[styles.paywallUpgradeText, isDarkMode && { color: '#FFFFFF' }]}>{t('insights.upgradeToPro')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.paywallLabel, isDarkMode && { color: '#8E95A9' }]}>{t('insights.productivityScore')}</Text>
                </View>
              ) : (
                // Pro Content unlocked
                <View style={styles.scoreContent}>
                  <View style={styles.squareCardHeader}>
                    <View style={[styles.focusIconBg, { backgroundColor: isDarkMode ? '#222A41' : '#e6ebf4' }]}>
                      <Ionicons name="pulse" size={16} color={isDarkMode ? '#FFFFFF' : '#4a6c8c'} />
                    </View>
                  </View>
                  <Text style={[styles.squareCardValue, isDarkMode && { color: '#FFFFFF' }]}>{displayScore}%</Text>
                  <Text style={[styles.squareCardLabel, isDarkMode && { color: '#8E95A9' }]}>{t('insights.productivityScore')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 7-Day Focus Activity Custom Stacked Bar Chart */}
        <View style={[styles.chartCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, isDarkMode && { color: '#FFFFFF' }]}>{t('insights.activity')}</Text>
            {/* Chart toggle buttons (serving as manual bottom sheet trigger) */}
            <View style={[styles.chartTogglerContainer, isDarkMode && { backgroundColor: '#0B1021' }]}>
              <TouchableOpacity
                style={chartView === 'weekly' ? styles.toggleBtnActive : styles.toggleBtnLocked}
                activeOpacity={0.8}
                onPress={() => setChartView('weekly')}
              >
                <Text style={chartView === 'weekly' ? styles.toggleBtnTextActive : [styles.toggleBtnTextLocked, isDarkMode && { color: '#8E95A9' }]}>{t('insights.weekly')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={chartView === 'monthly' ? styles.toggleBtnActive : styles.toggleBtnLocked}
                activeOpacity={0.8}
                onPress={() => {
                  if (isPro) {
                    setChartView('monthly');
                  } else {
                    router.push('/paywall');
                  }
                }}
              >
                <Text style={chartView === 'monthly' ? styles.toggleBtnTextActive : [styles.toggleBtnTextLocked, isDarkMode && { color: '#8E95A9' }]}>{t('insights.monthly')}</Text>
                {!isPro && (
                  <Ionicons name="lock-closed" size={10} color={isDarkMode ? '#8E95A9' : '#94a3b8'} style={{ marginLeft: 3 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stacking Flexbox Bar Chart */}
          <View style={styles.barChartContainer}>
            <View style={styles.barsRow}>
              {currentChartData.map((item, idx) => {
                const maxScale = chartView === 'weekly' ? 100 : 300; // Normalized max limit representing maximum bar height
                const focusHeight = Math.min(90, (item.focusMinutes / maxScale) * 100);
                const breakHeight = Math.min(20, (item.breakMinutes / maxScale) * 100);
                const hasActivity = focusHeight > 0 || breakHeight > 0;

                return (
                  <View key={`chart-col-${idx}`} style={styles.chartColumn}>
                    <View style={[styles.barOutline, isDarkMode && { backgroundColor: '#0B1021' }]}>
                      {hasActivity ? (
                        <>
                          {/* Stacking orange break tip directly above blue focus */}
                          {breakHeight > 0 && (
                            <View style={[styles.barBreakSegment, { height: `${breakHeight}%` }]} />
                          )}
                          {focusHeight > 0 && (
                            <View style={[styles.barFocusSegment, { height: `${focusHeight}%` }]} />
                          )}
                        </>
                      ) : null}
                    </View>
                    <Text style={[styles.chartDayLabel, isDarkMode && { color: '#8E95A9' }]}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Chart Legends */}
          <View style={styles.chartLegends}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4a6c8c' }]} />
              <Text style={[styles.legendText, isDarkMode && { color: '#8E95A9' }]}>{t('nav.focus')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ff6b2b' }]} />
              <Text style={[styles.legendText, isDarkMode && { color: '#8E95A9' }]}>{t('focus.break')}</Text>
            </View>
          </View>
        </View>

        {/* Active Habits list (Flex layout for side-by-side equal width) */}
        <View style={styles.habitsSection}>
          <Text style={[styles.habitsSectionTitle, isDarkMode && { color: '#4a6c8c' }]}>{t('insights.activeHabits')}</Text>
          {activeHabits.length === 0 ? (
            <View style={[styles.emptyHabitsCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
              <Text style={[styles.emptyHabitsText, isDarkMode && { color: '#8E95A9' }]}>No active habits tracked. Add one in Plan!</Text>
            </View>
          ) : (
            <View style={styles.habitsRow}>
              {activeHabits.slice(0, 2).map((habit) => (
                <View key={habit.id} style={[styles.habitCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
                  <View style={[styles.habitEmojiContainer, isDarkMode && { backgroundColor: '#0B1021' }]}>
                    <Text style={styles.habitEmojiText}>{habit.icon || '🔥'}</Text>
                  </View>
                  <Text style={[styles.habitCardName, isDarkMode && { color: '#FFFFFF' }]} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <Text style={[styles.habitCardStreak, isDarkMode && { color: '#8E95A9' }]}>
                    {t('plan.totalDays', { count: habit.total_days || 0 })}
                  </Text>
                </View>
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
        {!isPro ? (
          <View style={[styles.weeklyReportEntryCard, styles.lockedReportCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41', opacity: 0.85 }]}>
            <View style={styles.weeklyReportEntryHeader}>
              <Ionicons name="lock-closed" size={20} color={isDarkMode ? '#8E95A9' : '#64748b'} />
              <Text style={[styles.weeklyReportEntryTitle, { color: isDarkMode ? '#FFFFFF' : '#64748b' }]}>{t('insights.report')}</Text>
            </View>
            <Text style={[styles.weeklyReportEntrySubtitle, { color: isDarkMode ? '#8E95A9' : '#94a3b8' }]}>
              Unlock weekly performance analysis, habit consistency grading, and AI-powered Catalyst insights.
            </Text>
            <TouchableOpacity
              style={[styles.weeklyReportEntryBtn, { backgroundColor: '#4a6c8c' }]}
              activeOpacity={0.8}
              onPress={() => router.push('/paywall')}
            >
              <Text style={styles.weeklyReportEntryBtnText}>Unlock Catalyst Report</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.weeklyReportEntryCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
            <View style={styles.weeklyReportEntryHeader}>
              <Ionicons name="calendar-outline" size={20} color={isDarkMode ? '#FF6B00' : '#4a6c8c'} />
              <Text style={[styles.weeklyReportEntryTitle, isDarkMode && { color: '#FFFFFF' }]}>{t('insights.report')}</Text>
            </View>
            <Text style={[styles.weeklyReportEntrySubtitle, isDarkMode && { color: '#8E95A9' }]}>
              Review your performance, check your habit consistency, and get AI-powered Catalyst insights.
            </Text>
            <TouchableOpacity
              style={styles.weeklyReportEntryBtn}
              activeOpacity={0.8}
              onPress={() => setReportSheetOpen(true)}
            >
              <Text style={styles.weeklyReportEntryBtnText}>Read</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Starting report: always last, below the weekly report */}
        <StartingReportCard isDark={isDarkMode} />
      </ScrollView>

      {/* Level Up Achievement Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showLevelUpModal}
        onRequestClose={() => setShowLevelUpModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, isDarkMode && { backgroundColor: 'rgba(11,16,33,0.75)' }]}
          onPress={() => setShowLevelUpModal(false)}
        >
          <View style={[styles.modalContentCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41', borderWidth: 1 } as any]}>
            <Text style={[styles.modalHeading, isDarkMode && { color: '#FF6B00' } as any]}>LEVELED UP!</Text>
            
            {/* Diamond container */}
            <View style={[styles.modalDiamond, { backgroundColor: isDarkMode ? '#FF6B00' : '#4a6c8c' } as any]}>
              <View style={styles.modalDiamondInner as any}>
                <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>
                  Lv. {newLevelAchieved?.level}
                </Text>
              </View>
            </View>

            <Text style={[styles.modalLevelName, isDarkMode && { color: '#FFFFFF' } as any]}>{newLevelAchieved?.title}</Text>
            <Text style={[styles.modalDescText, isDarkMode && { color: '#8E95A9' } as any]}>
              You are now a {newLevelAchieved?.title} member. Keep the momentum going to reach the next tier!
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, isDarkMode && { backgroundColor: '#FF6B00' } as any]}
              activeOpacity={0.9}
              onPress={() => setShowLevelUpModal(false)}
            >
              <Text style={styles.modalButtonText as any}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#ff6b2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerBadgeContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bannerBadgeLevel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textAlign: 'center',
  },
  bannerTextInfo: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  bannerLevelName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  bannerProgressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 99,
    overflow: 'hidden',
    width: '90%',
  },
  bannerProgressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 99,
  },
  bannerSubtext: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerArrow: {
    marginLeft: 8,
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4a6c8c',
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
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
    color: '#f59e0b',
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
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
    width: '90%',
  },
  timelineProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(245,158,11,0.22)',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
  timelineProgressBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 99,
  },
  timelineRemainingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#b45309',
  },
  gridContainer: {
    gap: 16,
    marginBottom: 16,
  },
  wideBlueCard: {
    backgroundColor: '#e6ebf4',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  wideCardText: {
    flex: 1,
    gap: 4,
  },
  wideCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a6c8c',
  },
  wideCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  wideCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 6,
  },
  orangeHighlight: {
    color: '#ff6b2b',
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
    color: '#4a6c8c',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  squareWhiteCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  squareCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusIconBg: {
    width: 28,
    height: 28,
    backgroundColor: '#fff7ed',
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
    color: '#0f172a',
    marginTop: 12,
  },
  squareCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
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
    backgroundColor: '#e6ebf4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderColor: '#cbd5e1',
    borderWidth: 1,
  },
  paywallUpgradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4a6c8c',
  },
  paywallLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  scoreContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4a6c8c',
  },
  chartTogglerContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
  },
  toggleBtnActive: {
    backgroundColor: '#4a6c8c',
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
    color: '#94a3b8',
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
    backgroundColor: '#4a6c8c',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  barBreakSegment: {
    width: '100%',
    backgroundColor: '#ff6b2b',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartDayLabel: {
    fontSize: 11,
    color: '#64748b',
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
    color: '#64748b',
    fontWeight: '600',
  },
  habitsSection: {
    marginBottom: 16,
  },
  habitsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4a6c8c',
    marginTop: 4,
    marginBottom: 12,
  },
  emptyHabitsCard: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHabitsText: {
    fontSize: 13,
    color: '#94a3b8',
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
    borderColor: '#e2e8f0',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  habitEmojiContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#fff7ed',
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
    color: '#334155',
    textAlign: 'center',
  },
  habitCardStreak: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4a6c8c',
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalDiamond: {
    width: 110,
    height: 110,
    backgroundColor: '#4a6c8c',
    transform: [{ rotate: '45deg' }],
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
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
    color: '#0f172a',
    marginTop: 10,
  },
  modalDescText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: '#4a6c8c',
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
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
    color: '#0f172a',
  },
  weeklyReportEntrySubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  weeklyReportEntryBtn: {
    backgroundColor: '#4a6c8c',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  weeklyReportEntryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  lockedReportCard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    opacity: 0.85,
  },
});
