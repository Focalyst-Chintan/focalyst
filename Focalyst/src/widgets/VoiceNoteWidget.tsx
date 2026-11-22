import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  strokeBorder,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { safeCreateWidget } from './safeCreateWidget';
import type { BaseWidgetThemeProps, WidgetEnv } from './types';

const VoiceNoteWidget = (rawProps: BaseWidgetThemeProps, env?: WidgetEnv) => {
  'widget';
  const props = rawProps ?? {};
  const preset = props.preset ?? 'emerald';
  const isDark = (env?.colorScheme ?? props.systemScheme ?? 'dark') === 'dark';
  const isAccented = env?.widgetRenderingMode === 'accented' || env?.widgetRenderingMode === 'vibrant';
  const WHITE = '255, 255, 255';
  const INK = '11, 11, 15';
  const textColor = isAccented
    ? '#FFFFFF'
    : preset === 'white'
      ? '#090A0F'
      : preset === 'monochrome'
        ? (isDark ? '#FFFFFF' : '#0B0B0F')
        : '#FFFFFF';
  const bandColor = isAccented
    ? `rgba(${WHITE}, 0.14)`
    : preset === 'white'
      ? 'rgba(9, 10, 15, 0.06)'
      : preset === 'monochrome'
        ? `rgba(${isDark ? WHITE : INK}, ${isDark ? 0.1 : 0.06})`
        : `rgba(${WHITE}, 0.1)`;
  const red = '#EF4444';

  return (
    <VStack spacing={8} modifiers={[padding({ all: 12 }), widgetURL('focalyst://voice-note?action=start')]}>
      <HStack modifiers={[padding({ horizontal: 8, vertical: 6 }), background(bandColor), cornerRadius(10), frame({ maxWidth: 1000 })]}>
        <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle(textColor)]}>Voice Note</Text>
        <Spacer />
      </HStack>
      <Spacer />
      <HStack alignment="center" spacing={8} modifiers={[padding({ leading: 2, bottom: 2 })]}>
        <VStack modifiers={[frame({ width: 34, height: 34 }), strokeBorder({ content: red, shape: 'circle', style: { lineWidth: 3 } })]}>
          <VStack modifiers={[frame({ width: 16, height: 16 }), background(red), cornerRadius(8)]}>
            <Spacer />
          </VStack>
        </VStack>
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(textColor), lineLimit(1), minimumScaleFactor(0.85)]}>Start</Text>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(textColor), lineLimit(1), minimumScaleFactor(0.85)]}>recording</Text>
        </VStack>
        <Spacer />
      </HStack>
    </VStack>
  );
};

export default safeCreateWidget('VoiceNoteWidget', VoiceNoteWidget, {
  preset: 'emerald',
  systemScheme: 'dark',
});
