import React, { useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { calculateProductivityScore } from '../src/utils/analytics';
import { useTranslation } from 'react-i18next';

import { isReportWindowOpen, markReportDismissedThisWeek } from '../src/utils/reportUtils';
import { supabase } from '../src/utils/supabase';

interface WeeklyReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  weeklyFocusMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  isPro?: boolean;
  userId?: string | null;
}

export default function WeeklyReportSheet({
  isOpen,
  onClose,
  isDarkMode = true,
  weeklyFocusMinutes = 0,
  tasksCompleted = 0,
  tasksTotal = 0,
  habitsCompleted = 0,
  habitsTotal = 0,
  isPro = false,
  userId = null,
}: WeeklyReportSheetProps) {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%', '95%'], []);

  useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    if (isOpen) {
      // Race condition safety - small delay lets gesture handler frame attach
      timer = setTimeout(() => {
        if (isMounted) {
          bottomSheetRef.current?.expand();
        }
      }, 100);
    } else {
      bottomSheetRef.current?.close();
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  const weeklyFocusHours = weeklyFocusMinutes / 60;
  const taskRatio = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0;
  const habitRatio = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;

  // Calculate Productivity Score using exact weighted algorithm
  const { score, focusPoints, taskPoints, habitPoints } = useMemo(() => {
    return calculateProductivityScore(
      weeklyFocusHours,
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsTotal
    );
  }, [weeklyFocusHours, tasksCompleted, tasksTotal, habitsCompleted, habitsTotal]);

  // SVG Circular progress configurations
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Format focus time
  const focusHoursInt = Math.floor(weeklyFocusHours);
  const focusMinsRemaining = Math.round((weeklyFocusHours - focusHoursInt) * 60);
  const focusTimeStr = `${focusHoursInt}h ${focusMinsRemaining}m`;

  // Strengths and Improvements logic based on blueprint rule
  const showStrengths = focusPoints > 30 || habitRatio > 0.8;
  const showImprovements = taskRatio < 0.3 || habitRatio < 0.5;

  const strengthsList = useMemo(() => {
    const list: string[] = [];
    if (focusPoints > 30) {
      list.push(
        `You demonstrated impressive dedication with ${focusHoursInt} hours and ${focusMinsRemaining} minutes of total focus time, maintaining sustained concentration and demonstrating excellent self-control.`
      );
    }
    if (habitRatio > 0.8) {
      list.push('You also kept all your habit streaks active, staying highly consistent.');
    }
    if (tasksCompleted > 0 && taskRatio >= 0.7) {
      list.push(`You completed a significant majority of your tasks (${tasksCompleted}/${tasksTotal}), keeping your momentum strong.`);
    }
    return list;
  }, [focusPoints, habitRatio, tasksCompleted, tasksTotal, focusHoursInt, focusMinsRemaining, taskRatio]);

  const improvementsList = useMemo(() => {
    const list: string[] = [];
    if (taskRatio < 0.3) {
      if (tasksTotal === 0) {
        list.push('Your primary area for improvement is task planning, as no tasks were added or completed this week.');
      } else {
        list.push(`Your primary area for improvement is task completion, as only ${tasksCompleted}/${tasksTotal} tasks were completed this week.`);
      }
    }
    if (habitRatio < 0.5) {
      const habitPercent = Math.round(habitRatio * 100);
      list.push(
        `Additionally, your habit consistency was at ${habitPercent}%, indicating missed opportunities to reinforce positive behaviors.`
      );
    }
    return list;
  }, [taskRatio, habitRatio, tasksCompleted, tasksTotal]);

  const patternText = "Your focus activity peaks on Sunday afternoon. You maintain high concentration levels when tasks are broken down into smaller milestones.";
  const weaknessText = "You tend to delay starting your habits. A significant drop in task completion was observed mid-week (Wednesday).";
  const prescriptionText = "We recommend planning your hardest tasks on Monday morning and setting a consistent Pomodoro pattern (25/5) to maintain energy levels.";

  const handleCopyReport = async () => {
    let reportString = `WEEKLY PRODUCTIVITY REPORT\nProductivity Score: ${score}/100\n\n`;
    
    reportString += `• FOCUS TIME: ${focusTimeStr}\n`;
    reportString += `• TASKS COMPLETED: ${tasksCompleted}/${tasksTotal} (${Math.round(taskRatio * 100)}%)\n`;
    reportString += `• HABIT CONSISTENCY: ${Math.round(habitRatio * 100)}%\n\n`;
    
    if (showStrengths && strengthsList.length > 0) {
      reportString += `STRENGTHS:\n`;
      strengthsList.forEach(item => {
        reportString += `- ${item}\n`;
      });
      reportString += `\n`;
    }
    
    if (showImprovements && improvementsList.length > 0) {
      reportString += `AREAS TO IMPROVE:\n`;
      improvementsList.forEach(item => {
        reportString += `- ${item}\n`;
      });
      reportString += `\n`;
    }
    
    reportString += `CATALYST INSIGHTS:\n`;
    if (isPro) {
      reportString += `• Pattern Intelligence: ${patternText}\n`;
      reportString += `• Weakness Diagnosis: ${weaknessText}\n`;
      reportString += `• Priority Prescription: ${prescriptionText}\n`;
    } else {
      reportString += `[Locked] Get cognitive pacing recommendations and habit scheduling hacks powered by Focalyst AI. Upgrade to Pro to unlock.`;
    }
    
    try {
      await Clipboard.setStringAsync(reportString);
      Alert.alert("Copied!", "Your Weekly Productivity Report has been copied to your clipboard.");
    } catch (err) {
      console.warn("Failed to copy to clipboard", err);
    }
  };

  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      if (userId) {
        markReportDismissedThisWeek(userId, supabase).catch(() => {});
      }
      onClose();
    }
  };

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.5}
    />
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.bottomSheetBg, isDarkMode && { backgroundColor: '#0B1021' }]}
      handleIndicatorStyle={[styles.bottomSheetIndicator, isDarkMode && { backgroundColor: '#222A41' }]}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContainer} bounces={false} overScrollMode="never">
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
          <View style={[styles.header, { marginBottom: 0 }]}>
            <View style={[styles.headerIconBg, isDarkMode && { backgroundColor: '#151B2E' }]}>
              <Ionicons name="calendar-outline" size={22} color={isDarkMode ? '#FF6B00' : '#4a6c8c'} />
            </View>
            <View>
              <Text style={[styles.headerTitle, isDarkMode && { color: '#FFFFFF' }]}>Weekly Productivity Report</Text>
              <Text style={[styles.headerSubtitle, isDarkMode && { color: '#8E95A9' }]}>Last Week: Mon – Sun</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (userId) {
                markReportDismissedThisWeek(userId, supabase).catch(() => {});
              }
              bottomSheetRef.current?.close();
              onClose();
            }}
            style={{ padding: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={isDarkMode ? '#8E95A9' : '#64748b'} />
          </TouchableOpacity>
        </View>

        {/* Ring & Pills Row */}
        <View style={[styles.statsOverviewRow, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
          {/* Circular Donut Progress Ring */}
          <View style={styles.donutContainer}>
            <Svg width={size} height={size}>
              {/* Background circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={isDarkMode ? '#222A41' : '#e2e8f0'}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Highlight active progress */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#ff6b2b"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={styles.donutTextOverlay}>
              <Text style={[styles.donutValue, isDarkMode && { color: '#FFFFFF' }]}>{score}</Text>
              <Text style={[styles.donutMax, isDarkMode && { color: '#8E95A9' }]}>/ 100</Text>
            </View>
          </View>

          {/* Vertical Details Summary Pills */}
          <View style={styles.summaryPills}>
            {/* Focus Pill */}
            <View style={[styles.summaryPill, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
              <View style={styles.pillIconLabel}>
                <Ionicons name="time-outline" size={16} color={isDarkMode ? '#8E95A9' : '#64748b'} />
                <Text style={[styles.pillLabel, isDarkMode && { color: '#8E95A9' }]}>FOCUS</Text>
              </View>
              <Text style={[styles.pillValue, isDarkMode && { color: '#FFFFFF' }]}>{focusTimeStr}</Text>
            </View>

            {/* Tasks Pill */}
            <View style={[styles.summaryPill, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
              <View style={styles.pillIconLabel}>
                <Ionicons name="checkmark-circle-outline" size={16} color={isDarkMode ? '#8E95A9' : '#64748b'} />
                <Text style={[styles.pillLabel, isDarkMode && { color: '#8E95A9' }]}>PLAN</Text>
              </View>
              <Text style={[styles.pillValue, isDarkMode && { color: '#FFFFFF' }]}>{tasksCompleted}</Text>
            </View>

            {/* Habits Pill */}
            <View style={[styles.summaryPill, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
              <View style={styles.pillIconLabel}>
                <Ionicons name="flame-outline" size={16} color="#ff6b2b" />
                <Text style={[styles.pillLabel, isDarkMode && { color: '#8E95A9' }]}>HABITS</Text>
              </View>
              <Text style={[styles.pillValue, { color: '#ff6b2b' }]}>
                {Math.round(habitRatio * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Breakdown Section */}
        <View style={[styles.breakdownSection, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
          <Text style={[styles.sectionTitle, isDarkMode && { color: '#FFFFFF' }]}>PERFORMANCE BREAKDOWN</Text>

          {/* Tasks Progress Bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressHeader}>
              <View style={styles.progressLabelRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={[styles.progressLabel, isDarkMode && { color: '#FFFFFF' }]}>Tasks Completed</Text>
              </View>
              <Text style={[styles.progressPercent, { color: '#10b981' }]}>
                {Math.round(taskRatio * 100)}%
              </Text>
            </View>
            <View style={[styles.progressBarBg, isDarkMode && { backgroundColor: '#222A41' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(taskRatio * 100)}%`, backgroundColor: '#10b981' },
                ]}
              />
            </View>
          </View>

          {/* Habits Progress Bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressHeader}>
              <View style={styles.progressLabelRow}>
                <Ionicons name="flame" size={16} color="#ff6b2b" />
                <Text style={[styles.progressLabel, isDarkMode && { color: '#FFFFFF' }]}>{t('plan.habits')}</Text>
              </View>
              <Text style={[styles.progressPercent, { color: '#ff6b2b' }]}>
                {Math.round(habitRatio * 100)}%
              </Text>
            </View>
            <View style={[styles.progressBarBg, isDarkMode && { backgroundColor: '#222A41' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(habitRatio * 100)}%`, backgroundColor: '#ff6b2b' },
                ]}
              />
            </View>
          </View>

          {/* Productivity Score Progress Bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressHeader}>
              <View style={styles.progressLabelRow}>
                <Ionicons name="pulse" size={16} color="#4a6c8c" />
                <Text style={[styles.progressLabel, isDarkMode && { color: '#FFFFFF' }]}>Productivity Score</Text>
              </View>
              <Text style={[styles.progressPercent, { color: '#4a6c8c' }]}>{score}%</Text>
            </View>
            <View style={[styles.progressBarBg, isDarkMode && { backgroundColor: '#222A41' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${score}%`, backgroundColor: '#4a6c8c' },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Dynamic Strengths Section */}
        {showStrengths && (
          <View style={[styles.insightCard, styles.strengthsCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#10b981' }]}>
            <View style={styles.insightHeader}>
              <Ionicons name="trending-up" size={20} color="#10b981" />
              <Text style={[styles.insightTitle, { color: '#10b981' }]}>STRENGTHS</Text>
            </View>
            <View style={styles.bulletContainer}>
              {strengthsList.map((bullet, idx) => (
                <View key={`str-${idx}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: '#10b981' }]}>•</Text>
                  <Text style={[styles.bulletText, isDarkMode && { color: '#8E95A9' }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dynamic Areas to Improve Section */}
        {showImprovements && (
          <View style={[styles.insightCard, styles.improvementsCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#f97316' }]}>
            <View style={styles.insightHeader}>
              <Ionicons name="trending-down" size={20} color="#f97316" />
              <Text style={[styles.insightTitle, { color: '#f97316' }]}>AREAS TO IMPROVE</Text>
            </View>
            <View style={styles.bulletContainer}>
              {improvementsList.map((bullet, idx) => (
                <View key={`imp-${idx}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: '#f97316' }]}>•</Text>
                  <Text style={[styles.bulletText, isDarkMode && { color: '#8E95A9' }]}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Synthesized Insights Box */}
        {(showStrengths || showImprovements) && (
          <View style={[styles.insightsBox, isDarkMode && { backgroundColor: '#0B1021', borderColor: '#222A41' }]}>
            <View style={styles.boxHeader}>
              <Ionicons name="sparkles-outline" size={16} color={isDarkMode ? '#FFFFFF' : '#4a6c8c'} />
              <Text style={[styles.boxTitle, isDarkMode && { color: '#FFFFFF' }]}>weekly insights</Text>
            </View>
            <Text style={[styles.boxParagraph, isDarkMode && { color: '#8E95A9' }]}>
              {strengthsList.join(' ')} {improvementsList.join(' ')}
              {score >= 60
                ? ' Awesome job! Keep leveraging your high focus capacity to drive consistent progress in your upcoming tasks.'
                : ' Set small, achievable task and habit milestones next week to systematically elevate your overall score.'}
            </Text>
          </View>
        )}

        {/* Catalyst Insights (Pro Gate) */}
        <View style={styles.proGateSection}>
          <View style={styles.proGateTitleRow}>
            <Ionicons name="flash" size={20} color="#ff6b2b" />
            <Text style={[styles.proGateTitle, isDarkMode && { color: '#FFFFFF' }]}>Catalyst Insights</Text>
          </View>
          {!isPro ? (
            <View style={[styles.lockedCard, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
              <View style={styles.blurContainer}>
                <Ionicons name="lock-closed" size={32} color={isDarkMode ? '#8E95A9' : '#4a6c8c'} style={{ marginBottom: 12 }} />
                <Text style={[styles.lockedText, isDarkMode && { color: '#FFFFFF' }]}>
                  Upgrade to Pro to unlock deep Catalyst Insights
                </Text>
                <Text style={[styles.lockedSubtext, isDarkMode && { color: '#8E95A9' }]}>
                  Get personalized cognitive pacing recommendations and habit scheduling hacks powered by Focalyst AI.
                </Text>
                <TouchableOpacity
                  style={[styles.proButton, isDarkMode && { backgroundColor: '#FF6B00' }]}
                  activeOpacity={0.9}
                  onPress={() => alert('Upgrade to Pro subscription triggered!')}
                >
                  <Text style={styles.proButtonText}>Upgrade to Pro</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {/* Pattern Intelligence */}
              <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: '#4a6c8c' }, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
                <View style={styles.insightHeader}>
                  <Ionicons name="bar-chart-outline" size={18} color="#4a6c8c" />
                  <Text style={[styles.insightTitle, { color: '#4a6c8c' }]}>PATTERN INTELLIGENCE</Text>
                </View>
                <Text style={[styles.bulletText, isDarkMode && { color: '#8E95A9' }]}>{patternText}</Text>
              </View>

              {/* Weakness Diagnosis */}
              <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: '#ff6b2b' }, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
                <View style={styles.insightHeader}>
                  <Ionicons name="alert-circle-outline" size={18} color="#ff6b2b" />
                  <Text style={[styles.insightTitle, { color: '#ff6b2b' }]}>WEAKNESS DIAGNOSIS</Text>
                </View>
                <Text style={[styles.bulletText, isDarkMode && { color: '#8E95A9' }]}>{weaknessText}</Text>
              </View>

              {/* Priority Prescription */}
              <View style={[styles.insightCard, { borderLeftWidth: 4, borderLeftColor: '#10b981' }, isDarkMode && { backgroundColor: '#151B2E', borderColor: '#222A41' }]}>
                <View style={styles.insightHeader}>
                  <Ionicons name="bulb-outline" size={18} color="#10b981" />
                  <Text style={[styles.insightTitle, { color: '#10b981' }]}>PRIORITY PRESCRIPTION</Text>
                </View>
                <Text style={[styles.bulletText, isDarkMode && { color: '#8E95A9' }]}>{prescriptionText}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Copy Report to Clipboard Ghost Button */}
        <TouchableOpacity
          style={[styles.copyButton, isDarkMode && { borderColor: '#222A41' }]}
          activeOpacity={0.7}
          onPress={handleCopyReport}
        >
          <Ionicons name="copy-outline" size={18} color={isDarkMode ? '#FFFFFF' : '#4a6c8c'} style={{ marginRight: 8 }} />
          <Text style={[styles.copyButtonText, isDarkMode && { color: '#FFFFFF' }]}>Copy Report to Clipboard</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBg: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  bottomSheetIndicator: {
    backgroundColor: '#cbd5e1',
    width: 48,
    height: 5,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerIconBg: {
    width: 44,
    height: 44,
    backgroundColor: '#e6ebf4',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a6c8c',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statsOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  donutContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutTextOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#4a6c8c',
  },
  donutMax: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryPills: {
    flex: 1,
    paddingLeft: 20,
    gap: 8,
  },
  summaryPill: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a6c8c',
  },
  breakdownSection: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4a6c8c',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a6c8c',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  insightCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  strengthsCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  improvementsCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bulletContainer: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  insightsBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4a6c8c',
  },
  boxParagraph: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  proGateSection: {
    gap: 12,
  },
  proGateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proGateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a6c8c',
  },
  lockedCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    padding: 30,
    overflow: 'hidden',
  },
  blurContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a6c8c',
    textAlign: 'center',
    marginBottom: 6,
  },
  lockedSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  proButton: {
    backgroundColor: '#4a6c8c',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 99,
  },
  proButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 14,
    width: '100%',
    marginTop: 8,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4a6c8c',
  },
});
