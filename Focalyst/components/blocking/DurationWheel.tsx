import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { FREE_MAX_UNLOCK_MINUTES, openPaywall } from '../../src/blocking/BlockingContext';
import { haptics } from '../../src/blocking/haptics';
import { PrimaryButton, TextButton } from './Buttons';
import { ProBadge } from './Chips';

export const UNLOCK_DURATIONS = [1, 2, 3, 5, 8, 10, 15, 20, 30] as const;

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

const indexOf = (minutes: number) => Math.max(0, UNLOCK_DURATIONS.indexOf(minutes as (typeof UNLOCK_DURATIONS)[number]));

/** Vertical drum picker for the unlock length. Free users see 8+ minutes tagged PRO. */
export function DurationWheel({
  value,
  onChange,
  isPro,
}: {
  value: number;
  onChange: (minutes: number) => void;
  isPro: boolean;
}) {
  const { c } = useBlockingTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(indexOf(value) * ITEM_H)).current;
  const lastIndex = useRef(indexOf(value));

  // Keep the drum on `value` when it changes from outside ("Stick to 5 mins").
  useEffect(() => {
    const i = indexOf(value);
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
    }
  }, [value]);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.min(UNLOCK_DURATIONS.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
      if (i !== lastIndex.current) {
        lastIndex.current = i;
        haptics.selection();
        onChange(UNLOCK_DURATIONS[i]);
      }
    },
  });

  return (
    <View style={styles.wrap} accessibilityRole="adjustable" accessibilityValue={{ text: `${value} minutes` }}>
      <View
        pointerEvents="none"
        style={[styles.band, { top: PAD, backgroundColor: c.accentTint, borderColor: c.accent }]}
      />
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: indexOf(value) * ITEM_H }}
        contentContainerStyle={{ paddingVertical: PAD }}
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {UNLOCK_DURATIONS.map((m, i) => {
          const center = i * ITEM_H;
          const opacity = scrollY.interpolate({
            inputRange: [center - 2 * ITEM_H, center, center + 2 * ITEM_H],
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });
          const scale = scrollY.interpolate({
            inputRange: [center - 2 * ITEM_H, center, center + 2 * ITEM_H],
            outputRange: [0.86, 1, 0.86],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={m} style={[styles.item, { opacity, transform: [{ scale }] }]}>
              <Text style={[styles.itemLabel, { color: c.textPrimary }]}>{m} min</Text>
              {!isPro && m > FREE_MAX_UNLOCK_MINUTES && <ProBadge />}
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

/** Shown under the wheel when a free user lands on 8+ minutes. */
export function LongerBreakUpsell({ onStick }: { onStick: () => void }) {
  const { c } = useBlockingTheme();
  return (
    <View style={[styles.upsell, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[type.bodyStrong, { color: c.textPrimary }]}>Need a longer break?</Text>
      <Text style={[type.secondary, { color: c.textSecondary, marginTop: 4 }]}>
        Unlock 8–30 minute pauses, Firm & Locked modes, and unlimited app blocking with Focalyst Pro.
      </Text>
      <PrimaryButton label="Unlock with Pro" onPress={openPaywall} style={{ marginTop: 12 }} />
      <TextButton label="Stick to 5 mins" onPress={onStick} color={c.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: ITEM_H * VISIBLE, width: '100%', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: ITEM_H, borderRadius: 12, borderWidth: 1 },
  item: { height: ITEM_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  itemLabel: { fontSize: 20, lineHeight: 26, fontWeight: '600', fontVariant: ['tabular-nums'] },
  upsell: { marginTop: 12, borderRadius: 16, borderWidth: 1, padding: 16, width: '100%' },
});
