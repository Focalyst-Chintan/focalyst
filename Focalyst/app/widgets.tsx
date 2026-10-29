import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WidgetThemePicker } from '../src/components/WidgetThemePicker';

export const WIDGETS_ENABLED_KEY = '@focalyst_widgets_enabled';

export default function WidgetsScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(WIDGETS_ENABLED_KEY).then((val) => {
      if (val !== null) setEnabled(val === 'true');
    });
  }, []);

  const toggleEnabled = async (val: boolean) => {
    setEnabled(val);
    await AsyncStorage.setItem(WIDGETS_ENABLED_KEY, String(val));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WIDGETS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toggleCard}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.toggleTitle}>Enable Home Screen Widgets</Text>
            <Text style={styles.toggleSub}>
              Sync your To-Do List, Habit Streaks, Heatmap, Countdown, and Focus Timer with your Home Screen.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: '#334155', true: '#FF6B00' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {enabled && <WidgetThemePicker />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0F19' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: '#FFFFFF', fontSize: 30, fontWeight: '300' },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  content: { padding: 16 },
  toggleCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  toggleTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  toggleSub: { color: '#94A3B8', fontSize: 12, marginTop: 4, lineHeight: 17 },
});
