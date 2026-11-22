import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform, type StyleProp, type ViewStyle, DeviceEventEmitter } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AtmosphericGradientStops } from '../constants/themeTokens';

interface AtmosphericScreenBackgroundProps {
  children?: React.ReactNode;
  isDarkMode?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  withHeaderPadding?: boolean;
}

export function AtmosphericScreenBackground({
  children,
  isDarkMode: propDarkMode,
  style,
  contentContainerStyle,
  withHeaderPadding = true,
}: AtmosphericScreenBackgroundProps) {
  const insets = useSafeAreaInsets();
  const [internalDarkMode, setInternalDarkMode] = useState(true);

  useEffect(() => {
    if (propDarkMode !== undefined) return;
    let isMounted = true;
    const loadTheme = async () => {
      try {
        const val = await AsyncStorage.getItem('darkMode');
        if (val !== null && isMounted) {
          setInternalDarkMode(val === 'true');
        }
      } catch (e) {
        console.warn('Error loading theme in AtmosphericScreenBackground:', e);
      }
    };
    loadTheme();

    const sub = DeviceEventEmitter.addListener('themeChanged', (val: boolean) => {
      if (isMounted) setInternalDarkMode(val);
    });
    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [propDarkMode]);

  const isDark = propDarkMode !== undefined ? propDarkMode : internalDarkMode;
  const gradient = isDark ? AtmosphericGradientStops.dark : AtmosphericGradientStops.light;
  const headerHeight = insets.top + (Platform.OS === 'ios' ? 44 : 56);

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradient.colors as any}
        locations={gradient.locations as any}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[
          styles.content,
          withHeaderPadding && { paddingTop: headerHeight },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default AtmosphericScreenBackground;
