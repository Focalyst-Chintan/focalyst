import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { GlassCard, IconTile } from './primitives';
import { useOnboardingTheme } from './theme';

// Section 3.6: compact one-line plan rows. Used on screen 25 and the report header (P2, P3).

export interface PlanRow {
  icon: LucideIcon;
  label: string;
  /** One value, or several: multi-value rows show the first plus "+n". */
  value: string | string[];
  /** Shows a small Pro chip, for example when the ideal rhythm is longer than 25/5. */
  pro?: boolean;
}

export function planRowText(value: string | string[]): string {
  if (!Array.isArray(value)) return value;
  if (value.length <= 1) return value[0] ?? '';
  return `${value[0]} +${value.length - 1}`;
}

export function ProChip() {
  const t = useOnboardingTheme();
  return (
    <View style={[styles.pro, { backgroundColor: t.surfaceStrong, borderColor: t.selectedBorder }]}>
      <Text style={[styles.proText, { color: t.primaryText }]}>Pro</Text>
    </View>
  );
}

export function PlanCard({ rows }: { rows: PlanRow[] }) {
  const t = useOnboardingTheme();
  // Only rows the user filled are shown.
  const filled = rows.filter((row) => (Array.isArray(row.value) ? row.value.length > 0 : row.value.trim() !== ''));
  return (
    <GlassCard style={styles.card}>
      {filled.map((row, i) => {
        const full = Array.isArray(row.value) ? row.value.join(', ') : row.value;
        return (
          <View
            key={row.label}
            accessible
            accessibilityLabel={`${row.label}: ${full}${row.pro ? '. Longer sessions come with Pro.' : ''}`}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.surfaceBorder }]}
          >
            <IconTile icon={row.icon} size={28} iconSize={15} />
            <Text style={[styles.label, { color: t.ink2 }]} numberOfLines={1}>
              {row.label}
            </Text>
            <View style={styles.valueWrap}>
              <Text style={[styles.value, { color: t.ink }]} numberOfLines={1} ellipsizeMode="tail">
                {planRowText(row.value)}
              </Text>
              {row.pro ? <ProChip /> : null}
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { width: 132, fontSize: 14 },
  valueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minWidth: 0 },
  value: { flexShrink: 1, fontSize: 15, fontWeight: '500', textAlign: 'right' },
  pro: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, height: 18, justifyContent: 'center' },
  proText: { fontSize: 11, fontWeight: '700' },
});
