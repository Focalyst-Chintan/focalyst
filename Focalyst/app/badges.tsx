import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../src/utils/supabase';
import { useUser } from '../src/utils/UserContext';
import { getLevelFromXP } from '../src/utils/xpService';
import {
  LEVEL_BADGES,
  STREAK_BADGES,
  loadAllUserBadges,
  type UnlockedBadgeMap,
} from '../src/utils/badgeMilestones';
import { HexLevelBadge } from '../components/badges/HexLevelBadge';
import { StreakScallopBadge } from '../components/badges/StreakScallopBadge';

export default function BadgesScreen() {
  const router = useRouter();
  const { user, profile } = useUser();
  const uid = user?.id || profile?.id || undefined;

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxStreak, setMaxStreak] = useState(0);
  const [unlockedMap, setUnlockedMap] = useState<UnlockedBadgeMap>({});

  const [showAllLevels, setShowAllLevels] = useState(false);
  const [showAllStreaks, setShowAllStreaks] = useState(false);

  const loadBadges = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem('darkMode');
      if (val !== null) {
        setIsDarkMode(val === 'true');
      } else {
        setIsDarkMode(true);
      }

      let xp = 0;
      let lvl = 1;
      let bestHabitStreak = 0;

      if (uid) {
        const [{ data: userRow }, { data: habitRows }] = await Promise.all([
          supabase
            .from('users')
            .select('total_xp, current_level')
            .eq('id', uid)
            .maybeSingle(),
          supabase
            .from('habits')
            .select('current_streak, longest_streak')
            .eq('user_id', uid),
        ]);

        xp = Number((userRow as any)?.total_xp || 0);
        const derived = getLevelFromXP(xp).level;
        lvl = Math.max(derived, Number((userRow as any)?.current_level || 1));

        if (Array.isArray(habitRows)) {
          for (const row of habitRows as any[]) {
            bestHabitStreak = Math.max(
              bestHabitStreak,
              Number(row.longest_streak || 0),
              Number(row.current_streak || 0)
            );
          }
        }
      }

      const merged = await loadAllUserBadges(uid, lvl, bestHabitStreak);
      setTotalXP(xp);
      setCurrentLevel(lvl);
      setMaxStreak(bestHabitStreak);
      setUnlockedMap(merged);
    } catch (e) {
      console.warn('Failed to load badges:', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // Listen to app-wide theme toggle events (same source as Insights/Plan tabs)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setIsDarkMode(newVal);
    });
    return () => sub.remove();
  }, []);

  // Re-fetch unlocked badge state every time the user navigates to Badges
  useFocusEffect(
    useCallback(() => {
      void loadBadges();
    }, [loadBadges])
  );

  const effectiveLevel = useMemo(
    () => Math.max(currentLevel, getLevelFromXP(totalXP).level),
    [currentLevel, totalXP]
  );

  const unlockedLevelsCount = useMemo(
    () =>
      LEVEL_BADGES.filter(
        (b) => Boolean(unlockedMap[b.badgeKey]) || b.level <= effectiveLevel
      ).length,
    [unlockedMap, effectiveLevel]
  );

  const unlockedStreaksCount = useMemo(
    () =>
      STREAK_BADGES.filter(
        (b) => Boolean(unlockedMap[b.badgeKey]) || b.days <= maxStreak
      ).length,
    [unlockedMap, maxStreak]
  );

  const totalUnlockedCount = unlockedLevelsCount + unlockedStreaksCount;

  const visibleLevels = showAllLevels ? LEVEL_BADGES : LEVEL_BADGES.slice(0, 5);
  const visibleStreaks = showAllStreaks ? STREAK_BADGES : STREAK_BADGES.slice(0, 5);

  const bg = isDarkMode ? '#05070F' : '#F4F7FA';
  const surface = isDarkMode ? '#0B1020' : '#FFFFFF';
  const surface2 = isDarkMode ? '#111830' : '#F8FAFC';
  const borderCol = isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const ink = isDarkMode ? '#F2F5FF' : '#0F172A';
  const ink2 = isDarkMode ? '#A3ADC8' : '#64748B';
  const ink3 = isDarkMode ? '#6B7591' : '#64748B';
  const seeAllBg = isDarkMode ? '#18213D' : '#E2E8F0';
  const seeAllTextCol = isDarkMode ? '#F2F5FF' : '#1E293B';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: surface, borderColor: borderCol }]}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={20} color={ink} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: ink }]}>Badges</Text>
            <Text style={[styles.headerSub, { color: ink2 }]}>
              XP levels & habit streaks
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.pillBtn, { backgroundColor: surface, borderColor: borderCol }]}>
            <Ionicons name="ribbon" size={14} color="#FF6B00" />
            <Text style={[styles.pillText, { color: ink }]}>
              {totalUnlockedCount} Badges
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#1951FC" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Levels Unlocked */}
          <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: borderCol }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: ink2 }]}>LEVELS UNLOCKED</Text>
              <View style={styles.sectionHeaderRight}>
                {showAllLevels && (
                  <TouchableOpacity
                    onPress={() => setShowAllLevels(false)}
                    style={[styles.showLessBtn, { backgroundColor: seeAllBg }]}
                  >
                    <Text style={[styles.showLessText, { color: ink2 }]}>Show Less</Text>
                  </TouchableOpacity>
                )}
                <View style={[styles.counterPill, { backgroundColor: surface2 }]}>
                  <Text style={[styles.counterText, { color: ink }]}>
                    {unlockedLevelsCount}/{LEVEL_BADGES.length}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.grid}>
              {visibleLevels.map((badge) => {
                const isUnlocked =
                  Boolean(unlockedMap[badge.badgeKey]) || badge.level <= effectiveLevel;

                return (
                  <View
                    key={badge.badgeKey}
                    style={[
                      styles.gridItem,
                      {
                        backgroundColor: surface2,
                        borderColor: borderCol,
                        opacity: isUnlocked ? 1 : 0.72,
                      },
                    ]}
                  >
                    <HexLevelBadge
                      level={badge.level}
                      locked={!isUnlocked}
                      size="md"
                      isDarkMode={isDarkMode}
                    />
                    <Text style={[styles.itemTitle, { color: ink }]} numberOfLines={2}>
                      Level {badge.level} · {badge.title}
                    </Text>
                    <Text style={[styles.itemSub, { color: ink3 }]}>
                      {badge.xp.toLocaleString()} XP
                    </Text>
                  </View>
                );
              })}

              {/* 6th Grid Slot: SEE ALL Pill Button */}
              {!showAllLevels && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowAllLevels(true)}
                  style={[
                    styles.gridItem,
                    styles.seeAllSlot,
                    {
                      backgroundColor: surface2,
                      borderColor: borderCol,
                    },
                  ]}
                >
                  <View style={[styles.seeAllPill, { backgroundColor: seeAllBg }]}>
                    <Text style={[styles.seeAllText, { color: seeAllTextCol }]}>SEE ALL</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Section 2: Habit Streaks */}
          <View style={[styles.sectionCard, { backgroundColor: surface, borderColor: borderCol }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: ink2 }]}>HABIT STREAKS</Text>
              <View style={styles.sectionHeaderRight}>
                {showAllStreaks && (
                  <TouchableOpacity
                    onPress={() => setShowAllStreaks(false)}
                    style={[styles.showLessBtn, { backgroundColor: seeAllBg }]}
                  >
                    <Text style={[styles.showLessText, { color: ink2 }]}>Show Less</Text>
                  </TouchableOpacity>
                )}
                <View style={[styles.counterPill, { backgroundColor: surface2 }]}>
                  <Text style={[styles.counterText, { color: ink }]}>
                    {unlockedStreaksCount}/{STREAK_BADGES.length}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.grid}>
              {visibleStreaks.map((badge) => {
                const isUnlocked =
                  Boolean(unlockedMap[badge.badgeKey]) || badge.days <= maxStreak;

                return (
                  <View
                    key={badge.badgeKey}
                    style={[
                      styles.gridItem,
                      {
                        backgroundColor: surface2,
                        borderColor: borderCol,
                        opacity: isUnlocked ? 1 : 0.72,
                      },
                    ]}
                  >
                    <StreakScallopBadge
                      days={badge.days}
                      locked={!isUnlocked}
                      size="md"
                      isDarkMode={isDarkMode}
                    />
                    <Text style={[styles.itemTitle, { color: ink }]} numberOfLines={2}>
                      {badge.label}
                    </Text>
                  </View>
                );
              })}

              {/* 6th Grid Slot: SEE ALL Pill Button */}
              {!showAllStreaks && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowAllStreaks(true)}
                  style={[
                    styles.gridItem,
                    styles.seeAllSlot,
                    {
                      backgroundColor: surface2,
                      borderColor: borderCol,
                    },
                  ]}
                >
                  <View style={[styles.seeAllPill, { backgroundColor: seeAllBg }]}>
                    <Text style={[styles.seeAllText, { color: seeAllTextCol }]}>SEE ALL</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  showLessBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  showLessText: {
    fontSize: 11,
    fontWeight: '700',
  },
  counterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '31.5%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  seeAllSlot: {
    justifyContent: 'center',
    minHeight: 126,
  },
  seeAllPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  itemTitle: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  itemSub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
