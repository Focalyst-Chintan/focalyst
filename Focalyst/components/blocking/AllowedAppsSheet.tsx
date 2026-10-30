import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';

import type { AndroidAppItem } from '../../modules/screen-time-blocker';
import { type, useBlockingTheme } from '../../constants/blockingTheme';
import { RATCHET_MESSAGE, useBlocking } from '../../src/blocking/BlockingContext';
import { haptics } from '../../src/blocking/haptics';
import { BottomSheet } from './Overlays';
import { PrimaryButton } from './Buttons';
import { AppRow, SearchField, filterApps } from './AndroidAppList';

const LIST_HEIGHT = Math.round(Dimensions.get('window').height * 0.5);

/** Android S6 "+ Add": pick the apps that never get locked. */
export function AllowedAppsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useBlockingTheme();
  const { installedApps, loadInstalledApps, allowedPackages, setAllowedPackages, canEditAllowed, showSnackbar } =
    useBlocking();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allowedPackages));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelected(new Set(allowedPackages));
    if (!installedApps) loadInstalledApps();
    // Reset only when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const apps = useMemo(() => filterApps(installedApps?.allApps ?? [], query), [installedApps, query]);

  const toggle = useCallback(
    (app: AndroidAppItem) => {
      const next = new Set(selected);
      if (next.has(app.packageName)) {
        next.delete(app.packageName);
      } else {
        // Allowing an app loosens blocking, which a strict block in progress doesn't permit.
        if (!canEditAllowed) {
          haptics.error();
          showSnackbar(RATCHET_MESSAGE);
          return;
        }
        next.add(app.packageName);
      }
      setSelected(next);
    },
    [canEditAllowed, selected, showSnackbar]
  );

  const done = async () => {
    setSaving(true);
    const result = await setAllowedPackages([...selected]);
    setSaving(false);
    if (!result.ok) return showSnackbar(result.reason);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={[type.cardTitle, { color: c.textPrimary }]}>Always allowed</Text>
      <Text style={[type.secondary, { color: c.textSecondary, marginTop: 4 }]}>These apps never get locked.</Text>
      <View style={{ marginTop: 16 }}>
        <SearchField value={query} onChangeText={setQuery} />
      </View>
      <View style={{ height: LIST_HEIGHT, marginTop: 16 }}>
        {installedApps ? (
          <FlatList
            data={apps}
            keyExtractor={(a) => a.packageName}
            extraData={selected}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            renderItem={({ item, index }) => (
              <AppRow
                app={item}
                first={index === 0}
                last={index === apps.length - 1}
                checked={selected.has(item.packageName)}
                subtitle={item.avgDailyMinutes > 0 ? item.formattedUsage : undefined}
                onPress={toggle}
              />
            )}
            ListEmptyComponent={
              <Text style={[type.secondary, styles.empty, { color: c.textSecondary }]}>
                No apps match "{query.trim()}"
              </Text>
            }
          />
        ) : (
          <ActivityIndicator color={c.accent} style={{ marginTop: 32 }} />
        )}
      </View>
      <PrimaryButton label="Done" onPress={done} loading={saving} style={{ marginTop: 16 }} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', paddingVertical: 24 },
});
