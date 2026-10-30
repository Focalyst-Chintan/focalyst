import React, { useEffect } from 'react';
import { StyleSheet, Text, View, DeviceEventEmitter } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface XpEvent {
  amount: number;
  source: string;
  /** Left pill text; defaults to "+{amount} XP" */
  badge?: string;
  /** Wait for the toast on screen to finish instead of replacing it (used by the MCP bonus) */
  queue?: boolean;
}

export default function XpPopup() {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const [display, setDisplay] = React.useState<XpEvent | null>(null);
  const showingRef = React.useRef(false);
  const queueRef = React.useRef<XpEvent[]>([]);

  useEffect(() => {
    let hideTimer: any = null;

    const hidePopup = () => {
      // Show the next queued toast, if any, once this one has fully left the screen
      const next = queueRef.current.shift();
      if (next) {
        showPopup(next);
        return;
      }
      showingRef.current = false;
      setDisplay(null);
    };

    const showPopup = (event: XpEvent) => {
      showingRef.current = true;
      setDisplay(event);

      // Cancel any ongoing animations before restarting
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      if (hideTimer) clearTimeout(hideTimer);

      // Animate: slide down → hold 1.5s → fade out
      translateY.value = -120;
      opacity.value = 0;

      translateY.value = withSequence(
        withTiming(0, { duration: 350 }),               // Slide in
        withDelay(1500, withTiming(-120, { duration: 300 })) // Slide out after 1.5s
      );

      opacity.value = withSequence(
        withTiming(1, { duration: 350 }),               // Fade in
        withDelay(1500, withTiming(0, { duration: 300 }))    // Fade out after 1.5s
      );

      // Clean up display state after animation completes
      hideTimer = setTimeout(() => {
        runOnJS(hidePopup)();
      }, 2200);
    };

    const sub = DeviceEventEmitter.addListener('showXpPopup', (event: XpEvent) => {
      if (event.queue && showingRef.current) {
        queueRef.current.push(event);
        return;
      }
      showPopup(event);
    });

    return () => {
      sub.remove();
      if (hideTimer) clearTimeout(hideTimer);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!display) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8 },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <View style={styles.xpBadge}>
          <Text style={styles.xpAmount}>{display.badge ?? `+${display.amount} XP`}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.sourceText}>{display.source}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151B2E',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  xpAmount: {
    color: '#FF6B00',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(142, 149, 169, 0.3)',
    marginHorizontal: 12,
  },
  sourceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
