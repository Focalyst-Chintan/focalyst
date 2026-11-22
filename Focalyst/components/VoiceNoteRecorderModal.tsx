import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  StyleSheet,
  Modal,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Path,
} from 'react-native-svg';
import { useColumnStyle } from '../src/layout/adaptive';
import { useVoiceNoteRecorder } from '../src/services/VoiceNoteContext';

const UPCOMING_DOT_COUNT = 17;

interface TactileKeyProps {
  onPress: () => void;
  disabled?: boolean;
  isDark: boolean;
  variant?: 'neutral' | 'crimson';
  children: React.ReactNode;
}

const TactileKey: React.FC<TactileKeyProps> = ({
  onPress,
  disabled = false,
  isDark,
  variant = 'neutral',
  children,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const isCrimson = variant === 'crimson';

  return (
    <Animated.View style={[styles.tactileKeyOuter, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.tactileKeyBase,
          isCrimson
            ? styles.tactileKeyCrimsonBorder
            : {
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                backgroundColor: isDark ? '#181D2A' : '#FFFFFF',
                ...(isDark
                  ? {}
                  : {
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      elevation: 2,
                    }),
              },
        ]}
      >
        {isCrimson ? (
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : isDark ? (
          <LinearGradient
            colors={['#23293A', '#141824']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        {/* Subtle inner top rim highlight */}
        <View
          pointerEvents="none"
          style={[
            styles.tactileKeyTopRim,
            {
              backgroundColor: isCrimson
                ? 'rgba(252, 165, 165, 0.4)'
                : isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.9)',
            },
          ]}
        />
        {children}
      </Pressable>
    </Animated.View>
  );
};

interface VoiceNoteRecorderModalProps {
  isDarkMode?: boolean;
}

export const VoiceNoteRecorderModal: React.FC<VoiceNoteRecorderModalProps> = ({ isDarkMode: propDarkMode }) => {
  const {
    visible,
    isRecording,
    isPaused,
    isProcessing,
    permissionDenied,
    seconds,
    liveTranscript,
    statusMessage,
    waveformSamples,
    retryPermissionsAndStart,
    openSettings,
    togglePause,
    discardRecording,
    stopAndSaveRecording,
  } = useVoiceNoteRecorder();

  const colorScheme = useColorScheme();
  const isDark = propDarkMode !== undefined ? propDarkMode : colorScheme !== 'light';
  const column = useColumnStyle();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const heroHeight = Math.round(screenHeight * 0.45);
  const [heroSize, setHeroSize] = React.useState({
    width: Dimensions.get('window').width,
    height: heroHeight,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  if (!visible) return null;

  const handleDiscard = () => {
    void discardRecording();
  };

  const handleTogglePause = () => {
    void togglePause();
  };

  const handleStopAndSave = () => {
    void stopAndSaveRecording();
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const heroW = Math.max(heroSize.width, 1);
  const heroH = Math.max(heroSize.height, 64);

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible}>
      <View
        style={[
          styles.screenCanvas,
          { backgroundColor: isDark ? '#06080F' : '#F3F6FB' },
        ]}
      >
        <View style={[styles.container, column]}>
          {/* TOP HERO RECORDER PANEL: Full-Bleed Behind Status Bar */}
          <View
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (
                Math.abs(width - heroSize.width) > 1 ||
                Math.abs(height - heroSize.height) > 1
              ) {
                setHeroSize({ width, height });
              }
            }}
            style={[
              styles.topCard,
              {
                minHeight: heroHeight,
                marginTop: isDark ? 0 : insets.top + 8,
                paddingTop: isDark ? insets.top + 10 : 16,
                paddingBottom: 28,
                paddingHorizontal: 16,
                backgroundColor: isDark ? '#06080F' : '#050814',
                borderTopLeftRadius: isDark ? 0 : 24,
                borderTopRightRadius: isDark ? 0 : 24,
              },
            ]}
          >
            {/* Seamless Obsidian-to-Cobalt Backlit Radial Glow + Bottom Specular Rim */}
            <Svg
              width={heroW}
              height={heroH}
              viewBox={`0 0 ${heroW} ${heroH}`}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient
                  id="voiceHeroGlow"
                  cx="50%"
                  cy="105%"
                  rx="78%"
                  ry="68%"
                >
                  <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.82} />
                  <Stop offset="28%" stopColor="#1951FC" stopOpacity={0.62} />
                  <Stop offset="58%" stopColor="#0B2CB1" stopOpacity={0.28} />
                  <Stop
                    offset="100%"
                    stopColor={isDark ? '#06080F' : '#050814'}
                    stopOpacity={0}
                  />
                </RadialGradient>
                <SvgLinearGradient id="voiceBottomRim" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0} />
                  <Stop offset="22%" stopColor="#93C5FD" stopOpacity={0.55} />
                  <Stop offset="50%" stopColor="#CBE9FD" stopOpacity={0.95} />
                  <Stop offset="78%" stopColor="#93C5FD" stopOpacity={0.55} />
                  <Stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                </SvgLinearGradient>
              </Defs>
              <Rect x={0} y={0} width={heroW} height={heroH} fill="url(#voiceHeroGlow)" />
              <Path
                d={`M 0 ${heroH - 24} A 24 24 0 0 0 24 ${heroH - 1} L ${heroW - 24} ${
                  heroH - 1
                } A 24 24 0 0 0 ${heroW} ${heroH - 24}`}
                stroke="url(#voiceBottomRim)"
                strokeWidth={1.75}
                fill="none"
              />
            </Svg>

            {/* Top Bar Row */}
            <View style={[styles.topBarRow, { zIndex: 2 }]}>
              <TouchableOpacity
                onPress={handleDiscard}
                style={styles.backCircle}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.recordingBadge}>
                <View
                  style={[
                    styles.redDot,
                    { opacity: !isRecording || isPaused ? 0.4 : 1 },
                  ]}
                />
                <Text style={styles.recordingBadgeText}>
                  {isProcessing
                    ? 'PROCESSING'
                    : isPaused
                    ? 'PAUSED'
                    : isRecording
                    ? 'NOW RECORDING'
                    : 'RECORDING STOPPED'}
                </Text>
              </View>

              <View style={styles.topBarSpacer} />
            </View>

            {/* Title, Subtitle & Hero Timer */}
            <View style={[styles.heroCenterBlock, { zIndex: 2 }]}>
              <Text style={styles.sessionTitle}>Voice Note Session</Text>
              <Text style={styles.sessionSubtitle}>High Accuracy • 44.1 kHz</Text>
              <Text style={styles.timerText}>{formatTime(seconds)}</Text>
            </View>

            {/* Studio Scrolling Voice Waveform */}
            <View style={[styles.waveformContainer, { zIndex: 2 }]}>
              {/* Left Half: High-Density Live Scrolling Amplitude Bars */}
              <View style={styles.waveformLeftTrack}>
                {waveformSamples.map((sample, i) => {
                  const barHeight = Math.max(4, Math.min(52, 4 + sample * 48));
                  const barOpacity = i < 5 ? 0.2 + (i / 5) * 0.7 : 0.92;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.waveformBar,
                        {
                          height: barHeight,
                          opacity: barOpacity,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Center Playhead Needle */}
              <View style={styles.playheadNeedleWrapper}>
                <View style={styles.playheadPinhead} />
                <View style={styles.playheadLine} />
              </View>

              {/* Right Half: Minimal Upcoming Track Dots */}
              <View style={styles.waveformRightTrack}>
                {Array.from({ length: UPCOMING_DOT_COUNT }).map((_, i) => (
                  <View key={i} style={styles.upcomingDot} />
                ))}
              </View>
            </View>
          </View>

          {/* MIDDLE TRANSCRIPT CARD (flex: 1 — Fills All Remaining Space) */}
          <View
            style={[
              styles.transcriptCard,
              {
                backgroundColor: isDark ? '#0E131F' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              },
              !isDark && styles.transcriptCardLightShadow,
            ]}
          >
            <View style={styles.transcriptHeader}>
              <View style={styles.transcriptTitleRow}>
                <Text
                  style={[
                    styles.transcriptTitle,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  Transcript
                </Text>
                <View
                  style={[
                    styles.liveBadge,
                    {
                      backgroundColor: isDark
                        ? 'rgba(59, 130, 246, 0.16)'
                        : 'rgba(37, 99, 235, 0.1)',
                      borderColor: isDark
                        ? 'rgba(96, 165, 250, 0.35)'
                        : 'rgba(37, 99, 235, 0.25)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: isDark ? '#60A5FA' : '#2563EB' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveBadgeText,
                      { color: isDark ? '#93C5FD' : '#1D4ED8' },
                    ]}
                  >
                    LIVE
                  </Text>
                </View>
              </View>
              {isProcessing && (
                <ActivityIndicator
                  size="small"
                  color={isDark ? '#60A5FA' : '#2563EB'}
                />
              )}
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptScrollContent}
            >
              {permissionDenied ? (
                <View style={styles.permissionDeniedWrap}>
                  <Text
                    style={[
                      styles.permissionDeniedTitle,
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}
                  >
                    Microphone Permission Required
                  </Text>
                  <Text
                    style={[
                      styles.transcriptPlaceholder,
                      { color: isDark ? '#94A3B8' : '#64748B', fontStyle: 'normal', marginBottom: 14 },
                    ]}
                  >
                    Enable microphone access in iOS Settings to record voice notes.
                  </Text>
                  <View style={styles.permissionButtonsRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={openSettings}
                      style={styles.openSettingsBtn}
                    >
                      <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.openSettingsBtnText}>Open Settings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={retryPermissionsAndStart}
                      style={[
                        styles.retryPermBtn,
                        { borderColor: isDark ? 'rgba(255,255,255,0.16)' : '#CBD5E1' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.retryPermBtnText,
                          { color: isDark ? '#E2E8F0' : '#0F172A' },
                        ]}
                      >
                        Try Again
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : liveTranscript ? (
                <Text
                  style={[
                    styles.transcriptBody,
                    { color: isDark ? '#CBD5E1' : '#475569' },
                  ]}
                >
                  "{liveTranscript}"
                </Text>
              ) : (
                <Text
                  style={[
                    styles.transcriptPlaceholder,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}
                >
                  {statusMessage}
                </Text>
              )}
            </ScrollView>
          </View>

          {/* BOTTOM TACTILE 3-KEY CONTROL DECK */}
          <View
            style={[
              styles.bottomDock,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            {/* Left Key: Discard */}
            <TactileKey onPress={handleDiscard} isDark={isDark} variant="neutral">
              <Ionicons
                name="trash-outline"
                size={21}
                color={isDark ? '#94A3B8' : '#475569'}
              />
              <Text
                style={[
                  styles.dockLabel,
                  { color: isDark ? '#CBD5E1' : '#475569' },
                ]}
              >
                Discard
              </Text>
            </TactileKey>

            {/* Middle Key: Pause / Resume */}
            <TactileKey
              onPress={handleTogglePause}
              disabled={isProcessing}
              isDark={isDark}
              variant="neutral"
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={21}
                color={isDark ? '#93C5FD' : '#1D4ED8'}
              />
              <Text
                style={[
                  styles.dockLabel,
                  { color: isDark ? '#E2E8F0' : '#0F172A' },
                ]}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TactileKey>

            {/* Right Key: Primary Stop / Save Action */}
            <TactileKey
              onPress={handleStopAndSave}
              disabled={isProcessing}
              isDark={isDark}
              variant="crimson"
            >
              <View style={styles.stopEmblemGlow}>
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.whiteStopSquare} />
                )}
              </View>
            </TactileKey>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screenCanvas: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
  },
  topCard: {
    marginHorizontal: 14,
    borderWidth: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    width: 38,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    gap: 7,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  recordingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  heroCenterBlock: {
    alignItems: 'center',
    marginTop: 8,
  },
  sessionTitle: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  sessionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(203, 233, 253, 0.72)',
    marginTop: 4,
    marginBottom: 10,
  },
  timerText: {
    fontSize: 50,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  waveformContainer: {
    width: '100%',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  waveformLeftTrack: {
    flex: 1,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingRight: 3,
  },
  waveformBar: {
    width: 2,
    marginHorizontal: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  playheadNeedleWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 60,
  },
  playheadPinhead: {
    width: 5.5,
    height: 5.5,
    borderRadius: 2.75,
    backgroundColor: '#FFFFFF',
    marginBottom: -1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  playheadLine: {
    width: 1.5,
    height: 55,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 4,
  },
  waveformRightTrack: {
    flex: 1,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    paddingLeft: 6,
    gap: 6,
  },
  upcomingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  transcriptCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
    marginHorizontal: 14,
    marginBottom: 14,
  },
  transcriptCardLightShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  transcriptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptScrollContent: {
    paddingBottom: 6,
  },
  transcriptBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  transcriptPlaceholder: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bottomDock: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    paddingHorizontal: 14,
  },
  tactileKeyOuter: {
    flex: 1,
    height: 82,
  },
  tactileKeyBase: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tactileKeyCrimsonBorder: {
    borderColor: 'rgba(252, 165, 165, 0.4)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  tactileKeyTopRim: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 1,
  },
  stopEmblemGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteStopSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  dockLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  permissionDeniedWrap: {
    paddingVertical: 6,
  },
  permissionDeniedTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  permissionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1951FC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  openSettingsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  retryPermBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  retryPermBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
