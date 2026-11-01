import React from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Layout helpers for resizable windows (iPhone Duo inner/outer display, iPad, Split View).
 *
 * Rules, from the iPhone Duo guidance:
 * - Read the size on every render (hooks), never once at module scope.
 * - Handle each inset edge on its own. On iPhone Duo the status bar sits on one side, so
 *   left and right insets differ.
 * - Branch on available space, never on device model or orientation.
 */

/** Widest a phone-style column gets on a regular-width display. */
export const CONTENT_MAX_WIDTH = 640;
/** Widest a bottom sheet gets on a regular-width display. */
export const SHEET_MAX_WIDTH = 600;
/** Both sides at least this wide ≈ regular × regular (iPhone Duo open, iPad). No iPhone reaches it. */
const REGULAR_MIN_SIDE = 600;

export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isRegular = Math.min(width, height) >= REGULAR_MIN_SIDE;
  const usableWidth = Math.max(0, width - insets.left - insets.right);
  const contentWidth = isRegular ? Math.min(usableWidth, CONTENT_MAX_WIDTH) : usableWidth;
  const centringSpace = (usableWidth - contentWidth) / 2;
  return {
    width,
    height,
    insets,
    isRegular,
    isLandscape: width > height,
    /** Width of the content column, after insets and the regular-width cap. */
    contentWidth,
    /** Distance from the window's left/right edge to the content column. */
    gutterLeft: insets.left + centringSpace,
    gutterRight: insets.right + centringSpace,
  };
}

/** Caps a block (e.g. a ScrollView's contentContainerStyle) to the column on regular width. */
export function useColumnStyle(): ViewStyle | null {
  const { isRegular } = useAdaptiveLayout();
  return isRegular ? { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' } : null;
}

/** Left/right safe-area padding, each edge on its own. */
export function useHorizontalInsetStyle(): ViewStyle {
  const insets = useSafeAreaInsets();
  return { paddingLeft: insets.left, paddingRight: insets.right };
}

/**
 * Wraps a full screen: keeps content out of the left/right safe area and centres it in a capped
 * column on regular width. The parent's background still fills the whole window.
 */
export function AdaptiveFrame({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const column = useColumnStyle();
  return (
    <View style={[{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right }, style]}>
      <View style={[{ flex: 1, width: '100%' }, column]}>{children}</View>
    </View>
  );
}

/** Caps and centres a block inside its parent on regular width; full width otherwise. */
export function ContentColumn({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const column = useColumnStyle();
  return <View style={[{ width: '100%' }, column, style]}>{children}</View>;
}

/**
 * Style for a bottom sheet inside a full-window Modal: clear of the left/right safe area, and on
 * regular width a centred sheet no wider than SHEET_MAX_WIDTH instead of one stretched edge to edge.
 */
// Returned as margins only, so it works on a stretched child and on @gorhom/bottom-sheet's `style`.
export function useSheetFrame(): { marginLeft: number; marginRight: number } {
  const { insets, isRegular, width } = useAdaptiveLayout();
  const usable = Math.max(0, width - insets.left - insets.right);
  const side = isRegular ? Math.max(0, (usable - SHEET_MAX_WIDTH) / 2) : 0;
  return { marginLeft: insets.left + side, marginRight: insets.right + side };
}
