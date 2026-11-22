import { Tabs, useRouter, usePathname } from 'expo-router';
import { useWindowDimensions, View, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import AskFocalystModal from '../../components/AskFocalystModal';
import FloatingGlassTabBar from '../../components/FloatingGlassTabBar';
import { VoiceNoteRecorderModal } from '../../components/VoiceNoteRecorderModal';
import { VoiceNoteProvider, useVoiceNoteRecorder } from '../../src/services/VoiceNoteContext';
import { supabase } from '../../src/utils/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveFrame } from '../../src/layout/adaptive';

function ProfileButton({ isDarkMode }: { isDarkMode: boolean }) {
  const router = useRouter();
  const iconColor = '#FFFFFF';
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push('/profile' as any)}
      style={{
        paddingLeft: 16,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons color={iconColor} name="person-circle" size={32} />
    </TouchableOpacity>
  );
}

function AskAIButton({ isDarkMode, onPress }: { isDarkMode: boolean; onPress: () => void }) {
  const iconColor = '#FFFFFF';
  const badgeBg = isDarkMode ? '#03195b' : '#1951fc';
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="chatbubble-outline" size={24} color={iconColor} />
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 0,
            backgroundColor: badgeBg,
            borderRadius: 99,
            width: 12,
            height: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="add" size={10} color={iconColor} style={{ fontWeight: 'bold' }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <VoiceNoteProvider>
      <TabLayoutContent />
    </VoiceNoteProvider>
  );
}

function TabLayoutContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { openAndStartRecording } = useVoiceNoteRecorder();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    const checkTheme = async () => {
      try {
        const val = await AsyncStorage.getItem('darkMode');
        if (val !== null) {
          setIsDarkMode(val === 'true');
        }
      } catch (e) {
        console.warn('Error loading theme in TabLayout:', e);
      }
    };
    checkTheme();

    const fetchAuthUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (e) {
        console.warn('Error fetching auth user in TabLayout:', e);
      }
    };
    fetchAuthUser();

    const sub = DeviceEventEmitter.addListener('themeChanged', (newVal: boolean) => {
      setIsDarkMode(newVal);
    });
    const pomoSub = DeviceEventEmitter.addListener('FOCALYST_POMODORO_ACTIVE_CHANGED', (active: boolean) => {
      setIsPomodoroActive(Boolean(active));
    });
    return () => {
      sub.remove();
      pomoSub.remove();
    };
  }, []);

  const titleColor = '#FFFFFF';

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        initialRouteName="plan"
        detachInactiveScreens={false}
        // Every tab: content clear of the left/right safe area (side status bar on iPhone Duo)
        // and centred in a capped column on regular width. Header and tab bar handle their own insets.
        screenLayout={({ children }) => <AdaptiveFrame>{children}</AdaptiveFrame>}
        screenOptions={{
          lazy: false,
          headerTransparent: true,
          sceneStyle: { backgroundColor: 'transparent' },
          ...({ sceneContainerStyle: { backgroundColor: 'transparent' } } as any),
          tabBarStyle: { display: 'none' },
          headerStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleAlign: 'center',
          // The header's own title limit uses a frame that can stay at the portrait width after
          // rotating, which squeezed "FOCALYST" onto two lines in landscape. Same formula, live width.
          headerTitleContainerStyle: {
            maxWidth: windowWidth - (80 + 16 + Math.max(insets.left, insets.right)) * 2,
          },
          headerTitle: () => (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 16,
                fontWeight: '700',
                letterSpacing: 4,
                color: titleColor,
                textAlign: 'center',
              }}
            >
              FOCALYST
            </Text>
          ),
          headerLeft: () => <ProfileButton isDarkMode={isDarkMode} />,
          headerRight: () => <AskAIButton isDarkMode={isDarkMode} onPress={() => setIsAiModalVisible(true)} />,
        }}
      >
        <Tabs.Screen
          name="plan"
          options={{
            tabBarShowLabel: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            tabBarShowLabel: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'timer' : 'timer-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            tabBarShowLabel: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            tabBarShowLabel: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            tabBarShowLabel: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
      
      <AskFocalystModal 
        isVisible={isAiModalVisible} 
        onClose={() => setIsAiModalVisible(false)} 
        isDarkMode={isDarkMode}
      />

      <FloatingGlassTabBar
        activeRoute={pathname}
        isDarkMode={isDarkMode}
        hidden={isPomodoroActive}
        onNavigate={(route) => router.navigate(`/(tabs)/${route}` as any)}
        onAddTask={() => router.push({ pathname: '/(tabs)/plan', params: { action: 'addTask', t: Date.now() } } as any)}
        onStartSession={() => {
          const ts = String(Date.now());
          router.push({ pathname: '/(tabs)/focus', params: { action: 'startSession', quickStartTs: ts, t: ts } } as any);
          DeviceEventEmitter.emit('FOCALYST_QUICK_START_POMODORO', { quickStartTs: ts });
        }}
        onVoice={openAndStartRecording}
        onChat={() => setIsAiModalVisible(true)}
      />

      <VoiceNoteRecorderModal isDarkMode={isDarkMode} />
    </>
  );
}
