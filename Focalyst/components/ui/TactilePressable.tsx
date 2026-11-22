import React, { useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TactilePressableProps extends Omit<PressableProps, 'style'> {
  scaleTo?: number;
  haptic?: boolean;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);
}

export function TactilePressable({
  scaleTo = 0.965,
  haptic = true,
  style,
  onPressIn,
  onPressOut,
  onPress,
  children,
  disabled,
  ...props
}: TactilePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (typeof style === 'function') setPressed(true);
    Animated.spring(scale, {
      toValue: scaleTo,
      damping: 18,
      stiffness: 300,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (typeof style === 'function') setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      damping: 18,
      stiffness: 300,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic) {
      try {
        Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Ignore if haptics unavailable
      }
    }
    onPress?.(e);
  };

  // Animated.createAnimatedComponent(Pressable) drops function styles,
  // so always resolve style into a plain array before passing to AnimatedPressable.
  const resolvedStyle =
    typeof style === 'function'
      ? style({ pressed, hovered: false, focused: false } as PressableStateCallbackType)
      : style;

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[resolvedStyle, { transform: [{ scale }] }] as any}
    >
      {children}
    </AnimatedPressable>
  );
}
