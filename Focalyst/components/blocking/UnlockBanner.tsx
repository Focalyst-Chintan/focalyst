import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { formatCountdown } from '../../src/blocking/levels';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { TextButton } from './Buttons';

/** Shown while a temporary unlock window runs: "Instagram is open · 4:59 left" (or "Apps unlocked") + "Lock now". */
export function UnlockBanner() {
  const { c, glass } = useBlockingTheme();
  const { unlockWindow, lockNow } = useBlocking();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!unlockWindow) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [unlockWindow]);

  if (!unlockWindow) return null;
  const left = Math.max(0, (unlockWindow.endsAt - Date.now()) / 1000);

  return (
    <View style={[styles.banner, { backgroundColor: glass, borderColor: c.glassBorder }]} accessibilityLiveRegion="polite">
      <Ionicons name="lock-open-outline" size={20} color={c.accent} />
      <Text style={[type.bodyStrong, type.tabular, { color: c.textPrimary, flex: 1 }]}>
        {unlockWindow.appName ? `${unlockWindow.appName} is open` : 'Apps unlocked'} · {formatCountdown(left)} left
      </Text>
      <TextButton label="Lock now" onPress={lockNow} color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
