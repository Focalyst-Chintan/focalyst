import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from './primitives';
import { GUTTER, type, useOnboardingTheme } from './theme';

// Section 8.6: how to add a Focalyst widget.

const STEPS = [
  'Touch and hold an empty part of your Home Screen until the apps jiggle.',
  'Tap Edit, then Add Widget.',
  'Search for Focalyst and pick a widget and size.',
  'Tap Add Widget, then Done.',
];

export function WidgetHowToSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: t.dark ? '#0E1428' : '#FFFFFF', paddingBottom: insets.bottom + 16, borderColor: t.surfaceBorder },
        ]}
        accessibilityViewIsModal
      >
        <View style={[styles.handle, { backgroundColor: t.surfaceStrong }]} />
        <Text accessibilityRole="header" style={[type.title, styles.title, { color: t.ink }]}>
          Add Focalyst to your home screen.
        </Text>
        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={[styles.num, { backgroundColor: t.surfaceStrong }]}>
                <Text style={[styles.numText, { color: t.primaryText }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: t.ink }]}>{step}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.footnote, { color: t.ink3 }]}>
          Widgets work in every home screen style, including Clear and Tinted.
        </Text>
        <PrimaryButton label="Got it" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: GUTTER,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 16 },
  title: { fontSize: 24, lineHeight: 30 },
  steps: { gap: 14, marginTop: 20 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 16, lineHeight: 22 },
  footnote: { fontSize: 13, lineHeight: 18, marginTop: 18, marginBottom: 20 },
});
