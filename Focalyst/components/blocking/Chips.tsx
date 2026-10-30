import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StrictnessLevel } from '../../modules/screen-time-blocker';
import { useBlockingTheme } from '../../constants/blockingTheme';
import { LEVELS } from '../../src/blocking/levels';

/** Height 28, radius 14, accentTint fill, 14px level icon + 13/600 label in accent. */
export function LevelChip({
  level,
  onPress,
  compact,
}: {
  level: StrictnessLevel;
  onPress?: () => void;
  /** Height 24 for tight single-line bars. */
  compact?: boolean;
}) {
  const { c } = useBlockingTheme();
  const meta = LEVELS[level];
  const chip = (
    <View style={[styles.level, compact && styles.levelCompact, { backgroundColor: c.accentTint }]}>
      <Ionicons name={meta.icon} size={compact ? 12 : 14} color={c.accent} />
      <Text style={[styles.levelLabel, { color: c.accent }]}>{meta.label}</Text>
    </View>
  );
  if (!onPress) return chip;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Strictness: ${meta.label}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {chip}
    </Pressable>
  );
}

/** Lock + "PRO" tag on options that need Focalyst Pro. */
export function ProBadge() {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.pro, { backgroundColor: c.accentTint }]} accessibilityLabel="Requires Pro">
      <Ionicons name="lock-closed" size={11} color={c.accent} />
      <Text style={[styles.proLabel, { color: c.accent }]}>PRO</Text>
    </View>
  );
}

/** Height 26, radius 13, surface2 fill, 1px border, 13/500 textSecondary. */
export function FactChip({ label }: { label: string }) {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.fact, { backgroundColor: c.surface2, borderColor: c.border }]}>
      <Text style={[styles.factLabel, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  level: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 0,
    marginVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Centers in rows; 'flex-start' made it ride up against the top of row containers.
    alignSelf: 'center',
    gap: 5,
  },
  levelCompact: { height: 24, borderRadius: 12, paddingHorizontal: 8, gap: 4 },
  levelLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600', marginVertical: 0, includeFontPadding: false },
  pro: { height: 22, borderRadius: 11, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  proLabel: { fontSize: 13, lineHeight: 16, fontWeight: '700', letterSpacing: 0.4 },
  fact: {
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  factLabel: { fontSize: 13, lineHeight: 16, fontWeight: '500' },
});
