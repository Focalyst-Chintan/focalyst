import { Column, Row, Text } from '@expo/ui/jetpack-compose';
import { background, clip, fillMaxSize, fillMaxWidth, paddingAll, Shapes } from '@expo/ui/jetpack-compose/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { StreakWidgetProps, WidgetEnv } from './types';

const StreakWidget = (props: StreakWidgetProps, env?: WidgetEnv) => {
  'widget';
  const scheme = env?.colorScheme ?? props.systemScheme ?? 'dark';
  const isDark = scheme === 'dark';
  const preset = props.preset ?? 'ember';

  const cornerRadius = (r: number) => clip(Shapes.RoundedCorner(r));

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

  const p = getPalette();

  return (
    <Column modifiers={[fillMaxSize(), paddingAll(12), background(p.outerBg), cornerRadius(16)]}>
      <Row modifiers={[fillMaxWidth(), background(p.glowBand), cornerRadius(10), paddingAll(6)]}>
        <Text color={p.text} style={{ fontSize: 11, fontWeight: 'bold' }}>
          {`🔥 ${props.habitName}`}
        </Text>
        <Text color={p.muted} style={{ fontSize: 11, fontWeight: 'bold' }}>
          {` ${props.totalDays}d`}
        </Text>
      </Row>

      <Column modifiers={[paddingAll(4)]}>
        <Text color={p.muted} style={{ fontSize: 11 }}>
          Streak Days
        </Text>
        <Text color={p.text} style={{ fontSize: 34, fontWeight: 'bold' }}>
          {`${props.streakDays}`}
        </Text>
      </Column>

      <Row modifiers={[background(p.track), cornerRadius(4), paddingAll(4)]}>
        <Text color={p.accent} style={{ fontSize: 10, fontWeight: 'bold' }}>
          {`${props.streakDays} / ${props.goalDays || 30} days`}
        </Text>
      </Row>
    </Column>
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
