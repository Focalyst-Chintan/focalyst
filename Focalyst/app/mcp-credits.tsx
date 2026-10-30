import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  DeviceEventEmitter,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/utils/supabase';
import { formatMcpDate, useMcpSummary } from '../src/hooks/useMcpStatus';
import { openMcpConnections } from '../src/utils/openMcpConnections';

// Same tokens as the Profile screen
const ACCENT_ORANGE = '#FF6B00';

type ToolCost = { tool: string; label: string; cost: number; is_write: boolean };

export default function McpCreditsScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [costs, setCosts] = useState<ToolCost[] | null>(null);
  const mcp = useMcpSummary(true);
  const { refresh } = mcp;

  useEffect(() => {
    AsyncStorage.getItem('darkMode')
      .then((val) => {
        if (val !== null) setDarkMode(val === 'true');
      })
      .catch(() => {});
    const sub = DeviceEventEmitter.addListener('themeChanged', (val: boolean) => setDarkMode(val));
    return () => sub.remove();
  }, []);

  const theme = {
    bg: darkMode ? '#0B1021' : '#F4F6FA',
    cardBg: darkMode ? '#151B2E' : '#FFFFFF',
    textPrimary: darkMode ? '#FFFFFF' : '#1E2229',
    textSecondary: darkMode ? '#8E95A9' : '#5C6479',
    borderColor: darkMode ? '#222A41' : '#E2E8F0',
    iconCircleBg: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    track: darkMode ? '#222D47' : '#E2E8F0',
  };

  const toggleInfo = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowInfo((v) => !v);
    if (costs === null) {
      // Same price list the website shows; read-only table every signed-in user can read
      supabase
        .from('mcp_tool_costs')
        .select('tool, label, cost, is_write')
        .order('sort', { ascending: true })
        .then(({ data, error }) => setCosts(error ? [] : ((data ?? []) as ToolCost[])));
    }
  };

  const manage = useCallback(async () => {
    await openMcpConnections();
    refresh();
  }, [refresh]);

  const d = mcp.data;
  const allowance = d?.monthlyAllowance ?? null;
  const pct =
    d?.balance != null && allowance && allowance > 0 ? Math.min(100, Math.round((d.balance / allowance) * 100)) : 0;
  const refill = d ? formatMcpDate(d.refillDate) : '';
  const showBonusPill = !!d && d.isPro && d.hasAccount && d.bonusClaimedToday;

  const groups = [
    { title: 'Reading your data', items: (costs ?? []).filter((c) => !c.is_write) },
    { title: 'Making changes', items: (costs ?? []).filter((c) => c.is_write) },
  ].filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ═══ Header ═══ */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>MCP Credits</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ═══ Credits card ═══ */}
        <View style={[styles.card, styles.creditsCard, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.overline, { color: theme.textSecondary }]}>MCP CREDITS</Text>
            <TouchableOpacity
              onPress={toggleInfo}
              activeOpacity={0.6}
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.infoLink}
            >
              <Ionicons name="information-circle-outline" size={15} color={ACCENT_ORANGE} />
              <Text style={styles.infoLinkText}>What uses credits</Text>
            </TouchableOpacity>
          </View>

          {mcp.error ? (
            <Text style={[styles.mutedText, { color: theme.textSecondary, marginTop: 12 }]}>Unavailable</Text>
          ) : !d ? (
            <ActivityIndicator style={styles.loader} size="small" color={theme.textSecondary} />
          ) : d.balance == null ? (
            <Text style={[styles.mutedText, { color: theme.textSecondary, marginTop: 12 }]}>Unavailable</Text>
          ) : (
            <>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceNumber, { color: theme.textPrimary }]}>
                  {d.balance.toLocaleString('en-US')}
                </Text>
                {allowance != null && (
                  <Text style={[styles.allowanceText, { color: theme.textSecondary }]}>
                    / {allowance.toLocaleString('en-US')}
                  </Text>
                )}
              </View>

              <View
                style={[styles.track, { backgroundColor: theme.track }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: pct }}
              >
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>

              <View style={styles.refillRow}>
                {!d.hasAccount ? (
                  // Pro before the first connection: full allowance shown, refill clock not started yet
                  <Text style={[styles.mutedText, { color: theme.textSecondary }]}>
                    Your credits start when you connect your first app.
                  </Text>
                ) : allowance != null && !!refill && (
                  <Text style={[styles.mutedText, { color: theme.textSecondary }]}>
                    Refills to {allowance.toLocaleString('en-US')} on {refill}
                  </Text>
                )}
                {showBonusPill && (
                  <View style={styles.bonusPill}>
                    <Text style={styles.bonusPillText}>+10 when you open Focalyst tomorrow</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {showInfo && (
            <View style={[styles.infoBox, { borderTopColor: theme.borderColor }]}>
              <Text style={[styles.infoText, { color: theme.textPrimary }]}>
                Each request your AI makes through MCP uses credits.
              </Text>
              {costs === null ? (
                <ActivityIndicator style={styles.loader} size="small" color={theme.textSecondary} />
              ) : (
                groups.map((g) => (
                  <View key={g.title} style={styles.costGroup}>
                    <Text style={[styles.costGroupTitle, { color: theme.textSecondary }]}>{g.title}</Text>
                    {g.items.map((c) => (
                      <View key={c.tool} style={styles.costRow}>
                        <Text style={[styles.costLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                          {c.label}
                        </Text>
                        <Text style={[styles.costValue, { color: theme.textPrimary }]}>{c.cost}</Text>
                      </View>
                    ))}
                  </View>
                ))
              )}
              <Text style={[styles.mutedText, { color: theme.textSecondary, marginTop: 10 }]}>
                Failed requests are refunded.
              </Text>
              <Text style={[styles.mutedText, { color: theme.textSecondary, marginTop: 2 }]}>
                Unused credits don&apos;t carry over to the next month.
              </Text>
            </View>
          )}
        </View>

        {/* ═══ Connected apps ═══ */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Connected apps</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          {mcp.error ? (
            <View style={styles.appRow}>
              <Text style={[styles.mutedText, { color: theme.textSecondary }]}>Unavailable</Text>
            </View>
          ) : !d ? (
            <View style={styles.appRow}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          ) : d.apps.length === 0 ? (
            <View style={styles.appRow}>
              <Text style={[styles.mutedText, { color: theme.textSecondary }]}>No apps connected yet</Text>
            </View>
          ) : (
            d.apps.map((name, i) => (
              <View key={name}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />}
                <View style={styles.appRow}>
                  <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
                    <Ionicons name="link" size={18} color={theme.textSecondary} />
                  </View>
                  <Text style={[styles.prefLabel, { color: theme.textPrimary }]} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.mainButton} activeOpacity={0.85} onPress={manage} accessibilityRole="button">
          <Text style={styles.mainButtonText}>Manage connections</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Values copied from the Profile screen styles so both screens match
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 24 },
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  creditsCard: { padding: 20, marginTop: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  overline: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  infoLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24 },
  infoLinkText: { color: ACCENT_ORANGE, fontSize: 13, fontWeight: '600' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  // The app's largest display number style (Plan screen date)
  balanceNumber: { fontSize: 48, fontWeight: '700', lineHeight: 52, fontVariant: ['tabular-nums'] },
  allowanceText: { fontSize: 17, fontWeight: '500' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 14 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: ACCENT_ORANGE },
  refillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  mutedText: { fontSize: 13, fontWeight: '500' },
  bonusPill: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 1,
  },
  bonusPillText: { color: ACCENT_ORANGE, fontSize: 12, fontWeight: '600' },
  loader: { alignSelf: 'flex-start', marginTop: 14 },
  infoBox: { borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  infoText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  costGroup: { marginTop: 12 },
  costGroupTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3, gap: 12 },
  costLabel: { flex: 1, fontSize: 13, fontWeight: '400' },
  costValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 56 },
  prefIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prefLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginLeft: 62 },
  // Same as the Profile screen's main (Log out) button
  mainButton: {
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: ACCENT_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
