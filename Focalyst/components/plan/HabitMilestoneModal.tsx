import React, { useRef, useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Stop, Rect, Polygon } from 'react-native-svg';

export const STREAK_MILESTONES = [5, 7, 10, 25, 30, 45, 60, 75, 90, 100, 150, 175, 200, 250, 300, 365];

interface HabitMilestoneModalProps {
  visible: boolean;
  habit: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    completedDates?: string[];
    [key: string]: any;
  } | null;
  streak: number;
  onClose: () => void;
}

function parseYMDToNoon(ymd: string): Date {
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

export function formatStreakDateRange(
  streakCount: number,
  completedDates?: string[],
  todayYMD?: string
): { dateRangeStr: string; totalDaysStr: string } {
  const today = todayYMD || formatLocalYMD(new Date());
  let endYMD = today;

  if (completedDates && completedDates.length > 0) {
    const sorted = [...completedDates].map((d) => String(d).slice(0, 10)).sort();
    const lastDate = sorted[sorted.length - 1];
    if (lastDate && lastDate <= today) {
      endYMD = lastDate;
    }
  }

  const endDate = parseYMDToNoon(endYMD);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - Math.max(0, streakCount - 1));

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const startFormatted = startDate.toLocaleDateString('en-US', options);
  const endFormatted = endDate.toLocaleDateString('en-US', options);

  return {
    dateRangeStr: `${startFormatted} — ${endFormatted}`,
    totalDaysStr: `Total: ${streakCount} Consecutive Days`,
  };
}

export default function HabitMilestoneModal({
  visible,
  habit,
  streak,
  onClose,
}: HabitMilestoneModalProps) {
  const viewShotRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  // Compute responsive card poster dimensions (9:16 story-friendly proportion)
  const cardWidth = Math.min(SCREEN_WIDTH - 44, 350);
  const cardHeight = Math.min(Math.round(cardWidth * 1.55), SCREEN_HEIGHT - 210);

  const streakNumber = streak || 0;
  const isCentury = streakNumber >= 100;
  const isYear = streakNumber === 365;

  const { dateRangeStr, totalDaysStr } = useMemo(() => {
    return formatStreakDateRange(streakNumber, habit?.completedDates);
  }, [streakNumber, habit?.completedDates]);

  const handleShare = async () => {
    if (sharing || !viewShotRef.current) return;
    try {
      setSharing(true);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }
      const uri = await viewShotRef.current.capture();
      if (uri) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your streak card',
          UTI: 'public.png',
        });
      }
    } catch (err) {
      console.error('Error sharing streak card:', err);
      Alert.alert('Sharing Error', 'Unable to capture or share the streak card. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    if (saving || !viewShotRef.current) return;
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library permission is needed to save your streak card to Photos.'
        );
        return;
      }
      const uri = await viewShotRef.current.capture();
      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Saved!', 'Streak card saved to Photos!');
      }
    } catch (err) {
      console.error('Error saving streak card:', err);
      Alert.alert('Download Error', 'Unable to save the streak card to Photos. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !habit) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Capturable Streak Card Poster (Exported as crisp PNG via ViewShot) */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}
            style={[styles.posterCard, { width: cardWidth, height: cardHeight }]}
          >
            {/* Background SVG: Deep Dark #090202 + Fiery Radial Glow + Geometric Angled Beams */}
            <Svg style={StyleSheet.absoluteFill} width={cardWidth} height={cardHeight}>
              <Defs>
                <RadialGradient
                  id="fireGlow"
                  cx={cardWidth * 0.5}
                  cy={cardHeight * 0.38}
                  rx={cardWidth * 0.65}
                  ry={cardHeight * 0.45}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%" stopColor="#FF4B1F" stopOpacity="0.9" />
                  <Stop offset="32%" stopColor="#D82A0D" stopOpacity="0.6" />
                  <Stop offset="68%" stopColor="#7A110A" stopOpacity="0.32" />
                  <Stop offset="100%" stopColor="#090202" stopOpacity="0" />
                </RadialGradient>

                <RadialGradient
                  id="coreHot"
                  cx={cardWidth * 0.5}
                  cy={cardHeight * 0.36}
                  rx={cardWidth * 0.28}
                  ry={cardHeight * 0.22}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%" stopColor="#FFA439" stopOpacity="0.95" />
                  <Stop offset="45%" stopColor="#FF4B1F" stopOpacity="0.7" />
                  <Stop offset="100%" stopColor="#7A110A" stopOpacity="0" />
                </RadialGradient>
              </Defs>

              {/* Base canvas */}
              <Rect width={cardWidth} height={cardHeight} fill="#090202" />

              {/* Angled geometric light wedges radiating outward behind center number */}
              {/* Left light beams */}
              <Polygon
                points={`0,${cardHeight * 0.12} ${cardWidth * 0.5},${cardHeight * 0.38} 0,${cardHeight * 0.64}`}
                fill="rgba(255, 120, 60, 0.13)"
              />
              <Polygon
                points={`0,${cardHeight * 0.22} ${cardWidth * 0.5},${cardHeight * 0.38} 0,${cardHeight * 0.50}`}
                fill="rgba(255, 180, 80, 0.14)"
              />

              {/* Right light beams */}
              <Polygon
                points={`${cardWidth},${cardHeight * 0.12} ${cardWidth * 0.5},${cardHeight * 0.38} ${cardWidth},${cardHeight * 0.64}`}
                fill="rgba(255, 120, 60, 0.13)"
              />
              <Polygon
                points={`${cardWidth},${cardHeight * 0.22} ${cardWidth * 0.5},${cardHeight * 0.38} ${cardWidth},${cardHeight * 0.50}`}
                fill="rgba(255, 180, 80, 0.14)"
              />

              {/* Central fiery radial glow */}
              <Rect width={cardWidth} height={cardHeight} fill="url(#fireGlow)" />
              <Rect width={cardWidth} height={cardHeight} fill="url(#coreHot)" />
            </Svg>

            {/* Floating Ember Sparks */}
            <View style={[styles.ember, { top: '15%', left: '22%', width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFA726', opacity: 0.8 }]} />
            <View style={[styles.ember, { top: '24%', right: '20%', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFD54F', opacity: 0.85 }]} />
            <View style={[styles.ember, { top: '34%', left: '14%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FF8A65', opacity: 0.65 }]} />
            <View style={[styles.ember, { top: '44%', right: '16%', width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFCA28', opacity: 0.7 }]} />
            <View style={[styles.ember, { top: '18%', right: '35%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FF7043', opacity: 0.6 }]} />

            {/* Poster Inner Content */}
            <View style={styles.posterBody}>
              {/* Top glowing multi-layered flame icon */}
              <View style={styles.flameOuterRing}>
                <View style={styles.flameInnerRing}>
                  <Ionicons name="flame" size={32} color="#FFD166" />
                </View>
              </View>

              {/* Giant Streak Number */}
              <Text
                style={[
                  styles.giantStreakNumber,
                  {
                    fontSize: isCentury ? 108 : 132,
                    lineHeight: isCentury ? 114 : 138,
                  },
                ]}
              >
                {streakNumber}
              </Text>

              {/* Upper Subtitle: DAY STREAK or YEAR STREAK */}
              <Text style={styles.streakSubtitle}>
                {isYear ? 'YEAR STREAK' : 'DAY STREAK'}
              </Text>

              {/* Habit Name */}
              <Text numberOfLines={2} style={styles.habitTitle}>
                {habit.name}
              </Text>

              {/* Glassmorphic Streak Date Span & Total Days Pill */}
              <View style={styles.dateSpanCard}>
                <Text style={styles.dateSpanText}>{dateRangeStr}</Text>
                <Text style={styles.totalDaysText}>{totalDaysStr}</Text>
              </View>

              <View style={{ flex: 1 }} />

              {/* Subtle Brand Watermark */}
              <Text style={styles.watermarkText}>FOCALYST</Text>
            </View>
          </ViewShot>

          {/* Bottom Action Controls (Outside ViewShot: strictly NO weekdays/checks box) */}
          <View style={[styles.controlsContainer, { width: cardWidth }]}>
            {/* Row 1: Share Streak & Download Photo */}
            <View style={styles.shareRow}>
              {/* Share Streak Pill Button */}
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                activeOpacity={0.85}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share Streak</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Download Photo Icon Button */}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
                activeOpacity={0.8}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Row 2: Dark Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  posterCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#090202',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 75, 31, 0.35)',
    shadowColor: '#FF4B1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  posterBody: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  flameOuterRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 75, 31, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  flameInnerRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 107, 0, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giantStreakNumber: {
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(255, 110, 40, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 26,
  },
  streakSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    marginTop: -4,
    marginBottom: 6,
    textAlign: 'center',
  },
  habitTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dateSpanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  dateSpanText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  totalDaysText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFAB91',
    marginTop: 4,
    textAlign: 'center',
  },
  watermarkText: {
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    marginBottom: 4,
  },
  ember: {
    position: 'absolute',
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  controlsContainer: {
    marginTop: 18,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4522',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4522',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  downloadButton: {
    marginLeft: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    marginTop: 12,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#050507',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
