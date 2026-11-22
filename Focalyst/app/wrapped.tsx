import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import {
  SAMPLE_WRAPPED_PAYLOAD,
  fetchYearWrapped,
  hasMeaningfulWrappedActivity,
  type WrappedPayload,
} from '../src/services/wrappedService';
import { WrappedCardView } from '../src/components/wrapped/WrappedCardView';
import {
  WRAPPED_CANVAS_BG,
  WRAPPED_POSTER_THEMES,
  type WrappedCardKind,
} from '../src/components/wrapped/wrappedThemes';
import { WrappedGradientCanvas } from '../src/components/wrapped/WrappedGradientCanvas';
import { useHideDevFab } from '../src/blocking/devFab';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDE_DURATION_MS = 6500;

function buildCardSequence(payload: WrappedPayload): WrappedCardKind[] {
  const cards: WrappedCardKind[] = ['intro'];
  if (payload.focus.totalMinutes > 0 || payload.focus.sessionsCount > 0) {
    cards.push('focus');
  }
  if (payload.tasks.completedCount > 0) {
    cards.push('tasks');
  }
  if (payload.habits.totalLogs > 0) {
    cards.push('habits');
  }
  if (payload.voice.totalWords > 0 || payload.voice.notesCount > 0 || payload.ai.totalPrompts > 0) {
    cards.push('voice_ai');
  }
  if (payload.blocker.shieldedMinutes > 0 || payload.blocker.deflectedAttempts > 0) {
    cards.push('blocker');
  }
  cards.push('victory');
  return cards;
}

export default function WrappedScreen() {
  useHideDevFab(true);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ year?: string; preview?: string }>();
  const year = Number(params.year) || 2026;
  const preview = params.preview !== 'false';

  const [loading, setLoading] = useState(true);
  const [livePayload, setLivePayload] = useState<WrappedPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [useSample, setUseSample] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const cardContainerRef = useRef<View>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressValueRef = useRef(0);
  const holdStartMsRef = useRef<number>(0);

  const loadWrapped = useCallback(async () => {
    setLoading(true);
    setStatusMessage(null);
    const result = await fetchYearWrapped({ year, preview });
    if (result.status === 'ready') {
      const payload = result.data.payload;
      setLivePayload(payload);
      if (!hasMeaningfulWrappedActivity(payload)) {
        setStatusMessage('Your account has zero recorded activity for this year yet.');
      }
      setUseSample(false);
    } else {
      setLivePayload(null);
      setStatusMessage(result.message);
    }
    setCardIndex(0);
    setLoading(false);
  }, [preview, year]);

  useEffect(() => {
    void loadWrapped();
  }, [loadWrapped]);

  const activePayload = useSample ? SAMPLE_WRAPPED_PAYLOAD : livePayload;
  const cards = useMemo(
    () => (activePayload ? buildCardSequence(activePayload) : []),
    [activePayload]
  );

  const clampedIndex = Math.min(cardIndex, Math.max(0, cards.length - 1));
  const currentCard = cards[clampedIndex];

  const goNext = useCallback(() => {
    if (clampedIndex < cards.length - 1) {
      Haptics.selectionAsync().catch(() => {});
      setCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
    }
  }, [cards.length, clampedIndex]);

  const goPrev = useCallback(() => {
    if (clampedIndex > 0) {
      Haptics.selectionAsync().catch(() => {});
      setCardIndex((prev) => Math.max(0, prev - 1));
    }
  }, [clampedIndex]);

  // Reset progress when slide or data source changes
  useEffect(() => {
    progressAnim.setValue(0);
    progressValueRef.current = 0;
  }, [clampedIndex, useSample, activePayload, progressAnim]);

  // Auto-advance 6.5s story timer with press-and-hold pause
  useEffect(() => {
    if (!activePayload || cards.length === 0) return;

    const subId = progressAnim.addListener(({ value }) => {
      progressValueRef.current = value;
    });

    const isPaused = isHolding || saving || sharing || isExporting;
    const isLastCard = clampedIndex >= cards.length - 1;

    if (isPaused) {
      progressAnim.stopAnimation();
      return () => {
        progressAnim.removeListener(subId);
      };
    }

    if (isLastCard) {
      progressAnim.setValue(1);
      return () => {
        progressAnim.removeListener(subId);
      };
    }

    const remaining = Math.max(100, (1 - progressValueRef.current) * SLIDE_DURATION_MS);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remaining,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (finished) {
        setCardIndex((prev) => Math.min(cards.length - 1, prev + 1));
      }
    });

    return () => {
      anim.stop();
      progressAnim.removeListener(subId);
    };
  }, [
    activePayload,
    cards.length,
    clampedIndex,
    isHolding,
    saving,
    sharing,
    isExporting,
    progressAnim,
  ]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -45) {
            goNext();
          } else if (gesture.dx > 45) {
            goPrev();
          }
        },
      }),
    [goNext, goPrev]
  );

  const capturePosterPng = async (): Promise<string> => {
    if (!cardContainerRef.current) {
      throw new Error('Poster view is not ready yet.');
    }
    setIsExporting(true);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    try {
      return await captureRef(cardContainerRef, {
        format: 'png',
        quality: 1,
        width: Math.round(SCREEN_WIDTH * 3),
        height: Math.round(SCREEN_HEIGHT * 3),
        result: 'tmpfile',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveCard = async () => {
    if (saving || sharing) return;
    setSaving(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo permission needed',
          'Allow Focalyst to save Wrapped posters to your camera roll.'
        );
        return;
      }
      const uri = await capturePosterPng();
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved', 'Wrapped poster saved to your camera roll.');
    } catch (err: unknown) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Unable to save poster image.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleShareCard = async () => {
    if (saving || sharing) return;
    setSharing(true);
    try {
      const uri = await capturePosterPng();
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'System sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Share your ${year} Focalyst Wrapped`,
      });
    } catch (err: unknown) {
      Alert.alert(
        'Could not share',
        err instanceof Error ? err.message : 'Unable to capture card image.'
      );
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar style="light" />
        <WrappedGradientCanvas theme={WRAPPED_POSTER_THEMES.intro} idPrefix="loading" />
        <ActivityIndicator size="large" color="#3DC8FF" />
        <Text style={styles.stateTitle}>Compiling {year} Wrapped…</Text>
      </View>
    );
  }

  if (!activePayload) {
    return (
      <View
        style={[
          styles.stateContainer,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <StatusBar style="light" />
        <WrappedGradientCanvas theme={WRAPPED_POSTER_THEMES.intro} idPrefix="empty" />

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeFloating, { top: insets.top + 16 }]}
          accessibilityLabel="Close Wrapped"
        >
          <Ionicons name="close" size={20} color="#F8FAFC" />
        </TouchableOpacity>

        <Text style={styles.emptyYear}>{year}</Text>
        <Text style={styles.stateTitle}>Year in Review</Text>
        <Text style={styles.stateBody}>
          {statusMessage || 'Wrapped is not available yet for this account.'}
        </Text>

        <View style={styles.stateActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setUseSample(true);
              setCardIndex(0);
            }}
          >
            <Text style={styles.primaryBtnText}>Preview Sample Story</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={loadWrapped}>
            <Text style={styles.secondaryBtnText}>Retry Live Fetch</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* 1. Separate Interactive Modal Header (above poster canvas) */}
      <View style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.progressRow}>
          {cards.map((c, idx) => {
            const isPast = idx < clampedIndex;
            const isActive = idx === clampedIndex;
            return (
              <View key={c} style={styles.progressTrack}>
                {isPast ? (
                  <View style={[styles.progressFill, { width: '100%' }]} />
                ) : isActive ? (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.headerBrand}>{year} WRAPPED</Text>

          <View style={styles.headerActions}>
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.modePill, useSample && styles.modePillSample]}
                onPress={() => {
                  if (useSample && livePayload) {
                    setUseSample(false);
                  } else {
                    setUseSample((prev) => !prev);
                  }
                  setCardIndex(0);
                }}
              >
                <Text style={[styles.modePillText, useSample && styles.modePillTextSample]}>
                  {useSample ? 'SAMPLE' : 'LIVE'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
              accessibilityLabel="Close Wrapped"
            >
              <Ionicons name="close" size={18} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Middle Poster Capture Area (clean export target + tap/swipe/hold zones) */}
      <View style={styles.posterStage} {...panResponder.panHandlers}>
        <View ref={cardContainerRef} collapsable={false} style={styles.captureFrame}>
          <WrappedCardView
            kind={currentCard}
            payload={activePayload}
            animateKey={`${currentCard}-${clampedIndex}-${useSample ? 's' : 'l'}`}
            forceComplete={isExporting}
          />
        </View>

        <View style={styles.tapOverlay} pointerEvents="box-none">
          <Pressable
            style={styles.tapLeft}
            onPressIn={() => {
              holdStartMsRef.current = Date.now();
              setIsHolding(true);
            }}
            onPressOut={() => {
              setIsHolding(false);
              if (Date.now() - holdStartMsRef.current < 260) {
                goPrev();
              }
            }}
            accessibilityLabel="Previous card"
          />
          <Pressable
            style={styles.tapRight}
            onPressIn={() => {
              holdStartMsRef.current = Date.now();
              setIsHolding(true);
            }}
            onPressOut={() => {
              setIsHolding(false);
              if (Date.now() - holdStartMsRef.current < 260) {
                goNext();
              }
            }}
            accessibilityLabel="Next card"
          />
        </View>
      </View>

      {/* 3. Separate Bottom Action & Navigation Bar (never swallowed by tapOverlay) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <TouchableOpacity
          style={[styles.navIconBtn, clampedIndex === 0 && styles.navBtnDisabled]}
          onPress={goPrev}
          disabled={clampedIndex === 0}
          accessibilityLabel="Previous"
        >
          <Ionicons name="chevron-back" size={18} color="#F8FAFC" />
        </TouchableOpacity>

        <View style={styles.actionCluster}>
          <TouchableOpacity
            style={styles.ghostActionBtn}
            onPress={handleSaveCard}
            disabled={saving || sharing}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#F8FAFC" />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color="#F8FAFC" />
                <Text style={styles.ghostActionText}>Save</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleShareCard}
            disabled={saving || sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#020307" />
            ) : (
              <>
                <Ionicons name="share-outline" size={16} color="#020307" />
                <Text style={styles.primaryActionText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.navIconBtn, clampedIndex === cards.length - 1 && styles.navBtnDisabled]}
          onPress={goNext}
          disabled={clampedIndex === cards.length - 1}
          accessibilityLabel="Next"
        >
          <Ionicons name="chevron-forward" size={18} color="#F8FAFC" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WRAPPED_CANVAS_BG,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: WRAPPED_CANVAS_BG,
    zIndex: 10,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 5,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBrand: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: 'rgba(226, 232, 240, 0.72)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  modePillSample: {
    backgroundColor: 'rgba(255, 172, 56, 0.16)',
    borderColor: 'rgba(255, 172, 56, 0.42)',
  },
  modePillText: {
    fontFamily: 'Inter_700Bold',
    color: '#E2E8F0',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  modePillTextSample: {
    color: '#FFAC38',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterStage: {
    flex: 1,
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  captureFrame: {
    flex: 1,
  },
  tapOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  tapLeft: {
    width: SCREEN_WIDTH * 0.3,
    height: '100%',
  },
  tapRight: {
    flex: 1,
    height: '100%',
  },
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WRAPPED_CANVAS_BG,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  actionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ghostActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ghostActionText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#F8FAFC',
    fontSize: 13,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
  },
  primaryActionText: {
    fontFamily: 'Inter_700Bold',
    color: '#020307',
    fontSize: 13,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: WRAPPED_CANVAS_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  closeFloating: {
    position: 'absolute',
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyYear: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 56,
    letterSpacing: -2,
    color: 'rgba(248, 250, 252, 0.9)',
  },
  stateTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  stateBody: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(148, 163, 184, 0.9)',
    textAlign: 'center',
    maxWidth: 300,
  },
  stateActions: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    borderRadius: 999,
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    color: '#020307',
    fontSize: 14,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#E2E8F0',
    fontSize: 14,
  },
});
