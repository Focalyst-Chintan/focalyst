import React, { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { CHAPTER_COUNT } from '../steps';
import { GUTTER, useOnboardingTheme } from './theme';

// Section 3.2: the shell around every onboarding screen.

const TOP_BAR_HEIGHT = 52;

// ─── Top bar ───────────────────────────────────────────────────────────────────

function ProgressSegment({ fill }: { fill: number }) {
  const t = useOnboardingTheme();
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(fill);
  useEffect(() => {
    value.value = reduceMotion ? withTiming(fill, { duration: 120 }) : withSpring(fill, { damping: 18, stiffness: 140 });
  }, [fill, reduceMotion, value]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));
  return (
    <View style={[styles.segment, { backgroundColor: t.surfaceStrong }]}>
      <Animated.View style={[styles.segmentFill, fillStyle]}>
        <LinearGradient colors={t.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

export function OnboardingTopBar({
  chapter,
  chapterProgress,
  onBack,
}: {
  chapter: number;
  chapterProgress: number;
  /** null hides the back button */
  onBack: (() => void) | null;
}) {
  const t = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { marginTop: insets.top + 8 }]}>
      <View style={styles.backSlot}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={6}
            style={({ pressed }) => [
              styles.back,
              { backgroundColor: t.surface, borderColor: t.surfaceBorder, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ChevronLeft size={22} color={t.ink} />
          </Pressable>
        )}
      </View>
      <View
        style={styles.progress}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Part ${chapter + 1} of ${CHAPTER_COUNT}`}
      >
        {Array.from({ length: CHAPTER_COUNT }, (_, i) => (
          <ProgressSegment key={i} fill={i < chapter ? 1 : i === chapter ? chapterProgress : 0} />
        ))}
      </View>
      <View style={styles.backSlot} />
    </View>
  );
}

// ─── Step transition (forward from the right, back from the left, 280 ms) ──────

export function StepTransition({ direction, children }: { direction: 1 | -1; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const dx = reduceMotion ? 0 : direction * 48;
  const duration = reduceMotion ? 120 : 280;
  const entering = () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateX: dx }] },
      animations: {
        opacity: withTiming(1, { duration }),
        transform: [{ translateX: withTiming(0, { duration }) }],
      },
    };
  };
  return (
    <Animated.View style={styles.flex} entering={entering}>
      {children}
    </Animated.View>
  );
}

// ─── Step layout: scrolling content plus the pinned (or inline) footer ─────────

export function StepLayout({
  children,
  footer,
  footerInline = false,
  centered = false,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Input screens: the button sits directly under the field so the keyboard never covers it. */
  footerInline?: boolean;
  /** Statement screens centre their content. */
  centered?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 16;
  const pinned = !footerInline && !!footer;

  const scroll = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        centered && styles.centered,
        footerInline && { paddingBottom: bottomPad },
        // Keep resting content clear of the 32 pt fade.
        !footerInline && footer ? { paddingBottom: 36 } : null,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
      {footerInline && footer ? <View style={styles.inlineFooter}>{footer}</View> : null}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {pinned ? (
        // The content itself fades out above the pinned button, so the ambient background behind
        // it shows through untouched (painting a canvas-coloured fade left a visible band).
        <MaskedView
          style={styles.flex}
          maskElement={
            <View style={styles.flex}>
              <View style={[styles.flex, styles.maskSolid]} />
              <LinearGradient colors={['#000000', 'rgba(0,0,0,0)']} style={styles.maskFade} />
            </View>
          }
        >
          {scroll}
        </MaskedView>
      ) : (
        scroll
      )}
      {pinned ? <View style={[styles.footer, { paddingBottom: bottomPad }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER - 4,
    gap: 12,
  },
  backSlot: { width: 44, height: 44 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: 4, borderRadius: 2, overflow: 'hidden' },
  content: { flexGrow: 1, paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 24 },
  centered: { justifyContent: 'center' },
  inlineFooter: { marginTop: 24 },
  footer: { paddingHorizontal: GUTTER, paddingTop: 8 },
  maskSolid: { backgroundColor: '#000000' },
  maskFade: { height: 32 },
});
