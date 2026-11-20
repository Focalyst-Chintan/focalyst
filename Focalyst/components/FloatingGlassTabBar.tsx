import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  onNavigate: (route: string) => void;
  onAddTask: () => void;
  onStartSession: () => void;
  onVoice: () => void;
  onChat: () => void;
};

export default function FloatingGlassTabBar({
  activeRoute, onNavigate, onAddTask, onStartSession, onVoice, onChat,
}: Props) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const plusScale = useSharedValue(1);
  const plusGlow = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex(item => activeRoute.includes(item.route)));

  useEffect(() => {
    progress.value = withSpring(progress.value > 0.5 ? 1 : 0, SPRING);
  }, [activeRoute]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.value, [0, 0.3, 0.4, 0.5, 1], [1, 1, 0.93, 1, 1], Extrapolation.CLAMP) }],
    height: interpolate(progress.value, [0, 0.4, 0.52, 1], [62, 62, 66, 62], Extrapolation.CLAMP),
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(148, 179, 255, 0.22)', 'rgba(190, 213, 255, 0.34)']),
  }));
  const navLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 0.6, 1], [1, 0, 0, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.45], [1, 0.85], Extrapolation.CLAMP) }],
  }));
  const activePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(activeIndex * ((windowWidth - 106) / 4), { damping: 20, stiffness: 240, mass: 0.8 }) }],
  }));
  const plusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: plusScale.value }, { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: plusGlow.value }));
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

  return (
    <>
      {/** Backdrop sits behind the floating bar and only captures taps while the menu is open. */}
      {isOpen && <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { setIsOpen(false); progress.value = withSpring(0, SPRING); }} />
      </Animated.View>}
      <View pointerEvents="box-none" style={[styles.positioner, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Animated.View style={[styles.capsule, capsuleStyle]}>
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View pointerEvents="none" style={styles.surface} />
          <Animated.View pointerEvents={isOpen ? 'none' : 'auto'} style={[styles.layer, navLayerStyle]}>
            <Animated.View style={[styles.activePill, activePillStyle]} />
            {NAV_ITEMS.map((item, index) => (
              <Pressable key={item.route} accessibilityRole="button" accessibilityLabel={item.route}
                onPress={() => onNavigate(item.route)} style={styles.slot}>
                <item.Icon size={24} strokeWidth={2} color={index === activeIndex ? '#0F3D91' : '#8E9BB5'} />
              </Pressable>
            ))}
          </Animated.View>
          <View pointerEvents={isOpen ? 'auto' : 'none'} style={styles.layer}>
            {ACTIONS.map((action, index) => {
              return (
                <QuickAction key={action.label} index={index} action={action} progress={progress} onPress={() => runAction(index)} />
              );
            })}
          </View>
        </Animated.View>
        <Pressable accessibilityRole="button" accessibilityLabel={isOpen ? 'Close quick actions' : 'Open quick actions'}
          onPressIn={() => { plusScale.value = withSpring(1.12, BUTTON_SPRING); plusGlow.value = withSpring(1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          onPressOut={() => { plusScale.value = withSpring(1, BUTTON_SPRING); plusGlow.value = withSpring(0); }}
          onPress={toggle} style={styles.actionButton}>
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.buttonGlow, glowStyle]} />
          <Animated.View style={plusStyle}><Plus size={28} strokeWidth={2.5} color="#FFFFFF" /></Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { zIndex: 10, backgroundColor: 'rgba(5, 8, 18, 0.35)' },
  positioner: { position: 'absolute', zIndex: 11, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  capsule: { flex: 1, height: 62, borderRadius: 31, overflow: 'hidden', backgroundColor: 'rgba(24, 32, 56, 0.88)', borderWidth: 1, borderColor: 'rgba(148, 179, 255, 0.22)' },
  surface: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(24, 32, 56, 0.68)' },
  layer: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  activePill: { position: 'absolute', left: '2.5%', width: '22%', height: 44, borderRadius: 22, backgroundColor: '#E4EEFF' },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  actionContent: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  actionGlow: { ...StyleSheet.absoluteFill, margin: 7, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.22)' },
  actionButton: { width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#11182A', borderWidth: 1, borderColor: 'rgba(148, 179, 255, 0.22)' },
  buttonGlow: { backgroundColor: 'rgba(255, 255, 255, 0.28)' },
});

function QuickAction({ index, action, progress, onPress }: {
  index: number;
  action: typeof ACTIONS[number];
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => {
    const start = 0.45 + index * 0.025;
    const end = Math.min(start + 0.42, 1);
    return {
      opacity: interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(progress.value, [start, end], [0.82, 1], Extrapolation.CLAMP) * scale.value }],
    };
  });
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.label}
      onPressIn={() => { scale.value = withSpring(0.92, BUTTON_SPRING); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      onPressOut={() => { scale.value = withSpring(1, BUTTON_SPRING); }}
      onPress={onPress} style={styles.slot}>
      <Animated.View pointerEvents="none" style={[styles.actionContent, animatedStyle]}>
        <View style={styles.actionGlow} />
        <action.Icon size={24} strokeWidth={2} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}
