import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Hourglass } from 'lucide-react-native';
import { PENDING_COUNTDOWN_CARD_KEY, type PendingCountdownCardData } from './followUps';
import { daysUntil } from './plan';

// Section 8.5: the Focus tab card for a countdown that's more than 30 days away on the free plan.
export function PendingCountdownCard({ isDark, isPro }: { isDark: boolean; isPro: boolean }) {
  const router = useRouter();
  const [card, setCard] = useState<PendingCountdownCardData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(PENDING_COUNTDOWN_CARD_KEY);
          if (!cancelled) setCard(raw ? (JSON.parse(raw) as PendingCountdownCardData) : null);
        } catch {
          if (!cancelled) setCard(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!card || isPro) return null;
  const days = daysUntil(card.date);
  if (days < 0) return null;

  // "Remove" hides it on this phone.
  const remove = async () => {
    setCard(null);
    try {
      await AsyncStorage.removeItem(PENDING_COUNTDOWN_CARD_KEY);
    } catch {}
  };

  const ink = isDark ? '#FFFFFF' : '#0A1033';
  const ink2 = isDark ? '#B7C0D8' : '#3D4566';
  return (
    <View
      style={[styles.card, { backgroundColor: isDark ? '#151B2E' : '#FFFFFF', borderColor: isDark ? '#222A41' : '#E2E8F0' }]}
    >
      <View style={styles.row}>
        <Hourglass size={18} color={isDark ? '#6FA2FF' : '#1951FC'} />
        <Text style={[styles.text, { color: ink }]}>
          {`${card.name} is ${days} ${days === 1 ? 'day' : 'days'} away. Countdowns beyond 30 days are part of Pro.`}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={remove} style={styles.ghost}>
          <Text style={[styles.ghostText, { color: ink2 }]}>Remove</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/paywall')} style={styles.primary}>
          <Text style={styles.primaryText}>See Pro</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 14, gap: 12, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  ghost: { height: 36, paddingHorizontal: 14, justifyContent: 'center' },
  ghostText: { fontSize: 14, fontWeight: '600' },
  primary: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#1951FC', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
