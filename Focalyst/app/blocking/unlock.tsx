import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { useBlocking } from '../../src/blocking/BlockingContext';
import { exitToFocus } from '../../src/blocking/setupNav';
import { LockedScreen, MindfulUnlock, ShortPause } from '../../components/blocking/UnlockFlows';
import { PrimaryButton } from '../../components/blocking/Buttons';

/**
 * focalyst://blocking/unlock (Android adds `?app=<package>&level=<level>` from the shield). Routes to
 * S10b (Gentle), S10 (Firm) or S11 (Locked) based on the strictest level holding apps locked right now.
 */
export default function BlockingUnlock() {
  const { c } = useBlockingTheme();
  const router = useRouter();
  const { app } = useLocalSearchParams<{ app?: string; level?: string }>();
  const { ready, shield, setUnlockScreenOpen } = useBlocking();

  useEffect(() => {
    setUnlockScreenOpen(true, app ?? null);
  }, [app, setUnlockScreenOpen]);
  useEffect(() => () => setUnlockScreenOpen(false), [setUnlockScreenOpen]);

  const done = () => {
    if (router.canGoBack()) router.back();
    else exitToFocus(router);
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  if (!shield.active) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
        <View style={styles.center}>
          <Text style={[type.setupTitle, { color: c.textPrimary, textAlign: 'center' }]}>Nothing is locked</Text>
          <Text style={[type.body, { color: c.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            Your apps are already open.
          </Text>
        </View>
        <View style={styles.footer}>
          <PrimaryButton label="Back to focus" onPress={done} />
        </View>
      </SafeAreaView>
    );
  }

  if (shield.level === 'gentle') return <ShortPause onDone={done} />;
  if (shield.level === 'firm') return <MindfulUnlock onDone={done} />;
  return <LockedScreen onDone={done} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, paddingBottom: 8 },
});
