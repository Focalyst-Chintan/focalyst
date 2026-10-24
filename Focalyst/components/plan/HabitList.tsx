import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { awardXP } from '../../src/utils/xpService';
import { queryCache } from '../../src/utils/queryCache';
import { ScreenSkeleton } from '../ui/ScreenSkeleton';
import { FormGroupModal, EnterGroupModal } from './HabitGroupModals';
import { HABIT_GROUP_UPDATED_EVENT } from '../../src/services/habitGroupService';
import { getHabitColorShades, HabitColorShades } from '../../src/utils/habitColorHelper';
import HabitMilestoneModal, { STREAK_MILESTONES } from './HabitMilestoneModal';
import { recordMilestoneForReview } from '../../src/services/reviewPromptService';

interface DayEntry {
  date: string;       // 'YYYY-MM-DD'
  isCompleted: boolean;
  isFuture: boolean;
}

function parseYMDToLocalNoon(ymd: string): Date {
  const clean = String(ymd || '').slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysYMD(startYMD: string, daysToAdd: number): string {
  const d = parseYMDToLocalNoon(startYMD);
  d.setDate(d.getDate() + daysToAdd);
  return formatLocalYMD(d);
}

function formatDate(d: Date): string {
  return formatLocalYMD(d);
}

function getTodayStr(): string {
  return formatLocalYMD(new Date());
}

function calculateStreak(completedDates: string[], todayStr: string): number {
  if (!completedDates || completedDates.length === 0) return 0;
  
  const dateSet = new Set(completedDates.map(d => String(d).slice(0, 10)));
  
  const checkDate = parseYMDToLocalNoon(todayStr);
  const today = formatLocalYMD(checkDate);
  checkDate.setDate(checkDate.getDate() - 1);
  const yesterday = formatLocalYMD(checkDate);
  
  let currentStreak = 0;
  let startDate: Date;
  
  if (dateSet.has(today)) {
    currentStreak = 1;
    startDate = parseYMDToLocalNoon(todayStr);
    startDate.setDate(startDate.getDate() - 1);
  } else if (dateSet.has(yesterday)) {
    currentStreak = 0;
    startDate = parseYMDToLocalNoon(todayStr);
    startDate.setDate(startDate.getDate() - 1);
  } else {
    return 0;
  }
  
  while (true) {
    const checkStr = formatLocalYMD(startDate);
    if (dateSet.has(checkStr)) {
      currentStreak += 1;
      startDate.setDate(startDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return currentStreak;
}

export default function HabitList({
  userId,
  isDarkMode = true,
  onAddHabitPress,
  onEditHabitPress,
  onMilestonePress,
}: {
  userId: string;
  isDarkMode?: boolean;
  onAddHabitPress?: () => void;
  onEditHabitPress?: (habit: any) => void;
  onMilestonePress?: (habit: any, streak: number) => void;
}) {
  const { t } = useTranslation();
  const cachedHabits = userId ? (queryCache.getSync<any[]>(`user:${userId}:habits_v2`) || []) : [];
  const [habits, setHabits] = useState<any[]>(cachedHabits);
  const [loading, setLoading] = useState(cachedHabits.length === 0);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  const [submitting, setSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [activeMenuHabit, setActiveMenuHabit] = useState<any | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number }>({ top: 0, right: 24 });
  const [menuVisible, setMenuVisible] = useState(false);
  const [showFormGroupModal, setShowFormGroupModal] = useState(false);
  const [showEnterGroupModal, setShowEnterGroupModal] = useState(false);
  const [selectedGroupHabit, setSelectedGroupHabit] = useState<any | null>(null);
  const [internalMilestone, setInternalMilestone] = useState<{ habit: any; streak: number } | null>(null);

  const handleMilestoneTrigger = (habit: any, streak: number) => {
    if (STREAK_MILESTONES.includes(streak)) {
      if (onMilestonePress) {
        onMilestonePress(habit, streak);
      } else {
        setInternalMilestone({ habit, streak });
      }
    }
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setActiveMenuHabit(null);
  };

  const openMenuForHabit = (item: any, e?: any) => {
    e?.stopPropagation?.();
    const { height: SCREEN_HEIGHT } = Dimensions.get('window');
    const pageY = e?.nativeEvent?.pageY || 420;
    const MENU_HEIGHT = 290;
    const topPosition =
      SCREEN_HEIGHT - 110 - pageY < MENU_HEIGHT
        ? Math.max(70, pageY - MENU_HEIGHT - 8)
        : pageY + 12;

    setActiveMenuHabit(item);
    setMenuAnchor({ top: topPosition, right: 24 });
    setMenuVisible(true);
  };

  const theme = {
    cardBg: isDarkMode ? '#151B2E' : '#dbe1ec',
    textPrimary: isDarkMode ? '#FFFFFF' : '#4a6c8c',
    textSecondary: isDarkMode ? '#8E95A9' : '#94a3b8',
    borderColor: isDarkMode ? '#222A41' : '#cbd5e1',
    innerBg: isDarkMode ? '#0B1021' : '#ffffff',
    perfBg: isDarkMode ? '#0E1424' : '#f1f5f9',
    dropdownBg: isDarkMode ? '#151B2E' : '#ffffff',
    dropdownBorder: isDarkMode ? '#222A41' : '#e2e8f0',
    dotInactiveBorder: isDarkMode ? '#222A41' : '#cbd5e1',
  };

  const fetchHabits = async (forceRefresh: boolean = false) => {
    if (!userId) return;
    try {
      if (habits.length === 0) setLoading(true);

      // Direct query from Supabase habits + habit_logs for maximum reliability
      const [habitRes, logRes] = await Promise.all([
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .order('position', { ascending: true }),
        supabase
          .from('habit_logs')
          .select('id, habit_id, completed_date')
          .eq('user_id', userId),
      ]);

      if (habitRes.error) throw habitRes.error;

      // Filter in JS so habits with is_active = true or null are safely included
      const activeHabits = (habitRes.data || []).filter(
        (h: any) => h.is_active !== false && !h.is_archived
      );
      const logData = logRes.data || [];

      const completionsMap: Record<string, Set<string>> = {};
      logData.forEach((log: any) => {
        if (!completionsMap[log.habit_id]) {
          completionsMap[log.habit_id] = new Set<string>();
        }
        const cleanDate = String(log.completed_date || '').slice(0, 10);
        if (cleanDate) {
          completionsMap[log.habit_id].add(cleanDate);
        }
      });

      const today = getTodayStr();
      const mappedHabits = activeHabits.map((h: any) => {
        const completedDatesSet = completionsMap[h.id] || new Set<string>();
        const completedDates = Array.from(completedDatesSet);
        return {
          id: h.id,
          name: h.name,
          current_streak: calculateStreak(completedDates, today),
          completed_today: completedDates.includes(today),
          completedDates,
          total_days: completedDatesSet.size,
          created_at: h.created_at || new Date().toISOString(),
          icon: h.icon || '🎯',
          color: h.color || '#3B82F6',
          frequency: h.frequency || 'daily',
          custom_days: h.custom_days,
          longest_streak: h.longest_streak || 0,
          position: h.position,
        };
      });

      setHabits(mappedHabits);
      queryCache.setSync(`user:${userId}:habits_v2`, mappedHabits);
    } catch (e) {
      console.error('Error fetching habits:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      queryCache.getOrHydrate<any[]>(`user:${userId}:habits_v2`).then((cached) => {
        if (cached && cached.length > 0) {
          setHabits(cached);
          setLoading(false);
        }
      });
      fetchHabits(true);
    }
  }, [userId]);

  const handleToggle = async (id: string, currentStatus: boolean, currentStreak: number) => {
    const today = getTodayStr();
    const nextStatus = !currentStatus;
    
    const habit = habits.find(h => h.id === id);
    const existingDates = Array.isArray(habit?.completedDates) ? habit.completedDates : [];
    const currentTotalDays = habit?.total_days ?? existingDates.length ?? 0;
    
    const nextTotalDays = nextStatus
      ? currentTotalDays + 1
      : Math.max(0, currentTotalDays - 1);
    const nextStreak = nextStatus
      ? (currentStreak || 0) + 1
      : Math.max(0, (currentStreak || 1) - 1);

    const nextDates = nextStatus
      ? Array.from(new Set([...existingDates, today]))
      : existingDates.filter((d: string) => d !== today);
    
    // Immediate 0ms optimistic UI update in React state
    const updatedHabits = habits.map(h => {
      if (h.id === id) {
        return {
          ...h,
          completed_today: nextStatus,
          current_streak: nextStreak,
          total_days: nextTotalDays,
          completedDates: nextDates,
        };
      }
      return h;
    });

    setHabits(updatedHabits);
    if (userId) {
      queryCache.setSync(`user:${userId}:habits_v2`, updatedHabits);
    }

    // Automatically trigger Milestone Streak Card if newStreak is in STREAK_MILESTONES
    if (nextStatus && STREAK_MILESTONES.includes(nextStreak) && habit) {
      const updatedHabit = {
        ...habit,
        completed_today: nextStatus,
        current_streak: nextStreak,
        total_days: nextTotalDays,
        completedDates: nextDates,
      };
      handleMilestoneTrigger(updatedHabit, nextStreak);
    }

    try {
      if (nextStatus) {
        const { error: logError } = await supabase
          .from('habit_logs')
          .insert([{ habit_id: id, user_id: userId, completed_date: today }]);

        if (logError) throw logError;

        const { error: habitError } = await supabase
          .from('habits')
          .update({ current_streak: nextStreak })
          .eq('id', id);

        if (habitError) throw habitError;

        // Award XP for habit completion
        awardXP(5, 'Habit Logged');
        void recordMilestoneForReview('habit');
      } else {
        const { error: logError } = await supabase
          .from('habit_logs')
          .delete()
          .eq('habit_id', id)
          .eq('completed_date', today);

        if (logError) throw logError;

        const { error: habitError } = await supabase
          .from('habits')
          .update({ current_streak: nextStreak })
          .eq('id', id);

        if (habitError) throw habitError;
      }
      DeviceEventEmitter.emit(HABIT_GROUP_UPDATED_EVENT);
    } catch (e) {
      console.error('Error toggling habit completion:', e);
      try {
        await fetchHabits(true);
      } catch (fetchError) {
        console.warn('Network disruption during rollback fetch:', fetchError);
      }
    }
  };

  const handleAddHabit = async () => {
    if (!newName.trim()) {
      setIsAdding(false);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        user_id: userId,
        name: newName.trim(),
        icon: newEmoji.trim(),
        color: '#3B82F6',
        current_streak: 0,
        is_active: true,
        position: habits.length + 1,
      };

      const { data, error } = await supabase
        .from('habits')
        .insert([payload])
        .select();

      if (error) throw error;
      if (data) {
        fetchHabits();
        setNewName('');
        setIsAdding(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add habit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      setHabits(prev => prev.filter(h => h.id !== id));
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete habit');
      fetchHabits();
    }
  };

  if (loading && habits.length === 0) {
    return <ScreenSkeleton rows={3} isDark={isDarkMode} />;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('plan.habits')}</Text>

      <View style={styles.list}>
        {habits.map(item => (
          <HabitCardItem
            key={item.id}
            item={item}
            isExpanded={expandedHabitId === item.id}
            onToggleExpand={() => setExpandedHabitId((prev) => (prev === item.id ? null : item.id))}
            onToggleCheck={() => handleToggle(item.id, item.completed_today, item.current_streak)}
            onOpenMenu={(e) => openMenuForHabit(item, e)}
            onMilestonePress={(habit, streak) => handleMilestoneTrigger(habit, streak)}
            theme={theme}
            isDarkMode={isDarkMode}
            t={t}
          />
        ))}

        {isAdding && (
          <View style={[styles.habitRow, styles.addingHabitRow, { backgroundColor: theme.perfBg, borderColor: theme.borderColor }]}>
            <View style={[styles.checkbox, { borderColor: theme.borderColor, backgroundColor: theme.innerBg }]} />
            
            <TextInput
              style={[styles.inlineEmojiInput, { backgroundColor: theme.innerBg, borderColor: theme.borderColor, color: theme.textPrimary }]}
              value={newEmoji}
              onChangeText={setNewEmoji}
              maxLength={2}
            />

            <TextInput
              style={[styles.inlineInput, { color: theme.textPrimary }]}
              placeholder="Skincare"
              placeholderTextColor={theme.textSecondary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleAddHabit}
              onBlur={() => {
                if (!newName.trim()) setIsAdding(false);
              }}
            />
            {submitting ? (
              <ActivityIndicator size="small" color="#FF6B00" style={{ padding: 4 }} />
            ) : (
              <TouchableOpacity onPress={handleAddHabit} style={styles.checkButton}>
                <Ionicons name="checkmark-circle" size={22} color="#FF6B00" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {!isAdding && (
        <TouchableOpacity
          style={styles.orangeButton}
          onPress={() => {
            if (onAddHabitPress) {
              onAddHabitPress();
            } else {
              setIsAdding(true);
            }
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.orangeButtonText}>+ Add new habit</Text>
        </TouchableOpacity>
      )}

      {/* Habit 3-Dot Overflow Menu Modal */}
      <Modal
        visible={menuVisible && !!activeMenuHabit}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeMenu}
          />
          {activeMenuHabit && (
            <View
              style={[
                styles.modalDropdownMenu,
                {
                  top: menuAnchor.top,
                  right: menuAnchor.right,
                  backgroundColor: theme.dropdownBg,
                  borderColor: theme.dropdownBorder,
                },
              ]}
            >
            {/* 1. Form Group */}
            <TouchableOpacity
              onPress={() => {
                const targetHabit = activeMenuHabit || habits[0] || null;
                setSelectedGroupHabit(targetHabit);
                // 1. Close the 3-dot menu modal first
                setMenuVisible(false);
                setActiveMenuHabit(null);
                // 2. Wait 180ms for iOS UIKit to finish dismissing the menu modal before presenting FormGroupModal!
                setTimeout(() => {
                  setShowFormGroupModal(true);
                }, 180);
              }}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Form Group</Text>
            </TouchableOpacity>

            {/* 2. Join Group */}
            <TouchableOpacity
              onPress={() => {
                const targetHabit = activeMenuHabit || habits[0] || null;
                setSelectedGroupHabit(targetHabit);
                // 1. Close the 3-dot menu modal first
                setMenuVisible(false);
                setActiveMenuHabit(null);
                // 2. Wait 180ms for iOS UIKit to finish dismissing the menu modal before presenting EnterGroupModal!
                setTimeout(() => {
                  setShowEnterGroupModal(true);
                }, 180);
              }}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Join Group</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.borderColor }]} />

            {/* 3. Edit */}
            <TouchableOpacity
              onPress={() => {
                const habit = activeMenuHabit;
                closeMenu();
                setTimeout(() => {
                  if (onEditHabitPress) {
                    onEditHabitPress(habit);
                  }
                }, 300);
              }}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Edit</Text>
            </TouchableOpacity>

            {/* 4. Rename */}
            <TouchableOpacity
              onPress={() => {
                const habit = activeMenuHabit;
                closeMenu();
                setTimeout(() => {
                  if (Platform.OS === 'ios') {
                    Alert.prompt(
                      'Rename Habit',
                      'Enter new name for this habit:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Save',
                          onPress: async (newName?: string) => {
                            if (newName?.trim()) {
                              await supabase.from('habits').update({ name: newName.trim() }).eq('id', habit.id);
                              fetchHabits(true);
                            }
                          },
                        },
                      ],
                      'plain-text',
                      habit.name
                    );
                  } else if (onEditHabitPress) {
                    onEditHabitPress(habit);
                  }
                }, 300);
              }}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Rename</Text>
            </TouchableOpacity>

            {/* 5. Tag */}
            <TouchableOpacity
              onPress={() => {
                const habit = activeMenuHabit;
                closeMenu();
                setTimeout(() => {
                  if (onEditHabitPress) {
                    onEditHabitPress(habit);
                  }
                }, 300);
              }}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, { color: theme.textPrimary }]}>Tag</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: theme.borderColor }]} />

            {/* 6. Delete (destructive red #EF4444) */}
            <TouchableOpacity
              onPress={() => {
                const id = activeMenuHabit.id;
                closeMenu();
                setTimeout(() => {
                  handleDeleteHabit(id);
                }, 300);
              }}
              style={styles.menuItem}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuItemText, styles.menuItemDelete]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </Modal>

      {/* Form Group Modal */}
      <FormGroupModal
        visible={showFormGroupModal}
        onClose={() => setShowFormGroupModal(false)}
        habit={selectedGroupHabit}
        allHabits={habits}
        isDark={isDarkMode}
        onGroupUpdated={() => fetchHabits(true)}
      />

      {/* Enter Group Modal */}
      <EnterGroupModal
        visible={showEnterGroupModal}
        onClose={() => setShowEnterGroupModal(false)}
        initialHabit={selectedGroupHabit}
        allHabits={habits}
        isDark={isDarkMode}
        onJoinSuccess={() => fetchHabits(true)}
      />

      {/* Habit Milestone Streak Card Modal (Internal Fallback) */}
      <HabitMilestoneModal
        visible={!!internalMilestone}
        habit={internalMilestone?.habit || null}
        streak={internalMilestone?.streak || 0}
        onClose={() => setInternalMilestone(null)}
      />
    </View>
  );
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatDateRangeLabel(startYMD: string, endYMD: string): string {
  const sDate = parseYMDToLocalNoon(startYMD);
  const eDate = parseYMDToLocalNoon(endYMD);

  const sMonth = sDate.toLocaleString('en-US', { month: 'short' });
  const eMonth = eDate.toLocaleString('en-US', { month: 'short' });

  return `${sMonth} ${sDate.getDate()}, ${sDate.getFullYear()} — ${eMonth} ${eDate.getDate()}, ${eDate.getFullYear()}`;
}

interface PerformanceHeatmapGridProps {
  item: any;
  shades: HabitColorShades;
  theme: any;
  isDarkMode: boolean;
  t: (key: string, options?: any) => string;
}

function PerformanceHeatmapGrid({
  item,
  shades,
  theme,
  isDarkMode,
  t,
}: PerformanceHeatmapGridProps) {
  const [layoutWidth, setLayoutWidth] = useState<number>(0);
  const [pageOffset, setPageOffset] = useState<number>(0);

  const today = new Date();
  const todayYMD = formatLocalYMD(today);

  const completedSet = useMemo(() => {
    return new Set<string>(
      (item.completedDates || []).map((d: string) => String(d).slice(0, 10))
    );
  }, [item.completedDates]);

  // Compute consecutive streak runs for any completed date
  const getStreakRun = useCallback((targetDate: string): number => {
    if (!completedSet.has(targetDate)) return 0;
    let run = 1;
    let prev = addDaysYMD(targetDate, -1);
    while (completedSet.has(prev)) {
      run++;
      prev = addDaysYMD(prev, -1);
    }
    return run;
  }, [completedSet]);

  const totalCompletedDays = completedSet.size;
  const completionPercent = Math.min(100, Math.round((totalCompletedDays / 365) * 100));
  const averagePerDay = (totalCompletedDays / 365).toFixed(1);

  // Responsive layout geometry
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = Math.max(260, layoutWidth || (screenWidth - 72));
  const DAY_LABEL_WIDTH = 14;
  const DAY_LABEL_MARGIN = 8;
  const GAP = 4;
  const gridAvailableWidth = Math.max(220, availableWidth - DAY_LABEL_WIDTH - DAY_LABEL_MARGIN);

  // 19-week window for chunkier ~13-14px boxy tiles with borderRadius: 4
  const numCols = Math.min(19, Math.max(16, Math.floor((gridAvailableWidth + GAP) / (13 + GAP))));
  const cellSize = Math.floor(((gridAvailableWidth - (numCols - 1) * GAP) / numCols) * 10) / 10;

  // Strict Monday-to-Sunday alignment: Monday=0, Tuesday=1, ..., Sunday=6
  const todayRow = (today.getDay() + 6) % 7;
  const currentWeekMonday = addDaysYMD(todayYMD, -todayRow);

  // When pageOffset === 0, rightmost column is current week ending on today
  // Incrementing pageOffset shifts backward by numCols weeks per page
  const endWeekMonday = addDaysYMD(currentWeekMonday, -pageOffset * numCols * 7);
  const windowStartMonday = addDaysYMD(endWeekMonday, -(numCols - 1) * 7);
  const windowEndDay = pageOffset === 0 ? todayYMD : addDaysYMD(endWeekMonday, 6);

  const dateRangeLabel = formatDateRangeLabel(windowStartMonday, windowEndDay);

  return (
    <View style={[styles.performanceContainer, { backgroundColor: isDarkMode ? shades.perfContainerTint : theme.perfBg }]}>
      <View style={[styles.performanceTopDivider, { backgroundColor: theme.borderColor }]} />
      <View style={styles.performanceHeader}>
        <Text style={[styles.performanceTitle, { color: theme.textSecondary }]}>PERFORMANCE BREAKDOWN</Text>
        <View style={[styles.totalDaysBadge, { backgroundColor: shades.badgeBg }]}>
          <Text style={[styles.totalDaysText, { color: shades.badgeText }]}>
            {t('plan.totalDays', { count: totalCompletedDays })}
          </Text>
        </View>
      </View>

      <View
        style={styles.heatmapOuterWrapper}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - layoutWidth) > 1) {
            setLayoutWidth(w);
          }
        }}
      >
        <View style={styles.heatmapRowWithAxis}>
          {/* Day-of-Week Labels Column (M T W T F S S) */}
          <View style={[styles.dayLabelsColumn, { width: DAY_LABEL_WIDTH, marginRight: DAY_LABEL_MARGIN, gap: GAP }]}>
            {DAY_LABELS.map((dayLabel, idx) => (
              <View key={idx} style={{ height: cellSize, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.dayAxisLabel,
                    {
                      height: cellSize,
                      lineHeight: cellSize,
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : theme.textSecondary,
                    },
                  ]}
                >
                  {dayLabel}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid columns */}
          <View style={[styles.gridContainer, { gap: GAP }]}>
            {Array.from({ length: numCols }).map((_, colIndex) => (
              <View key={colIndex} style={[styles.dotColumn, { gap: GAP }]}>
                {Array.from({ length: 7 }).map((__, rowIndex) => {
                  const cellDate = addDaysYMD(windowStartMonday, colIndex * 7 + rowIndex);
                  const isFuture = pageOffset === 0 && colIndex === numCols - 1 && rowIndex > todayRow;

                  if (isFuture) {
                    return (
                      <View
                        key={rowIndex}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 4,
                          borderWidth: 0,
                          backgroundColor: 'transparent',
                          opacity: 0,
                        }}
                      />
                    );
                  }

                  const isCompleted = completedSet.has(cellDate);
                  let cellColor = shades.emptyCell;

                  if (isCompleted) {
                    const run = getStreakRun(cellDate);
                    if (run === 1) cellColor = shades.level1;
                    else if (run === 2) cellColor = shades.level2;
                    else if (run <= 4) cellColor = shades.level3;
                    else cellColor = shades.level4;
                  }

                  return (
                    <View
                      key={rowIndex}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 4,
                        borderWidth: 0,
                        backgroundColor: cellColor,
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Interactive Time Frame Navigation Footer */}
      <View style={styles.timeFrameFooter}>
        <TouchableOpacity
          style={[
            styles.navPillBtn,
            {
              backgroundColor: shades.emptyCell,
              borderColor: shades.base + '40',
            },
          ]}
          onPress={() => setPageOffset((prev) => prev + 1)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Previous time period"
        >
          <Ionicons name="chevron-back" size={15} color={isDarkMode ? '#FFFFFF' : theme.textPrimary} />
        </TouchableOpacity>

        <Text
          style={[
            styles.timeFrameText,
            { color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : theme.textPrimary },
          ]}
        >
          {dateRangeLabel}
        </Text>

        {pageOffset > 0 ? (
          <TouchableOpacity
            style={[
              styles.navPillBtn,
              {
                backgroundColor: shades.emptyCell,
                borderColor: shades.base + '40',
              },
            ]}
            onPress={() => setPageOffset((prev) => Math.max(0, prev - 1))}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Next time period"
          >
            <Ionicons name="chevron-forward" size={15} color={isDarkMode ? '#FFFFFF' : theme.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navPillSpacer} />
        )}
      </View>

      <View style={[styles.statsDivider, { backgroundColor: theme.borderColor }]} />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>COMPLETION</Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>{completionPercent}%</Text>
        </View>
        <View style={[styles.verticalDivider, { backgroundColor: theme.borderColor }]} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>AVERAGE</Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {averagePerDay} <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textSecondary }}>/day</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

function HabitCardItem({
  item,
  isExpanded,
  onToggleExpand,
  onToggleCheck,
  onOpenMenu,
  onMilestonePress,
  theme,
  isDarkMode,
  t,
}: {
  item: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleCheck: () => void;
  onOpenMenu: (e: any) => void;
  onMilestonePress?: (habit: any, streak: number) => void;
  theme: any;
  isDarkMode: boolean;
  t: any;
}) {
  const shades = useMemo(() => getHabitColorShades(item.color, isDarkMode), [item.color, isDarkMode]);
  const isMilestone = STREAK_MILESTONES.includes(item.current_streak || 0);

  return (
    <View
      style={[
        styles.cardWrapper,
        { backgroundColor: theme.cardBg },
      ]}
    >
      <View
        style={[
          styles.habitRow,
          isExpanded && [styles.habitRowExpanded, { borderBottomColor: theme.borderColor }],
        ]}
      >
        {/* Left Checkbox: custom tinted surface and solid check with habit color */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            item.completed_today
              ? { backgroundColor: shades.base, borderColor: shades.base }
              : { backgroundColor: shades.emptyCell, borderColor: shades.checkboxBorder, borderWidth: 1.5 },
          ]}
          onPress={(e) => {
            e?.stopPropagation?.();
            onToggleCheck();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {item.completed_today && <Ionicons name="checkmark" size={14} color="#ffffff" />}
        </TouchableOpacity>

        {/* Middle Habit Body: touchable area to expand/collapse */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e?.stopPropagation?.();
            onToggleExpand();
          }}
          style={styles.habitBodyTouchable}
        >
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: shades.iconBg,
                borderColor: shades.borderColor,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={styles.iconText}>{item.icon || '🎯'}</Text>
          </View>

          <Text
            numberOfLines={1}
            style={[
              styles.habitName,
              { color: theme.textPrimary },
              item.completed_today && styles.habitNameChecked,
            ]}
          >
            {item.name}
          </Text>
        </TouchableOpacity>

        {/* Streak pill badge styled with habit's distinct color identity.
            Tappable: opens Milestone Streak Card if current_streak is in STREAK_MILESTONES */}
        <TouchableOpacity
          activeOpacity={isMilestone ? 0.7 : 1}
          onPress={(e) => {
            e?.stopPropagation?.();
            if (isMilestone) {
              onMilestonePress?.(item, item.current_streak);
            } else {
              onToggleExpand();
            }
          }}
          style={[
            styles.streakBadge,
            { backgroundColor: shades.badgeBg },
            isMilestone && {
              borderWidth: 1,
              borderColor: shades.badgeText + '70',
            },
          ]}
        >
          <Text style={[styles.streakBadgeText, { color: shades.badgeText }]}>
            🔥 {item.current_streak || 0} {item.current_streak === 1 ? 'day' : 'days'}
          </Text>
        </TouchableOpacity>

        {/* Three-Dot Menu Button */}
        <TouchableOpacity
          accessibilityLabel="Open habit options"
          accessibilityRole="button"
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          onPress={(e) => {
            e?.stopPropagation?.();
            onOpenMenu(e);
          }}
          style={styles.optionsButton}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <PerformanceHeatmapGrid
          item={item}
          shades={shades}
          theme={theme}
          isDarkMode={isDarkMode}
          t={t}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  list: {
    gap: 12,
    marginBottom: 14,
  },
  cardWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
    zIndex: 10,
  },
  habitRowExpanded: {
    borderBottomWidth: 1,
  },
  addingHabitRow: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  iconText: {
    fontSize: 16,
  },
  habitName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  habitNameChecked: {
    color: '#8E95A9',
    textDecorationLine: 'line-through',
  },
  activeHabitsText: {
    color: '#8E95A9',
    fontSize: 12,
    marginRight: 6,
    fontWeight: '500',
  },
  streakBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  habitBodyTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    marginRight: 6,
  },
  optionsButton: {
    padding: 6,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBackdrop: {
    position: 'absolute',
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalDropdownMenu: {
    position: 'absolute',
    width: 205,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 205,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    zIndex: 100,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  menuItemDelete: {
    color: '#EF4444',
    fontWeight: '600',
  },
  performanceTopDivider: {
    height: 1,
    marginBottom: 12,
  },
  performanceContainer: {
    padding: 16,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalDaysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalDaysText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heatmapOuterWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  heatmapRowWithAxis: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayLabelsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayAxisLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  dotColumn: {
    flexDirection: 'column',
  },
  timeFrameFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 4,
    width: '100%',
  },
  navPillBtn: {
    width: 38,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navPillSpacer: {
    width: 38,
    height: 28,
  },
  timeFrameText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsDivider: {
    height: 1,
    marginBottom: 14,
    marginTop: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#8E95A9',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 32,
  },
  inlineEmojiInput: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    marginRight: 10,
    padding: 0,
  },
  inlineInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  checkButton: {
    padding: 2,
  },
  orangeButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
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
});
