import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarRange,
  Gauge,
  Hourglass,
  Lock,
  Plug,
  Repeat,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react-native';
import type { ReportBlock, ReportIcon, ReportSection, StartingReport } from '../startingReport';
import { lockedSummary } from '../startingReport';
import { GlassCard, IconTile, PrimaryButton } from './primitives';
import { Chip } from './patterns';
import { Overline } from './patterns2';
import { ProChip } from './PlanCard';
import { type, useOnboardingTheme } from './theme';

// Section 7.3: the starting report. Used by screen 28 and, in P4, the Insights page.
// expo-blur isn't installed, so locked text is the real text at 0.15 opacity under a gradient veil.

const ICONS: Record<ReportIcon, LucideIcon> = {
  Smartphone,
  Gauge,
  ShieldCheck,
  CalendarRange,
  Repeat,
  Hourglass,
  Plug,
};

function Block({ block }: { block: ReportBlock }) {
  const t = useOnboardingTheme();
  switch (block.type) {
    case 'text':
      return <Text style={[styles.text, { color: t.ink }]}>{block.text}</Text>;
    case 'footnote':
      return <Text style={[styles.footnote, { color: t.ink3 }]}>{block.text}</Text>;
    case 'rows':
      return (
        <View style={styles.rows}>
          {block.rows.map((row) => (
            <Text key={row.label} style={[styles.text, { color: t.ink }]}>
              <Text style={styles.bold}>{row.label}</Text>
              {`  ${row.text}`}
            </Text>
          ))}
        </View>
      );
    case 'milestones':
      return (
        <View style={[styles.table, { borderColor: t.surfaceBorder }]}>
          <View style={[styles.tr, { backgroundColor: t.surfaceStrong }]}>
            {['Week', 'Focus hours', 'Sessions a day'].map((h) => (
              <Text key={h} style={[styles.th, { color: t.ink2 }]}>
                {h}
              </Text>
            ))}
          </View>
          {block.rows.map((r) => (
            <View key={r.week} style={[styles.tr, { borderTopColor: t.surfaceBorder, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.td, { color: t.ink }]}>{r.week}</Text>
              <Text style={[styles.td, { color: t.ink }]}>{r.hours}</Text>
              <Text style={[styles.td, { color: t.ink }]}>{r.sessions}</Text>
            </View>
          ))}
        </View>
      );
    case 'chat':
      return (
        <View style={styles.chat}>
          <View style={[styles.connected, { backgroundColor: t.surfaceStrong }]}>
            <Text style={[styles.connectedText, { color: t.primaryText }]}>Focalyst connected</Text>
          </View>
          <LinearGradient colors={t.gradPrimary} style={[styles.bubble, styles.userBubble]}>
            <Text style={styles.userText}>{block.user}</Text>
          </LinearGradient>
          <View style={[styles.bubble, styles.replyBubble, { backgroundColor: t.surfaceStrong }]}>
            <Text style={[styles.replyLabel, { color: t.ink3 }]}>{block.replyLabel}</Text>
            <Text style={[styles.text, { color: t.ink }]}>{block.reply}</Text>
          </View>
        </View>
      );
  }
}

function SectionCard({ section, locked }: { section: ReportSection; locked: boolean }) {
  const t = useOnboardingTheme();
  const [first, ...rest] = section.blocks;
  return (
    <GlassCard style={styles.section}>
      <View style={styles.sectionHead}>
        <IconTile icon={ICONS[section.icon]} size={28} iconSize={15} />
        <Text style={[styles.sectionTitle, { color: t.ink }]} accessibilityRole="header">
          {section.title}
        </Text>
        {locked ? (
          <View style={styles.lockBadge}>
            <Lock size={14} color={t.ink3} />
            <ProChip />
          </View>
        ) : null}
      </View>
      {locked ? (
        <>
          {first ? <Block block={first} /> : null}
          {rest.length > 0 ? (
            // The locked text isn't exposed to VoiceOver; it reads the label instead.
            <View accessible accessibilityLabel="Locked. Included with Pro." style={styles.lockedWrap}>
              <View
                style={[styles.blocks, { opacity: 0.15 }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {rest.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </View>
              <LinearGradient
                pointerEvents="none"
                colors={[t.dark ? 'rgba(6,10,26,0)' : 'rgba(245,248,255,0)', t.dark ? 'rgba(6,10,26,0.85)' : 'rgba(245,248,255,0.85)']}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.blocks}>
          {section.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </View>
      )}
    </GlassCard>
  );
}

export function StartingReportView({
  report,
  isPro,
  onUnlock,
}: {
  report: StartingReport;
  isPro: boolean;
  onUnlock?: () => void;
}) {
  const t = useOnboardingTheme();
  return (
    <View>
      <Overline>{report.overline}</Overline>
      <Text accessibilityRole="header" style={[type.title, { color: t.ink }]}>
        {report.title}
      </Text>
      <Text style={[type.subtitle, styles.subtitle, { color: t.ink2 }]}>{report.subtitle}</Text>
      {report.chips.length > 0 ? (
        <View style={styles.chips}>
          {report.chips.map((c) => (
            <Chip key={c} label={c} selected={false} />
          ))}
        </View>
      ) : null}
      <View style={styles.sections}>
        {report.sections.map((section, i) => (
          <React.Fragment key={section.id}>
            <SectionCard section={section} locked={!isPro && !section.free} />
            {/* The lock card follows section 2. */}
            {!isPro && i === 1 && report.sections.some((s) => !s.free) ? (
              <GlassCard style={[styles.lockCard, { borderColor: t.selectedBorder }]}>
                <Lock size={20} color={t.primaryText} />
                <Text style={[styles.lockTitle, { color: t.ink }]}>Your full report is ready.</Text>
                <Text style={[styles.text, { color: t.ink2 }]}>{lockedSummary(report)}</Text>
                {onUnlock ? <PrimaryButton label="Unlock my full report" onPress={onUnlock} /> : null}
              </GlassCard>
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  sections: { gap: 14, marginTop: 24 },
  section: { padding: 20, borderRadius: 20, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blocks: { gap: 12 },
  lockedWrap: { overflow: 'hidden', borderRadius: 8 },
  text: { fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: '700' },
  footnote: { fontSize: 12, lineHeight: 17 },
  rows: { gap: 10 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tr: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 },
  th: { flex: 1, fontSize: 12, fontWeight: '700' },
  td: { flex: 1, fontSize: 14 },
  chat: { gap: 8 },
  connected: { alignSelf: 'center', borderRadius: 10, paddingHorizontal: 10, height: 22, justifyContent: 'center' },
  connectedText: { fontSize: 12, fontWeight: '600' },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  userBubble: { alignSelf: 'flex-end' },
  userText: { color: '#FFFFFF', fontSize: 15 },
  replyBubble: { alignSelf: 'flex-start' },
  replyLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  lockCard: { padding: 20, borderRadius: 20, gap: 12, borderWidth: 1.5 },
  lockTitle: { fontSize: 20, fontWeight: '700' },
});
