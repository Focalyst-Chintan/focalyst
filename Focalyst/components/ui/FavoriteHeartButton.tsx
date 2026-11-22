import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface FavoriteHeartButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  size?: number;
  style?: ViewStyle;
}

export function FavoriteHeartButton({
  isFavorite,
  onToggle,
  isDarkMode,
  size = 20,
  style,
}: FavoriteHeartButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    try {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore if haptics unavailable
    }

    // Spring pop animation: 1 -> 1.28 -> 1
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.28,
        damping: 10,
        stiffness: 400,
        mass: 0.4,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 300,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();

    onToggle();
  };

  // Heart color: Red #EF4444 when active; muted outline when inactive
  const heartColor = isFavorite
    ? '#EF4444'
    : isDarkMode
      ? '#64748b'
      : '#94a3b8';

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      style={[styles.container, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={heartColor}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
});
