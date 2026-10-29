import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PickerResult } from '../../modules/screen-time-blocker';
import { useBlockingTheme } from '../../constants/blockingTheme';
import { FREE_MAX_APPS, useBlocking } from '../../src/blocking/BlockingContext';

/** CTA that replaces Save / Start while a free selection is over the limit. */
export const upgradeLabel = (s: PickerResult) =>
  s.appCount > FREE_MAX_APPS ? `Upgrade to Pro to Block ${s.appCount} Apps` : 'Upgrade to Pro to Block Categories';

/** High-contrast warning shown wherever a free user's selection exceeds 2 apps or has categories. */
export function FreeAppLimitBanner() {
  const { c } = useBlockingTheme();
  const { config } = useBlocking();
  const s = config.blocklistSummary;
  const picked =
    s.categoryCount > 0
      ? `you selected ${s.appCount} ${s.appCount === 1 ? 'app' : 'apps'} and ${s.categoryCount} ${s.categoryCount === 1 ? 'category' : 'categories'}`
      : `you selected ${s.appCount}`;
  return (
    <View style={[styles.banner, { backgroundColor: c.dangerTint, borderColor: c.danger }]} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={20} color={c.danger} />
      <Text style={[styles.text, { color: c.textPrimary }]}>
        Free plan allows up to {FREE_MAX_APPS} apps per session ({picked}). Upgrade to Pro for unlimited apps &
        categories.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  text: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
