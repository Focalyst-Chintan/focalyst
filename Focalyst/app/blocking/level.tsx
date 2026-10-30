import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import type { StrictnessLevel } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { RATCHET_MESSAGE, openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { LEVELS, LEVEL_ORDER } from '../../src/blocking/levels';
import { haptics } from '../../src/blocking/haptics';
import { useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { SetupScreen } from '../../components/blocking/SetupScreen';
import { SetupTopBar } from '../../components/blocking/SetupTopBar';
import { CircleIconButton, PrimaryButton } from '../../components/blocking/Buttons';
import { IconCircle, Radio, SelectOption } from '../../components/blocking/Form';
import { FactChip, ProBadge } from '../../components/blocking/Chips';

/** S5. `?mode=edit` comes from Manage. */
export default function BlockingLevel() {
  const { c } = useBlockingTheme();
  const router = useRouter();
  const steps = useSetupSteps('level');
  const editMode = steps.mode === 'edit';
  const { back, dialog } = useLeaveSetup(!editMode && steps.isFirst);
  const { draft, updateDraft, config, setLevel, canChangeLevelTo, showSnackbar, isPro } = useBlocking();
  const [editValue, setEditValue] = useState<StrictnessLevel>(isPro ? config.level : 'gentle');
  const value = editMode ? editValue : draft.level;

  const select = (level: StrictnessLevel) => {
    if (level === 'locked') haptics.medium();
    if (editMode) setEditValue(level);
    else updateDraft({ level });
  };

  const next = () => {
    if (!editMode) return router.push(`/blocking/rules?${steps.carry}`);
    const result = setLevel(editValue);
    if (!result.ok) return result.pro ? openPaywall() : showSnackbar(result.reason);
    if (editValue !== config.level) showSnackbar(`Strictness set to ${LEVELS[editValue].label}`);
    router.back();
  };

  return (
    <SetupScreen
      header={
        editMode ? (
          <View style={styles.appBar}>
            <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
            <Text style={[type.cardTitle, { color: c.textPrimary }]}>Strictness</Text>
          </View>
        ) : (
          <SetupTopBar step={steps.step} total={steps.total} onBack={back} />
        )
      }
      footer={<PrimaryButton label={editMode ? 'Save' : 'Continue'} onPress={next} />}
    >
      {!editMode && (
        <>
          <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 8 }]}>How strict should blocking be?</Text>
          <Text style={[type.secondary, { color: c.textSecondary, marginTop: 8 }]}>
            This decides how hard it is to open a locked app during focus.
          </Text>
        </>
      )}

      <View style={{ gap: 12, marginTop: 24 }}>
        {LEVEL_ORDER.map((id) => {
          const meta = LEVELS[id];
          const needsPro = !isPro && id !== 'gentle';
          const selected = value === id && !needsPro;
          const locked = editMode && !canChangeLevelTo(id);
          return (
            <SelectOption
              key={id}
              selected={selected}
              locked={locked}
              onLockedPress={() => showSnackbar(RATCHET_MESSAGE)}
              onPress={() => (needsPro ? openPaywall() : select(id))}
            >
              <View style={styles.levelRow}>
                <IconCircle icon={meta.icon} />
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[type.cardTitle, { color: c.textPrimary }]}>{meta.label}</Text>
                    {needsPro && <ProBadge />}
                    {id === 'firm' && !needsPro && (
                      <View style={[styles.badge, { backgroundColor: c.accentTint }]}>
                        <Text style={[styles.badgeLabel, { color: c.accent }]}>Recommended</Text>
                      </View>
                    )}
                    {locked && <Ionicons name="lock-closed" size={14} color={c.textSecondary} />}
                  </View>
                  <Text style={[type.secondary, { color: c.textSecondary, marginTop: 2 }]}>{meta.description}</Text>
                  <View style={styles.facts}>
                    {meta.facts.map((f) => (
                      <FactChip key={f} label={f} />
                    ))}
                  </View>
                </View>
                {!needsPro && <Radio selected={selected} />}
              </View>
            </SelectOption>
          );
        })}
      </View>

      {value === 'locked' && (
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={20} color={c.textSecondary} />
          <Text style={[type.secondary, { color: c.textSecondary, flex: 1 }]}>
            In Locked mode you can't pause or end a focus block early.
          </Text>
        </View>
      )}

      <Text style={[type.caption, { color: c.textSecondary, textAlign: 'center', marginTop: 20 }]}>
        You can change this before any session.
      </Text>
      {dialog}
    </SetupScreen>
  );
}

const styles = StyleSheet.create({
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { height: 22, borderRadius: 11, paddingHorizontal: 8, justifyContent: 'center' },
  badgeLabel: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  note: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
