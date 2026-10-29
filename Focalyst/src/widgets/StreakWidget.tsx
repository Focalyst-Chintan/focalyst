import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { StreakWidgetProps, WidgetEnv } from './types';

const StreakWidget = (props: StreakWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'ember';

  const getPalette = () => {
    if (preset === 'white' || (preset === 'monochrome' && !isDark)) {
      return { outerBg: '#F8FAFC', glowBand: '#E2E8F0', text: '#090A0F', muted: '#475569', accent: '#0F172A', track: '#CBD5E1' };
    }
    if (preset === 'monochrome') {
      return { outerBg: '#090A0F', glowBand: '#181B24', text: '#FFFFFF', muted: '#94A3B8', accent: '#FFFFFF', track: '#262936' };
    }
    const map: Record<string, any> = {
      ember: { outerBg: '#160804', glowBand: '#5E1E0C', text: '#FFFFFF', muted: '#FDBA74', accent: '#FF5500', track: '#3E160B' },
      cobalt: { outerBg: '#060D1F', glowBand: '#153480', text: '#FFFFFF', muted: '#93C5FD', accent: '#3B82F6', track: '#172B5C' },
      emerald: { outerBg: '#05140F', glowBand: '#0F4230', text: '#FFFFFF', muted: '#6EE7B7', accent: '#10B981', track: '#12382B' },
      violet: { outerBg: '#0C061C', glowBand: '#37197A', text: '#FFFFFF', muted: '#C4B5FD', accent: '#8B5CF6', track: '#271552' },
      crimson: { outerBg: '#190509', glowBand: '#631321', text: '#FFFFFF', muted: '#FDA4AF', accent: '#F43F5E', track: '#47101A' },
      amber: { outerBg: '#170F04', glowBand: '#59370B', text: '#FFFFFF', muted: '#FDE68A', accent: '#F59E0B', track: '#422B0B' },
    };
    return map[preset] ?? map.ember;
  };

  // Tinted and Clear home screens render widgets in the accented mode: fixed colours and opaque
  // fills turn into solid tiles there, so use hierarchical styles and alpha-only fills instead.
  const tinted = env?.widgetRenderingMode === 'accented' || env?.widgetRenderingMode === 'vibrant';
  const accent = tinted ? [{ $type: 'widgetAccentable', accentable: true }] : [];
  const primary = { type: 'hierarchical', style: 'primary' };
  const secondary = { type: 'hierarchical', style: 'secondary' };
  const p = tinted
    ? { outerBg: '', glowBand: '#1FFFFFFF', text: primary, muted: secondary, accent: '#FFFFFFFF', track: '#33FFFFFF' }
    : getPalette();
  const goal = props.goalDays && props.goalDays > 0 ? props.goalDays : 30;
  const fillWidth = Math.max(18, Math.min(120, Math.round((props.streakDays / goal) * 120)));

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <HStack modifiers={[padding({ horizontal: 8, vertical: 6 }), background(p.glowBand), cornerRadius(10)]}>
        <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(p.text)]}>
          {`🔥 ${props.habitName}`}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(p.muted)]}>
          {`${props.totalDays}d`}
        </Text>
      </HStack>

      <Spacer />

      <VStack>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(p.muted)]}>
          Streak Days
        </Text>
        <Text modifiers={[font({ size: 34, weight: 'bold' }), foregroundStyle(p.text), ...accent]}>
          {`${props.streakDays}`}
        </Text>
      </VStack>

      <Spacer />

      <HStack modifiers={[frame({ width: 120, height: 6 }), background(p.track), cornerRadius(4)]}>
        <HStack modifiers={[frame({ width: fillWidth, height: 6 }), background(p.accent), cornerRadius(4), ...accent]}>
          {null}
        </HStack>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export default safeCreateWidget('StreakWidget', StreakWidget, {
  preset: 'ember',
  systemScheme: 'dark',
  habitName: 'Yoga',
  streakDays: 26,
  totalDays: 48,
  goalDays: 30,
});
