import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { floatingShadow, type, useBlockingTheme } from '../../constants/blockingTheme';
import { useHideDevFab } from '../../src/blocking/devFab';
import { PrimaryButton, TextButton } from './Buttons';

const SCREEN_H = Dimensions.get('window').height;

const SHEET_SCRIM = 'rgba(0, 0, 0, 0.65)';

/**
 * Opaque bottom sheet with grab handle and scrim. Drag down past 30% to dismiss. Rides above the
 * keyboard so inputs and the primary button stay visible.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { c, isDark } = useBlockingTheme();
  const insets = useSafeAreaInsets();
  useHideDevFab(visible);
  const translate = useRef(new Animated.Value(SCREEN_H)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const height = useRef(400);

  useEffect(() => {
    if (!visible) return;
    translate.setValue(SCREEN_H);
    Animated.parallel([
      Animated.spring(translate, { toValue: 0, stiffness: 300, damping: 26, useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [visible, translate, scrim]);

  const close = () => {
    Animated.parallel([
      Animated.timing(translate, { toValue: height.current, duration: 200, useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => translate.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > height.current * 0.3 || g.vy > 1.2) close();
        else Animated.spring(translate, { toValue: 0, stiffness: 300, damping: 26, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: SHEET_SCRIM, opacity: scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          onLayout={(e) => (height.current = e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            floatingShadow(isDark),
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              paddingBottom: 20 + insets.bottom,
              transform: [{ translateY: translate }],
            },
          ]}
        >
          <View {...pan.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type DialogAction = { label: string; onPress: () => void; danger?: boolean };

/** Centered dialog: scale 0.96 to 1 + fade. */
export function Dialog({
  visible,
  title,
  body,
  primary,
  secondary,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  /** Filled primary button. Omit for two text buttons (S13d). */
  primary?: DialogAction;
  secondary: DialogAction;
  tertiary?: DialogAction;
  onClose: () => void;
}) {
  const { c } = useBlockingTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dialogWrap, { backgroundColor: c.scrim, opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
            },
          ]}
        >
          <Text style={[type.cardTitle, { color: c.textPrimary }]}>{title}</Text>
          <Text style={[type.body, { color: c.textSecondary, marginTop: 8 }]}>{body}</Text>
          {primary ? (
            <View style={{ marginTop: 24, gap: 4 }}>
              <PrimaryButton label={primary.label} onPress={primary.onPress} />
              <TextButton
                label={secondary.label}
                onPress={secondary.onPress}
                color={secondary.danger ? c.danger : undefined}
              />
            </View>
          ) : (
            <View style={styles.dialogTextRow}>
              <TextButton label="Cancel" onPress={onClose} />
              <TextButton
                label={secondary.label}
                onPress={secondary.onPress}
                color={secondary.danger ? c.danger : undefined}
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
  },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  dialogWrap: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 340, borderRadius: 24, borderWidth: 1, padding: 24 },
  dialogTextRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
});
