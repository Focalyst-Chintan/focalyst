import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { AndroidAppItem } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { haptics } from '../../src/blocking/haptics';
import { AppIcon } from './AppIcon';
import { Checkbox } from './Form';

/** Search field: surface2, radius 14, height 48, 20px search icon. */
export function SearchField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.search, { backgroundColor: c.surface2 }]}>
      <Ionicons name="search" size={20} color={c.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search apps"
        placeholderTextColor={c.textTertiary}
        style={[type.body, styles.searchInput, { color: c.textPrimary }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search apps"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={c.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

/** Overline label with an optional caption on the right ("MOST USED" · "Last 7 days"). */
export function ListSectionHeader({ title, right }: { title: string; right?: string }) {
  const { c } = useBlockingTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[type.overline, { color: c.textSecondary }]}>{title}</Text>
      {right ? <Text style={[type.caption, { color: c.textSecondary }]}>{right}</Text> : null}
    </View>
  );
}

export type RowPosition = { first: boolean; last: boolean };

type AppRowProps = RowPosition & {
  app: AndroidAppItem;
  checked: boolean;
  /** Greyed checkbox (e.g. the app is always allowed); taps call `onPress` anyway so it can explain why. */
  disabled?: boolean;
  subtitle?: string;
  onPress: (app: AndroidAppItem) => void;
};

/**
 * One 64px row of a card-styled list: AppIcon 40, name over subtitle, circular checkbox. Rows draw
 * their own slice of the card so long lists can stay virtualized.
 */
export const AppRow = memo(function AppRow({ app, checked, disabled, subtitle, onPress, first, last }: AppRowProps) {
  const { c } = useBlockingTheme();
  return (
    <Pressable
      onPress={() => {
        if (!disabled) haptics.light();
        onPress(app);
      }}
      android_ripple={{ color: `${c.accent}1A` }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={subtitle ? `${app.appName}, ${subtitle}` : app.appName}
      style={[
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border },
        first && styles.rowFirst,
        last && styles.rowLast,
      ]}
    >
      <AppIcon iconUri={app.iconUri} packageName={app.packageName} size={40} />
      <View style={styles.rowText}>
        <Text style={[type.bodyStrong, { color: c.textPrimary }]}>{app.appName}</Text>
        {subtitle ? <Text style={[type.secondary, { color: c.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <Checkbox checked={checked} disabled={disabled} />
      {!last && <View style={[styles.divider, { backgroundColor: c.border }]} />}
    </Pressable>
  );
});

/** Case-insensitive name filter that keeps the incoming order. */
export function filterApps(apps: AndroidAppItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return apps;
  return apps.filter((a) => a.appName.toLowerCase().includes(q));
}

const styles = StyleSheet.create({
  search: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchInput: { flex: 1, paddingVertical: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  row: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  rowText: { flex: 1 },
  // Inset to the text column (16 padding + 40 icon + 12 gap).
  divider: { position: 'absolute', left: 68, right: 0, bottom: 0, height: 1 },
});
