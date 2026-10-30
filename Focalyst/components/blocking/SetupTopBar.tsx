import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { CircleIconButton } from './Buttons';

function Segment({ filled, color, track }: { filled: boolean; color: string; track: string }) {
  const fill = useRef(new Animated.Value(filled ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: filled ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  }, [filled, fill]);
  return (
    <View style={[styles.segment, { backgroundColor: track }]}>
      <Animated.View
        style={[
          styles.segmentFill,
          { backgroundColor: color, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

/** Back button, `n` progress segments, and "Step x of n". */
export function SetupTopBar({ step, total, onBack }: { step: number; total: number; onBack: () => void }) {
  const { c } = useBlockingTheme();
  return (
    <View style={styles.bar}>
      <CircleIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Back" />
      <View style={styles.segments} accessibilityElementsHidden>
        {Array.from({ length: total }, (_, i) => (
          <Segment key={i} filled={i < step} color={c.accent} track={c.border} />
        ))}
      </View>
      <Text style={[type.caption, type.tabular, { color: c.textSecondary }]}>
        Step {step} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 56 },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: 4, borderRadius: 2 },
});
