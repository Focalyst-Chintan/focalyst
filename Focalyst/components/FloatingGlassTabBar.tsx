import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { CalendarDays, ChartNoAxesColumnIncreasing, FileText, Hourglass, ListTodo, MessageCircle, Mic, Plus, Timer } from 'lucide-react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAV_ITEMS = [
  { route: 'plan', Icon: CalendarDays },
  { route: 'focus', Icon: Timer },
  { route: 'notes', Icon: FileText },
  { route: 'insights', Icon: ChartNoAxesColumnIncreasing },
];

const ACTIONS = [
  { Icon: ListTodo, label: 'Add Task' },
  { Icon: Hourglass, label: 'Start Focus Session' },
  { Icon: Mic, label: 'Record Voice Note' },
  { Icon: MessageCircle, label: 'Ask AI Chat' },
];

const SPRING = { damping: 17, stiffness: 210, mass: 0.85 };
const BUTTON_SPRING = { damping: 16, stiffness: 220 };

type Props = {
  activeRoute: string;
  isDarkMode?: boolean;
  hidden?: boolean;
  onNavigate: (route: string) => void;
  onAddTask: () => void;
  onStartSession: () => void;
  onVoice: () => void;
  onChat: () => void;
};

export default function FloatingGlassTabBar({
  activeRoute, isDarkMode = true, hidden = false, onNavigate, onAddTask, onStartSession, onVoice, onChat,
}: Props) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const plusScale = useSharedValue(1);
  const [isOpen, setIsOpen] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const activeIndex = Math.max(0, NAV_ITEMS.findIndex(item => activeRoute.includes(item.route)));
  const slotWidth = trackWidth > 0 ? trackWidth / 4 : 0;

  const indicatorX = useSharedValue(0);
  const isInitialized = useSharedValue(false);

  useEffect(() => {
    progress.value = withSpring(progress.value > 0.5 ? 1 : 0, SPRING);
  }, [activeRoute]);

  useEffect(() => {
    if (trackWidth > 0) {
      const targetX = activeIndex * (trackWidth / 4);
      if (!isInitialized.value) {
        indicatorX.value = targetX;
        isInitialized.value = true;
      } else {
        indicatorX.value = withSpring(targetX, { damping: 20, stiffness: 240, mass: 0.8 });
      }
    }
  }, [activeIndex, trackWidth]);

  const capsuleBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)';
  const capsuleBorderActive = isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(15, 23, 42, 0.14)';
  const capsuleBg = isDarkMode ? 'rgba(17, 21, 33, 0.92)' : 'rgba(218, 229, 244, 0.85)';
  const surfaceBg = isDarkMode ? 'rgba(17, 21, 33, 0.82)' : 'rgba(218, 229, 244, 0.65)';
  const activePillBg = isDarkMode ? '#EBF3FF' : '#FFFFFF';
  const inactiveIconColor = isDarkMode ? '#8E98AD' : '#1E293B';
  const actionButtonBg = isDarkMode ? '#111521' : '#1951fc';
  const actionButtonBorder = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)';

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.value, [0, 0.3, 0.4, 0.5, 1], [1, 1, 0.93, 1, 1], Extrapolation.CLAMP) }],
    height: interpolate(progress.value, [0, 0.4, 0.52, 1], [62, 62, 66, 62], Extrapolation.CLAMP),
    borderColor: interpolateColor(progress.value, [0, 1], [capsuleBorderColor, capsuleBorderActive]),
  }));

  const navLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 0.6, 1], [1, 0, 0, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.45], [1, 0.85], Extrapolation.CLAMP) }],
  }));

  const actionsLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0.3, 1], [0.85, 1], Extrapolation.CLAMP) }],
  }));

  const activePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }, { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    progress.value = withSpring(next ? 1 : 0, SPRING);
  };

  const runAction = (index: number) => {
    progress.value = withSpring(0, SPRING);
    setIsOpen(false);
    [onAddTask, onStartSession, onVoice, onChat][index]();
  };

  const bottomOffset = Platform.OS === 'ios'
    ? Math.max(insets.bottom - 14, 12)
    : Math.max(insets.bottom, 12) + 8;

  if (hidden) return null;

  return (
    <>
      {/** Backdrop sits behind the floating bar and only captures taps while the menu is open. */}
      {isOpen && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setIsOpen(false); progress.value = withSpring(0, SPRING); }} />
        </Animated.View>
      )}
      <View pointerEvents="box-none" style={[styles.positioner, { bottom: bottomOffset }]}>
        <Animated.View style={[styles.capsule, { backgroundColor: capsuleBg }, capsuleStyle]}>
          <BlurView intensity={24} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View pointerEvents="none" style={[styles.surface, { backgroundColor: surfaceBg }]} />
          
          <View style={styles.trackContainer}>
            <Animated.View
              pointerEvents={isOpen ? 'none' : 'auto'}
              style={[styles.innerTrack, navLayerStyle]}
              onLayout={(e) => {
                const width = e.nativeEvent.layout.width;
                if (width > 0 && width !== trackWidth) {
                  setTrackWidth(width);
                }
              }}
            >
              {slotWidth > 0 && (
                <Animated.View style={[styles.activePill, { width: slotWidth, backgroundColor: activePillBg }, activePillStyle]} />
              )}
              {NAV_ITEMS.map((item, index) => (
                <Pressable
                  key={item.route}
                  accessibilityRole="button"
                  accessibilityLabel={item.route}
                  onPress={() => onNavigate(item.route)}
                  style={styles.slot}
                >
                  <item.Icon
                    size={24}
                    strokeWidth={2}
                    color={index === activeIndex ? '#03195b' : inactiveIconColor}
                  />
                </Pressable>
              ))}
            </Animated.View>

            <Animated.View
              pointerEvents={isOpen ? 'auto' : 'none'}
              style={[styles.innerTrack, styles.actionsOverlay, actionsLayerStyle]}
            >
              {ACTIONS.map((action, index) => (
                <QuickAction
                  key={action.label}
                  index={index}
                  action={action}
                  progress={progress}
                  isDarkMode={isDarkMode}
                  onPress={() => runAction(index)}
                />
              ))}
            </Animated.View>
          </View>
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isOpen ? 'Close quick actions' : 'Open quick actions'}
          onPressIn={() => {
            plusScale.value = withSpring(1.12, BUTTON_SPRING);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onPressOut={() => {
            plusScale.value = withSpring(1, BUTTON_SPRING);
          }}
          onPress={toggle}
          style={[styles.actionButton, { backgroundColor: actionButtonBg, borderColor: actionButtonBorder }]}
        >
          <BlurView intensity={22} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Animated.View style={plusStyle}>
            <Plus size={28} strokeWidth={2.5} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { zIndex: 10, backgroundColor: 'rgba(5, 8, 18, 0.35)' },
  positioner: { position: 'absolute', zIndex: 11, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  capsule: {
    flex: 1,
    height: 62,
    borderRadius: 31,
    padding: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(24, 32, 56, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(148, 179, 255, 0.22)',
  },
  surface: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(24, 32, 56, 0.68)' },
  trackContainer: { flex: 1, position: 'relative' },
  innerTrack: { flex: 1, flexDirection: 'row', position: 'relative', alignItems: 'center' },
  actionsOverlay: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center' },
  activePill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: '#E4EEFF',
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  actionContent: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  actionButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11182A',
    borderWidth: 1,
    borderColor: 'rgba(148, 179, 255, 0.22)',
  },
});

function QuickAction({
  index,
  action,
  progress,
  isDarkMode = true,
  onPress,
}: {
  index: number;
  action: (typeof ACTIONS)[number];
  progress: SharedValue<number>;
  isDarkMode?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const pressHighlight = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const start = 0.45 + index * 0.025;
    const end = Math.min(start + 0.42, 1);
    return {
      opacity: interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          scale:
            interpolate(progress.value, [start, end], [0.82, 1], Extrapolation.CLAMP) *
            scale.value,
        },
      ],
    };
  });

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: pressHighlight.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPressIn={() => {
        pressHighlight.value = withTiming(1, { duration: 60 });
        scale.value = withSpring(0.92, BUTTON_SPRING);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        pressHighlight.value = withTiming(0, { duration: 140 });
        scale.value = withSpring(1, BUTTON_SPRING);
      }}
      onPress={onPress}
      style={styles.slot}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.actionHighlight,
          { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(10, 21, 48, 0.1)' },
          highlightStyle,
        ]}
      />
      <Animated.View pointerEvents="none" style={[styles.actionContent, animatedStyle]}>
        <action.Icon size={24} strokeWidth={2} color={isDarkMode ? '#FFFFFF' : '#03195b'} />
      </Animated.View>
    </Pressable>
  );
}
