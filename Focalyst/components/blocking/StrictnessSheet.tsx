import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StrictnessLevel } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { LEVELS, LEVEL_ORDER } from '../../src/blocking/levels';
import { RATCHET_MESSAGE, openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { haptics } from '../../src/blocking/haptics';
import { BottomSheet } from './Overlays';
import { Radio, SelectOption } from './Form';
import { ProBadge } from './Chips';

/** Compact 64-tall level options; used by S13a and the S13c strictness row. */
export function LevelOptions({
  value,
  onSelect,
  isLocked,
  onRequirePro = openPaywall,
}: {
  value: StrictnessLevel;
  onSelect: (level: StrictnessLevel) => void;
  isLocked?: (level: StrictnessLevel) => boolean;
  /** Free plan tapped Firm or Locked. Sheets close themselves first, then open the paywall. */
  onRequirePro?: () => void;
}) {
  const { c } = useBlockingTheme();
  const { showSnackbar, isPro } = useBlocking();
  return (
    <View style={{ gap: 10 }}>
      {LEVEL_ORDER.map((id) => {
        const meta = LEVELS[id];
        const needsPro = !isPro && id !== 'gentle';
        return (
          <SelectOption
            key={id}
            selected={value === id && !needsPro}
            locked={isLocked?.(id)}
            onLockedPress={() => showSnackbar(RATCHET_MESSAGE)}
            onPress={() => {
              if (needsPro) return onRequirePro();
              if (id === 'locked') haptics.medium();
              onSelect(id);
            }}
            style={styles.compact}
          >
            <View style={styles.row}>
              <Ionicons name={meta.icon} size={20} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { color: c.textPrimary }]}>{meta.label}</Text>
                <Text style={[type.caption, { color: c.textSecondary }]}>{meta.description}</Text>
              </View>
              {needsPro ? <ProBadge /> : <Radio selected={value === id} />}
            </View>
          </SelectOption>
        );
      })}
    </View>
  );
}

/** S13a. */
export function StrictnessSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useBlockingTheme();
  const { config, setLevel, showSnackbar, canChangeLevelTo } = useBlocking();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[type.cardTitle, { color: c.textPrimary, marginBottom: 16 }]}>Strictness</Text>
      <LevelOptions
        value={config.level}
        isLocked={(l) => !canChangeLevelTo(l)}
        onRequirePro={() => {
          onClose();
          setTimeout(openPaywall, 300);
        }}
        onSelect={(level) => {
          const result = setLevel(level);
          if (!result.ok) return showSnackbar(result.reason);
          showSnackbar(`Strictness set to ${LEVELS[level].label}`);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  compact: { minHeight: 64, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
