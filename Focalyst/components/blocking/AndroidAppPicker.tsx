import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import type { AndroidAppItem } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { FREE_MAX_APPS, RATCHET_MESSAGE, openPaywall, useBlocking } from '../../src/blocking/BlockingContext';
import { haptics } from '../../src/blocking/haptics';
import { useLeaveSetup, useSetupSteps } from '../../src/blocking/setupNav';
import { SetupTopBar } from './SetupTopBar';
import { CircleIconButton, PrimaryButton } from './Buttons';
import { AppRow, ListSectionHeader, SearchField, filterApps } from './AndroidAppList';

type Item =
  | { kind: 'header'; key: string; title: string; right?: string }
  | { kind: 'row'; key: string; app: AndroidAppItem; first: boolean; last: boolean }
  | { kind: 'note'; key: string; text: string };

const rows = (section: string, apps: AndroidAppItem[]): Item[] =>
  apps.map((app, i) => ({
    kind: 'row',
    key: `${section}:${app.packageName}`,
    app,
    first: i === 0,
    last: i === apps.length - 1,
  }));

/** S4 (Android): searchable list of installed apps, most used first. `?mode=edit` comes from Manage. */
export function AndroidAppPicker() {
  const { c, glass } = useBlockingTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const steps = useSetupSteps('apps');
  const editMode = steps.mode === 'edit';
  const { back, dialog } = useLeaveSetup(!editMode && steps.isFirst);
  const {
    installedApps,
    loadInstalledApps,
    blockedPackages,
    allowedPackages,
    setBlockedPackages,
    canEditBlocklist,
    isPro,
    showSnackbar,
  } = useBlocking();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(blockedPackages));
  const [scrolled, setScrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [barHeight, setBarHeight] = useState(88);

  // Fresh usage numbers every time the picker opens; the cached list shows meanwhile.
  useEffect(() => {
    loadInstalledApps();
  }, [loadInstalledApps]);

  // The saved list can arrive after the screen opens; follow it until the user changes something.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setSelected(new Set(blockedPackages));
  }, [blockedPackages]);

  const allowed = useMemo(() => new Set(allowedPackages), [allowedPackages]);

  const toggle = useCallback(
    (app: AndroidAppItem) => {
      const pkg = app.packageName;
      if (allowed.has(pkg)) {
        haptics.error();
        showSnackbar(`${app.appName} is always allowed. Remove it there to block it.`);
        return;
      }
      const next = new Set(selected);
      if (next.has(pkg)) {
        // During a strict block the list can grow but not shrink.
        if (!canEditBlocklist && blockedPackages.includes(pkg)) {
          haptics.error();
          showSnackbar(RATCHET_MESSAGE);
          return;
        }
        next.delete(pkg);
      } else {
        if (!isPro && next.size >= FREE_MAX_APPS) {
          haptics.error();
          openPaywall();
          return;
        }
        next.add(pkg);
      }
      touched.current = true;
      setSelected(next);
    },
    [allowed, blockedPackages, canEditBlocklist, isPro, selected, showSnackbar]
  );

  const items = useMemo<Item[]>(() => {
    if (!installedApps) return [];
    const all = filterApps(installedApps.allApps, query);
    const list: Item[] = [];
    if (!query.trim() && installedApps.mostUsed.length > 0) {
      list.push({ kind: 'header', key: 'h:most', title: 'Most used', right: 'Last 7 days' });
      list.push(...rows('most', installedApps.mostUsed));
    }
    list.push({ kind: 'header', key: 'h:all', title: 'All apps' });
    if (all.length === 0) list.push({ kind: 'note', key: 'empty', text: `No apps match "${query.trim()}"` });
    else list.push(...rows('all', all));
    return list;
  }, [installedApps, query]);

  const save = async () => {
    setSaving(true);
    const result = await setBlockedPackages([...selected]);
    setSaving(false);
    if (!result.ok) {
      if (result.pro) return openPaywall();
      return showSnackbar(result.reason);
    }
    if (editMode) router.back();
    else router.push(`/blocking/level?${steps.carry}`);
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'header') {
      return (
        <View style={{ marginTop: 24 }}>
          <ListSectionHeader title={item.title} right={item.right} />
        </View>
      );
    }
    if (item.kind === 'note') {
      return <Text style={[type.secondary, styles.note, { color: c.textSecondary }]}>{item.text}</Text>;
    }
    const { app } = item;
    const isAllowed = allowed.has(app.packageName);
    return (
      <AppRow
        app={app}
        first={item.first}
        last={item.last}
        checked={!isAllowed && selected.has(app.packageName)}
        disabled={isAllowed}
        subtitle={isAllowed ? 'Always allowed' : app.avgDailyMinutes > 0 ? app.formattedUsage : undefined}
        onPress={toggle}
      />
    );
  };

  const header = (
    <View>
      {!editMode && (
        <>
          <Text style={[type.setupTitle, { color: c.textPrimary, marginTop: 8 }]}>What pulls you away?</Text>
          <Text style={[type.secondary, { color: c.textSecondary, marginTop: 8 }]}>
            Pick specific apps. You can change this anytime.
          </Text>
        </>
      )}
      <View style={{ marginTop: editMode ? 8 : 16 }}>
        <SearchField value={query} onChangeText={setQuery} />
      </View>
    </View>
  );

  const count = selected.size;
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const { height: viewH } = e.nativeEvent.layoutMeasurement;
    const contentH = e.nativeEvent.contentSize.height;
    // Glass while content is passing underneath the bar.
    const next = y + viewH < contentH - 1;
    if (next !== scrolled) setScrolled(next);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        {editMode ? (
          <View style={styles.appBar}>
            <CircleIconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Back" />
            <Text style={[type.cardTitle, { color: c.textPrimary }]}>Blocked apps</Text>
          </View>
        ) : (
          <SetupTopBar step={steps.step} total={steps.total} onBack={back} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        extraData={selected}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.loading}>
            <ActivityIndicator color={c.accent} />
            <Text style={[type.secondary, { color: c.textSecondary, marginTop: 12 }]}>Loading your apps…</Text>
          </View>
        }
        contentContainerStyle={[styles.content, { paddingBottom: barHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={32}
        initialNumToRender={16}
        windowSize={9}
        showsVerticalScrollIndicator={false}
      />

      <View
        onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
        style={[
          styles.bar,
          {
            backgroundColor: scrolled ? glass : c.bg,
            borderTopColor: scrolled ? c.glassBorder : 'transparent',
            paddingBottom: 16 + insets.bottom,
          },
        ]}
      >
        {count > 0 ? (
          <Text style={[type.bodyStrong, type.tabular, { color: c.textPrimary, flex: 1 }]}>{count} selected</Text>
        ) : (
          <Text style={[type.secondary, { color: c.textSecondary, flex: 1 }]}>Pick at least 1 app</Text>
        )}
        <PrimaryButton
          label={editMode ? 'Save' : 'Continue'}
          onPress={save}
          loading={saving}
          disabled={count === 0}
          onDisabledPress={() => showSnackbar('Pick at least 1 app')}
          style={{ minWidth: 140 }}
        />
      </View>
      {dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20 },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { paddingHorizontal: 20 },
  note: { paddingVertical: 16, textAlign: 'center' },
  loading: { alignItems: 'center', paddingVertical: 48 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
});
