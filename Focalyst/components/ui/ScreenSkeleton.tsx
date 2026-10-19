import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SkeletonProps {
  isDark?: boolean;
  rows?: number;
  showChart?: boolean;
}

export const ScreenSkeleton: React.FC<SkeletonProps> = ({
  isDark = true,
  rows = 4,
  showChart = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.45,
            duration: 750,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    });
    return () => animation?.stop();
  }, [pulseAnim]);

  const cardColor = isDark ? '#151B2E' : '#E2E8F0';
  const borderColor = isDark ? '#222A41' : '#CBD5E1';

  return (
    <View accessibilityLabel="Loading content" style={styles.container}>
      {showChart && (
        <Animated.View
          style={[
            styles.chartSkeleton,
            {
              backgroundColor: cardColor,
              borderColor: borderColor,
              opacity: pulseAnim,
            },
          ]}
        />
      )}
      {Array.from({ length: rows }).map((_, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.rowSkeleton,
            {
              backgroundColor: cardColor,
              borderColor: borderColor,
              opacity: pulseAnim,
            },
          ]}
        />
      ))}
    </View>
  );
};

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
  isDark?: boolean;
}

export const ErrorRetryBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  isDark = true,
}) => (
  <View
    style={[
      styles.errorCard,
      {
        backgroundColor: isDark ? '#151B2E' : '#FEE2E2',
        borderColor: isDark ? '#222A41' : '#FECACA',
      },
    ]}
  >
    <View style={styles.errorRow}>
      <Ionicons color="#EF4444" name="cloud-offline-outline" size={20} />
      <Text
        style={[
          styles.errorText,
          {
            color: isDark ? '#F8FAFC' : '#991B1B',
          },
        ]}
      >
        {message}
      </Text>
    </View>
    <TouchableOpacity
      accessibilityLabel="Retry loading data"
      accessibilityRole="button"
      activeOpacity={0.75}
      onPress={onRetry}
      style={styles.retryBtn}
    >
      <Text style={styles.retryBtnText}>Retry</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
    paddingVertical: 8,
  },
  chartSkeleton: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowSkeleton: {
    width: '100%',
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
