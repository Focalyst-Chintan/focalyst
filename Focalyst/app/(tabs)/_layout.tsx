import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import AskFocalystModal from '../../components/AskFocalystModal';
import FloatingAddMenu from '../../components/FloatingAddMenu';
import { VoiceNoteRecorderModal } from '../../components/VoiceNoteRecorderModal';
import { supabase } from '../../src/utils/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

function ProfileButton({ isDarkMode }: { isDarkMode: boolean }) {
  const router = useRouter();
  const iconColor = isDarkMode ? '#FFFFFF' : '#4a6c8c';
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
  const iconColor = isDarkMode ? '#FFFFFF' : '#4a6c8c';
  const badgeBg = isDarkMode ? '#0B1021' : '#ffffff';
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
  const { t } = useTranslation();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const insets = useSafeAreaInsets();

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
    return () => sub.remove();
  }, []);

  const tabActiveColor = isDarkMode ? '#FF6B00' : '#4a6c8c';
  const tabInactiveColor = isDarkMode ? '#8E95A9' : '#94a3b8';
  const tabBgColor = isDarkMode ? '#0B1021' : '#FFFFFF';
  const tabBorderColor = isDarkMode ? '#151B2E' : '#E2E8F0';
  const headerBgColor = isDarkMode ? '#0B1021' : '#FFFFFF';
  const headerBorderColor = isDarkMode ? '#151B2E' : '#f1f5f9';
  const titleColor = isDarkMode ? '#FFFFFF' : '#4a6c8c';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Tabs
        initialRouteName="plan"
        detachInactiveScreens={false}
        screenOptions={{
          lazy: false,
          sceneStyle: { backgroundColor: isDarkMode ? '#0B1021' : '#F4F6FA' },
          ...({ sceneContainerStyle: { backgroundColor: isDarkMode ? '#0B1021' : '#F4F6FA' } } as any),
          tabBarActiveTintColor: tabActiveColor,
          tabBarInactiveTintColor: tabInactiveColor,
          tabBarStyle: {
            backgroundColor: tabBgColor,
            borderTopColor: tabBorderColor,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 5,
            height: 60 + Math.max(insets.bottom, 12),
          },
          headerStyle: {
            backgroundColor: headerBgColor,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: headerBorderColor,
          },
          headerTitleAlign: 'center',
          headerTitle: () => (
            <Text
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
            tabBarLabel: t('nav.plan'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            tabBarLabel: t('nav.focus'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'timer' : 'timer-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            tabBarLabel: t('nav.add'),
            tabBarAccessibilityLabel: t('nav.add'),
            tabBarButton: ({ delayLongPress, ...props }: any) => (
              <TouchableOpacity
                {...props}
                delayLongPress={delayLongPress ?? undefined}
                accessibilityRole="button"
                accessibilityLabel="Quick Add Menu"
              />
            ),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={24} color={color} />
            ),
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              setIsAddMenuVisible(true);
            },
          })}
        />
        <Tabs.Screen
          name="notes"
          options={{
            tabBarLabel: t('nav.notes'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            tabBarLabel: t('nav.insights'),
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

      <FloatingAddMenu
        isVisible={isAddMenuVisible}
        onClose={() => setIsAddMenuVisible(false)}
        onOpenVoice={() => setIsVoiceModalVisible(true)}
      />

      <VoiceNoteRecorderModal
        visible={isVoiceModalVisible}
        isDarkMode={isDarkMode}
        onClose={() => setIsVoiceModalVisible(false)}
        onSaveSuccess={(savedNote) => {
          setIsVoiceModalVisible(false);
          DeviceEventEmitter.emit('refreshNotes');
          if (savedNote?.id) {
            router.push(`/note/${savedNote.id}` as any);
          }
        }}
        userId={userId}
        supabase={supabase}
      />
    </>
  );
}
