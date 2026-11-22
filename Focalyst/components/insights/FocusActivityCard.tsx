import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { SegmentedToggle } from '../ui/SegmentedToggle';

export interface FocusActivityItem {
  dateStr: string;
  label: string;
  dayNum?: number;
  focusMinutes: number;
  breakMinutes: number;
  isToday?: boolean;
}

export interface FocusActivityCardProps {
  isDarkMode: boolean;
  isPro: boolean;
  chartView: 'weekly' | 'monthly';
  weeklyData: FocusActivityItem[];
  monthlyData: FocusActivityItem[];
  onChartViewChange: (view: 'weekly' | 'monthly') => void;
  onRequirePro: () => void;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatHoursMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function getFormattedDateTitle(item: FocusActivityItem): string {
  if (!item?.dateStr) return item?.label || '';
  const parts = item.dateStr.split('-');
  if (parts.length !== 3) return item.label || '';
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, monthIndex, day);
  const dayName = WEEKDAY_NAMES[d.getDay()] || '';
  const monthName = MONTH_NAMES[monthIndex] || '';
  return `${dayName}, ${monthName} ${day}`;
}

export default function FocusActivityCard({
  isDarkMode,
  isPro,
  chartView,
  weeklyData,
  monthlyData,
  onChartViewChange,
  onRequirePro,
}: FocusActivityCardProps) {
  // Strict rule: selectedBarIndex starts null (NO popup by default)
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [chartAreaWidth, setChartAreaWidth] = useState<number>(310);

  const currentData = chartView === 'weekly' ? weeklyData : monthlyData;
  const isMonth = chartView === 'monthly';

  // Find index of today's bar
  const todayIndex = currentData.findIndex((d) => d.isToday);
  const fallbackTodayIndex = todayIndex >= 0 ? todayIndex : currentData.length - 1;

  // Highlighted bar (selected bar if tapped, otherwise today's bar for accent color only)
  const activeIndex = selectedBarIndex !== null ? selectedBarIndex : fallbackTodayIndex;

  const handleToggleChange = (val: string) => {
    if (val === 'monthly' && !isPro) {
      onRequirePro();
      return;
    }
    setSelectedBarIndex(null);
    onChartViewChange(val as 'weekly' | 'monthly');
  };

  const handleBarPress = (index: number) => {
    try {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore if haptics unavailable
    }
    // Toggle pop-up if already selected, otherwise select
    setSelectedBarIndex((prev) => (prev === index ? null : index));
  };

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setChartAreaWidth(width);
    }
  };

  // Find max minutes for scaling
  const maxMinutes = Math.max(
    60,
    ...currentData.map((d) => (d.focusMinutes || 0) + (d.breakMinutes || 0))
  );

  const MAX_BAR_HEIGHT = 115;
  const MIN_BAR_HEIGHT = 24; // Subtle baseline pill height for 0m days (~22-26px)
  const POPUP_WIDTH = 175;

  // Popup horizontal clamp calculations
  let popupLeft = 0;
  if (selectedBarIndex !== null && currentData.length > 0) {
    const colWidth = chartAreaWidth / currentData.length;
    const barCenterX = (selectedBarIndex + 0.5) * colWidth;

    if (barCenterX + 10 + POPUP_WIDTH <= chartAreaWidth) {
      popupLeft = barCenterX + 10;
    } else if (barCenterX - 10 - POPUP_WIDTH >= 0) {
      popupLeft = barCenterX - 10 - POPUP_WIDTH;
    } else {
      popupLeft = Math.max(0, Math.min(chartAreaWidth - POPUP_WIDTH, barCenterX - POPUP_WIDTH / 2));
    }
  }

  const selectedItem = selectedBarIndex !== null ? currentData[selectedBarIndex] : null;

  return (
    <Pressable
      style={[styles.card, isDarkMode ? styles.cardDark : styles.cardLight]}
      onPress={() => setSelectedBarIndex(null)}
    >
      {/* Light Mode Rich Warm Burnt-Orange / Tangerine Jewel-Tone Base */}
      {!isDarkMode && (
        <LinearGradient
          colors={['#9A3412', '#C2410C', '#EA580C', '#F97316']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Top-Left Ambient Feathered Radial Glow */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none" width="100%" height="100%">
        <Defs>
          {isDarkMode ? (
            <RadialGradient id="cornerGlow" cx="4%" cy="4%" r="72%" fx="0%" fy="0%">
              <Stop offset="0%" stopColor="#FFF0DB" stopOpacity="0.72" />
              <Stop offset="16%" stopColor="#FF8533" stopOpacity="0.52" />
              <Stop offset="38%" stopColor="#EA580C" stopOpacity="0.24" />
              <Stop offset="65%" stopColor="#7C2D12" stopOpacity="0.07" />
              <Stop offset="100%" stopColor="#0D1018" stopOpacity="0" />
            </RadialGradient>
          ) : (
            <RadialGradient id="cornerGlow" cx="4%" cy="4%" r="72%" fx="0%" fy="0%">
              <Stop offset="0%" stopColor="#FED7AA" stopOpacity="0.65" />
              <Stop offset="32%" stopColor="#FDBA74" stopOpacity="0.34" />
              <Stop offset="72%" stopColor="#F97316" stopOpacity="0" />
            </RadialGradient>
          )}
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cornerGlow)" />
      </Svg>

      {/* Header: Title on Left, Segmented Pill Toggle on Right */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode ? styles.titleDark : styles.titleLight]}>
          Focus Activity
        </Text>
        <SegmentedToggle
          size="compact"
          isDarkMode={isDarkMode}
          activeValue={chartView}
          onChange={handleToggleChange}
          trackBgColor={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.18)'}
          trackBorderColor={isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.28)'}
          activePillColor={isDarkMode ? '#FF6B1A' : '#FFFFFF'}
          activeTextColorOverride={isDarkMode ? '#FFFFFF' : '#C2410C'}
          inactiveTextColorOverride={isDarkMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.86)'}
          options={[
            { label: 'This Week', value: 'weekly' },
            { label: 'This Month', value: 'monthly', locked: !isPro },
          ]}
        />
      </View>

      {/* Chart Canvas Area */}
      <View style={styles.chartCanvas}>
        {/* Floating Activity Pop-Up Card (Only visible when user taps a bar) */}
        {selectedItem && (
          <Pressable
            style={[
              styles.popupCard,
              isDarkMode ? styles.popupDark : styles.popupLight,
              { left: popupLeft, top: 4 },
            ]}
            onPress={() => setSelectedBarIndex(null)}
          >
            <Text
              style={[styles.popupTitle, isDarkMode ? styles.popupTitleDark : styles.popupTitleLight]}
              numberOfLines={1}
            >
              {getFormattedDateTitle(selectedItem)}
            </Text>
            <View style={styles.popupRow}>
              <Text style={[styles.popupLabel, isDarkMode ? styles.popupLabelDark : styles.popupLabelLight]}>
                Focus Time
              </Text>
              <Text style={[styles.popupValue, isDarkMode ? styles.popupValueDark : styles.popupValueLight]}>
                {formatHoursMinutes(selectedItem.focusMinutes)}
              </Text>
            </View>
            <View style={styles.popupRow}>
              <Text style={[styles.popupLabel, isDarkMode ? styles.popupLabelDark : styles.popupLabelLight]}>
                Break Time
              </Text>
              <Text style={[styles.popupValue, isDarkMode ? styles.popupValueDark : styles.popupValueLight]}>
                {formatHoursMinutes(selectedItem.breakMinutes)}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Vertical Bars Row */}
        <View style={styles.barsContainer} onLayout={handleContainerLayout}>
          <View style={styles.barsRow}>
            {currentData.map((item, idx) => {
              const isSelected = selectedBarIndex === idx;
              const isActive = idx === activeIndex;
              const focusM = item.focusMinutes || 0;
              const breakM = item.breakMinutes || 0;
              const totalM = focusM + breakM;

              const barBorderRadius = isMonth ? 3.5 : 9;
              const barWidth = isMonth ? 5.5 : 28;

              // Calculate combined bar height (focusMinutes + breakMinutes)
              const totalBarHeight =
                totalM > 0
                  ? Math.min(
                      MAX_BAR_HEIGHT,
                      MIN_BAR_HEIGHT + ((totalM / maxMinutes) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT))
                    )
                  : MIN_BAR_HEIGHT;

              return (
                <TouchableOpacity
                  key={`bar-col-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => handleBarPress(idx)}
                  style={styles.barCol}
                >
                  <View
                    style={[
                      styles.barWrapper,
                      {
                        width: barWidth,
                        height: totalBarHeight,
                        borderTopLeftRadius: barBorderRadius,
                        borderTopRightRadius: barBorderRadius,
                      },
                    ]}
                  >
                    {/* Selected Bar Top Crest Node (Circular Indicator Dot — ONLY when tapped) */}
                    {isSelected && (
                      <View
                        style={[
                          styles.activeNode,
                          isMonth && styles.activeNodeMonth,
                        ]}
                        pointerEvents="none"
                      >
                        <View
                          style={[
                            styles.activeInnerDot,
                            isMonth && styles.activeInnerDotMonth,
                          ]}
                        />
                      </View>
                    )}

                    {/* Clipped Bar Container (smooth rounded top corners, zero horizontal line) */}
                    <View
                      style={[
                        styles.barClipContainer,
                        {
                          borderTopLeftRadius: barBorderRadius,
                          borderTopRightRadius: barBorderRadius,
                        },
                      ]}
                    >
                      {/* Selected Bar Vertical Center Hairline (ONLY when tapped) */}
                      {isSelected && (
                        <View
                          style={[
                            styles.activeHairline,
                            !isDarkMode && { backgroundColor: 'rgba(194, 65, 12, 0.55)' },
                          ]}
                          pointerEvents="none"
                        />
                      )}

                      {/* Single Seamless Continuous Bar */}
                      <LinearGradient
                        colors={
                          totalM === 0
                            ? isSelected
                              ? isDarkMode
                                ? ['#FF8A3D', '#FF5E14', '#4A200D', '#181B24']
                                : ['#FFFFFF', 'rgba(255, 255, 255, 0.88)']
                              : isActive
                              ? isDarkMode
                                ? ['#FF8A3D', '#FF5E14', '#4A200D', '#181B24']
                                : ['#FEF3C7', '#FDE68A']
                              : isDarkMode
                              ? ['#2D323F', '#131620']
                              : ['rgba(255, 255, 255, 0.26)', 'rgba(255, 255, 255, 0.12)']
                            : isSelected
                            ? isDarkMode
                              ? ['#FF8A3D', '#FF5E14', '#4A200D', '#181B24']
                              : ['#FFFFFF', 'rgba(255, 255, 255, 0.88)']
                            : isActive
                            ? isDarkMode
                              ? ['#FF8A3D', '#FF5E14', '#4A200D', '#181B24']
                              : ['#FEF3C7', '#FDE68A']
                            : isDarkMode
                            ? ['#3E4352', '#262A35', '#131620']
                            : ['rgba(255, 255, 255, 0.88)', 'rgba(255, 255, 255, 0.65)']
                        }
                        locations={
                          isDarkMode
                            ? isActive
                              ? [0, 0.45, 0.82, 1]
                              : totalM > 0
                              ? [0, 0.5, 1]
                              : undefined
                            : undefined
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.fullSegment}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Subtle Horizontal Baseline Divider */}
          <View
            style={[
              styles.baselineDivider,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.10)'
                  : 'rgba(255, 255, 255, 0.24)',
              },
            ]}
          />

          {/* X-Axis Day Labels Row */}
          <View style={styles.labelsRow}>
            {currentData.map((item, idx) => {
              const isActive = idx === activeIndex;

              if (isMonth) {
                const day = item.dayNum || idx + 1;
                const activeDay = (currentData[activeIndex]?.dayNum) || (activeIndex + 1);
                // Markers along baseline: 1, 5, 10, 15, 20, 25, 30 or active day
                const isMilestone =
                  day === 1 ||
                  day === 5 ||
                  day === 10 ||
                  day === 15 ||
                  day === 20 ||
                  day === 25 ||
                  day === currentData.length;

                // Don't show adjacent milestone if right next to active day to prevent label crowding
                const showMarker = isActive || (isMilestone && Math.abs(day - activeDay) > 1);

                return (
                  <View key={`lbl-col-${idx}`} style={styles.labelCol}>
                    {showMarker ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.monthLabel,
                          isDarkMode ? styles.labelMutedDark : styles.labelMutedLight,
                          isActive && (isDarkMode ? styles.labelActive : styles.labelActiveLight),
                        ]}
                      >
                        {day}
                      </Text>
                    ) : (
                      <View style={styles.monthMarkerPlaceholder} />
                    )}
                  </View>
                );
              }

              return (
                <View key={`lbl-col-${idx}`} style={styles.labelCol}>
                  <Text
                    style={[
                      styles.weekLabel,
                      isDarkMode ? styles.labelMutedDark : styles.labelMutedLight,
                      isActive && (isDarkMode ? styles.labelActive : styles.labelActiveLight),
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#0D1018',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 190, 120, 0.45)',
    borderLeftColor: 'rgba(255, 190, 120, 0.45)',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardLight: {
    backgroundColor: '#C2410C',
    borderColor: 'rgba(254, 215, 170, 0.48)',
    shadowColor: '#9A3412',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  titleLight: {
    color: '#FFFFFF',
  },
  chartCanvas: {
    position: 'relative',
  },
  popupCard: {
    position: 'absolute',
    width: 175,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    zIndex: 50,
  },
  popupDark: {
    backgroundColor: 'rgba(28, 33, 46, 0.96)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  popupLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    shadowColor: '#0A1530',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  popupTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  popupTitleDark: {
    color: '#FFFFFF',
  },
  popupTitleLight: {
    color: '#0A1530',
  },
  popupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2.5,
  },
  popupLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  popupLabelDark: {
    color: 'rgba(255, 255, 255, 0.60)',
  },
  popupLabelLight: {
    color: '#64748B',
  },
  popupValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  popupValueDark: {
    color: '#FFFFFF',
  },
  popupValueLight: {
    color: '#0A1530',
  },
  barsContainer: {
    width: '100%',
    paddingTop: 16,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 125,
    width: '100%',
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
    position: 'relative',
  },
  fullSegment: {
    width: '100%',
    height: '100%',
  },
  barClipContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  activeNode: {
    position: 'absolute',
    top: -7.5,
    left: '50%',
    marginLeft: -7.5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 5,
  },
  activeNodeMonth: {
    top: -5,
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B1A',
  },
  activeInnerDotMonth: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B1A',
  },
  activeHairline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    marginLeft: -0.5,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 5,
  },
  baselineDivider: {
    height: 1,
    width: '100%',
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  labelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    width: 22,
    marginLeft: -5,
  },
  monthMarkerPlaceholder: {
    height: 13,
  },
  labelMutedDark: {
    color: '#8E95A9',
  },
  labelMutedLight: {
    color: 'rgba(255, 255, 255, 0.82)',
  },
  labelActive: {
    color: '#FF6B1A',
    fontWeight: '800',
  },
  labelActiveLight: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
