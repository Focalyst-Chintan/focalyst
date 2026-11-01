import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { floatingShadow, useBlockingTheme } from '../../constants/blockingTheme';
import { useColumnStyle } from '../../src/layout/adaptive';

/** Full-screen setup page: `bg` on the root, scrolling content, pinned bottom actions. */
export function SetupScreen({
  header,
  footer,
  children,
  contentStyle,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c, isDark } = useBlockingTheme();
  const column = useColumnStyle();
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.root, { backgroundColor: c.bg }]}>
      {header ? <View style={[styles.header, column]}>{header}</View> : null}
      <ScrollView contentContainerStyle={[styles.content, column, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, floatingShadow(isDark), { backgroundColor: c.bg }]}>
          <View style={[styles.footerInner, column]}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  footerInner: { gap: 8 },
});
