import * as WebBrowser from 'expo-web-browser';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Linking,
  LayoutAnimation,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/utils/supabase';
import { isProPlan } from '../src/utils/plan';
import { getDisplayName } from '../src/utils/displayName';
import { formatMcpApps, useMcpSummary } from '../src/hooks/useMcpStatus';
import { openMcpConnections as openMcpConnectionsPage } from '../src/utils/openMcpConnections';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../src/lib/i18n';
import { queryCache } from '../src/utils/queryCache';
import { FAQ_DATA, PRIVACY_DATA, TERMS_DATA } from '../constants/supportCopy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGETS_ENABLED_KEY } from './widgets';

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACCENT_ORANGE = '#FF6B00';
const MUTED_BLUE_BG = '#4C6A8D';

const SUPPORT_URLS = {
  contact: 'https://www.chintan.store/emaillist',
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'hi', label: 'हिन्दी' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string | null;
  plan_expires_at?: string | null;
  task_reminders_enabled?: boolean;
  habit_reminders_enabled?: boolean;
  pomodoro_alerts_enabled?: boolean;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [habitReminders, setHabitReminders] = useState(true);
  const [pomodoroAlerts, setPomodoroAlerts] = useState(false);
  const [widgetsEnabled, setWidgetsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true); // Default dark mode to true
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Same check as everywhere else (src/utils/plan.ts): lifetime always, other paid plans until they expire.
  const isPro = isProPlan(user?.plan, user?.plan_expires_at);
  const mcp = useMcpSummary(isPro);
  const refreshMcp = mcp.refresh;

  const openMcpConnections = useCallback(async () => {
    // Resolves when the in-app browser is closed (iOS), so a new connection shows straight away
    await openMcpConnectionsPage();
    refreshMcp();
  }, [refreshMcp]);

  useEffect(() => {
    AsyncStorage.getItem(WIDGETS_ENABLED_KEY).then((val) => {
      if (val !== null) setWidgetsEnabled(val === 'true');
    });
  }, []);

  const handleWidgetsToggle = async (val: boolean) => {
    setWidgetsEnabled(val);
    await AsyncStorage.setItem(WIDGETS_ENABLED_KEY, String(val));
    if (val) {
      router.push('/widgets' as any);
    }
  };

  // Dynamic Theme Definitions
  const theme = {
    bg: darkMode ? '#0B1021' : '#F4F6FA',
    cardBg: darkMode ? '#151B2E' : '#FFFFFF',
    textPrimary: darkMode ? '#FFFFFF' : '#1E2229',
    textSecondary: darkMode ? '#8E95A9' : '#5C6479',
    borderColor: darkMode ? '#222A41' : '#E2E8F0',
    borderButtonColor: darkMode ? '#38425A' : '#E2E8F0',
    avatarBg: darkMode ? '#1C2438' : '#E8EDF2',
    deleteBtnBg: darkMode ? '#1E2538' : '#E2E8F0',
    deleteBtnText: darkMode ? '#FFFFFF' : '#1E2229',
    iconCircleBg: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // ── Fetch user profile and load theme ──
  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem('darkMode');
        if (val !== null) {
          setDarkMode(val === 'true');
        }
      } catch (e) {
        console.warn('Error loading darkMode from AsyncStorage:', e);
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('[Profile] Supabase fetch error:', error.message);
        } else if (profile) {
          setUser({
            id: profile.id,
            full_name: getDisplayName(profile, session.user),
            email: profile.email || session.user.email,
            avatar_url: profile.avatar_url,
            plan: profile.plan,
            plan_expires_at: profile.plan_expires_at ?? null,
            task_reminders_enabled: profile.task_reminders_enabled,
            habit_reminders_enabled: profile.habit_reminders_enabled,
            pomodoro_alerts_enabled: profile.pomodoro_alerts_enabled,
          });
          // Initialize toggle states from DB if the columns exist
          if (typeof profile.task_reminders_enabled === 'boolean') setTaskReminders(profile.task_reminders_enabled);
          if (typeof profile.habit_reminders_enabled === 'boolean') setHabitReminders(profile.habit_reminders_enabled);
          if (typeof profile.pomodoro_alerts_enabled === 'boolean') setPomodoroAlerts(profile.pomodoro_alerts_enabled);
        }
      } catch (err) {
        console.error('[Profile] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Toggle handler ──
  const handleToggle = useCallback(async (field: string, value: boolean) => {
    if (!user) return;
    try {
      await supabase
        .from('users')
        .update({ [field]: value })
        .eq('id', user.id);
    } catch (err) {
      console.error('[Profile] Toggle update error:', err);
    }
  }, [user]);

  // ── Language selection ──
  const handleLanguageSelect = useCallback(async (langCode: string) => {
    await changeLanguage(langCode);
    // Directly update the useTranslation i18n language context reference
    await i18n.changeLanguage(langCode);
    setLanguageModalVisible(false);
  }, [i18n]);

  // ── Delete account ──
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('settings.deleteAccountConfirmTitle'),
      t('settings.deleteAccountConfirmType'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              queryCache.clearAll();
              await supabase.auth.signOut();
              router.replace('/auth' as any);
            } catch (err) {
              console.error('[Profile] Delete account error:', err);
            }
          },
        },
      ]
    );
  }, [t, router]);

  // ── Logout ──
  const handleLogout = useCallback(async () => {
    queryCache.clearAll();
    await supabase.auth.signOut();
    router.replace('/auth' as any);
  }, [router]);

  // ── Get display language ──
  const currentLanguageLabel = LANGUAGES.find((l) => l.code === i18n.language)?.label || 'English';

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={ACCENT_ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Header ═══ */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('settings.profile')}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ═══ Avatar + Name ═══ */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.avatarBg, borderColor: theme.borderColor }]}>
              <Ionicons name="person" size={36} color={theme.textSecondary} />
            </View>
            {isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          {user?.full_name ? (
            <Text style={[styles.userName, { color: theme.textPrimary }]}>{user.full_name}</Text>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile-edit/name?isEditing=true')}>
              <Text style={[styles.userName, { color: theme.textSecondary }]}>Add your name</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user?.email || ''}</Text>
          <Text style={styles.userRole}>{t('settings.student')}</Text>
          <TouchableOpacity 
            style={[styles.editProfileButton, { borderColor: theme.borderButtonColor }]} 
            activeOpacity={0.7}
            onPress={() => router.push('/profile-edit/name?isEditing=true')}
          >
            <Text style={[styles.editProfileText, { color: theme.textPrimary }]}>{t('settings.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ Subscription Card ═══ */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionContent}>
            <Text style={styles.subscriptionLabel}>{t('settings.plan')}</Text>
            <Text style={styles.planName}>
              {isPro ? t('settings.lifetime').toUpperCase() : t('settings.free').toUpperCase()}
            </Text>
            <Text style={styles.renewalText}>
              {isPro ? t('settings.focusForever') : t('settings.basicAccess')}
            </Text>
            <TouchableOpacity
              style={styles.managePlanButton}
              activeOpacity={0.8}
              onPress={() => router.push('/paywall')}
            >
              <Text style={styles.managePlanText}>
                {isPro ? t('settings.manage') : t('insights.upgradeToPro')}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Decorative diamond watermark */}
          <View style={styles.diamondDecor}>
            <Ionicons name="diamond" size={90} color="rgba(255,255,255,0.08)" />
          </View>
        </View>

        {/* ═══ Notification Preferences ═══ */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.preferences')}</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          {/* Task Reminders */}
          <View style={styles.prefRow}>
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <Ionicons name="notifications" size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.prefLabel, { color: theme.textPrimary }]}>{t('settings.taskReminders')}</Text>
            <Switch
              value={taskReminders}
              onValueChange={(val) => {
                setTaskReminders(val);
                handleToggle('task_reminders_enabled', val);
              }}
              trackColor={{ false: darkMode ? '#222D47' : '#E2E8F0', true: ACCENT_ORANGE }}
              thumbColor="#ffffff"
              ios_backgroundColor={darkMode ? '#222D47' : '#E2E8F0'}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Habit Reminders */}
          <View style={styles.prefRow}>
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <Ionicons name="sync" size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.prefLabel, { color: theme.textPrimary }]}>{t('settings.habitReminders')}</Text>
            <Switch
              value={habitReminders}
              onValueChange={(val) => {
                setHabitReminders(val);
                handleToggle('habit_reminders_enabled', val);
              }}
              trackColor={{ false: darkMode ? '#222D47' : '#E2E8F0', true: ACCENT_ORANGE }}
              thumbColor="#ffffff"
              ios_backgroundColor={darkMode ? '#222D47' : '#E2E8F0'}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Pomodoro Alerts */}
          <View style={styles.prefRow}>
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <Ionicons name="timer" size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.prefLabel, { color: theme.textPrimary }]}>{t('settings.pomodoroAlerts')}</Text>
            <Switch
              value={pomodoroAlerts}
              onValueChange={(val) => {
                setPomodoroAlerts(val);
                handleToggle('pomodoro_alerts_enabled', val);
              }}
              trackColor={{ false: darkMode ? '#222D47' : '#E2E8F0', true: ACCENT_ORANGE }}
              thumbColor="#ffffff"
              ios_backgroundColor={darkMode ? '#222D47' : '#E2E8F0'}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Home Screen Widgets */}
          <TouchableOpacity
            style={styles.prefRow}
            activeOpacity={0.7}
            onPress={() => handleWidgetsToggle(true)}
          >
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <Ionicons name="grid" size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.prefLabel, { color: theme.textPrimary }]}>Home Screen Widgets</Text>
            <Switch
              value={widgetsEnabled}
              onValueChange={handleWidgetsToggle}
              trackColor={{ false: darkMode ? '#222D47' : '#E2E8F0', true: ACCENT_ORANGE }}
              thumbColor="#ffffff"
              ios_backgroundColor={darkMode ? '#222D47' : '#E2E8F0'}
            />
          </TouchableOpacity>
        </View>

        {/* ═══ General Preferences ═══ */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>General</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          {/* Language Selector */}
          <TouchableOpacity
            style={styles.prefRow}
            activeOpacity={0.6}
            onPress={() => setLanguageModalVisible(true)}
          >
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <Ionicons name="globe" size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.prefLabel, { color: theme.textPrimary }]}>{t('settings.language')}</Text>
            <View style={styles.languageValueRow}>
              <Text style={[styles.languageValue, { color: theme.textSecondary }]}>{currentLanguageLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Dark Mode */}
          <View style={styles.prefRow}>
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <Ionicons name="moon" size={18} color={theme.textSecondary} />
            </View>
            <Text style={[styles.prefLabel, { color: theme.textPrimary }]}>{t('settings.dark')}</Text>
            <Switch
              value={darkMode}
              onValueChange={async (val) => {
                setDarkMode(val);
                DeviceEventEmitter.emit('themeChanged', val);
                try {
                  await AsyncStorage.setItem('darkMode', val ? 'true' : 'false');
                } catch (e) {
                  console.warn('Error saving darkMode to AsyncStorage:', e);
                }
              }}
              trackColor={{ false: darkMode ? '#222D47' : '#E2E8F0', true: ACCENT_ORANGE }}
              thumbColor="#ffffff"
              ios_backgroundColor={darkMode ? '#222D47' : '#E2E8F0'}
            />
          </View>
        </View>

        {/* ═══ MCP ═══ */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>MCP</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          {/* Connect MCP */}
          <TouchableOpacity
            style={styles.prefRow}
            activeOpacity={0.6}
            accessibilityRole="button"
            onPress={isPro ? openMcpConnections : () => router.push('/paywall')}
          >
            <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
              <MaterialCommunityIcons name="power-plug" size={18} color={theme.textSecondary} />
            </View>
            {isPro ? (
              <>
                <Text style={[styles.prefLabel, { color: theme.textPrimary }]} numberOfLines={1}>Connect MCP</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </>
            ) : (
              <View style={styles.mcpLabelRow}>
                <Text style={[styles.prefLabel, styles.mcpLabelFixed, { color: theme.textPrimary }]} numberOfLines={1}>
                  Connect MCP
                </Text>
                <View style={styles.mcpProPill}>
                  <Text style={styles.mcpProPillText}>Requires Pro</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {isPro && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

              {/* MCP Credits */}
              <TouchableOpacity
                style={styles.prefRow}
                activeOpacity={0.6}
                accessibilityRole="button"
                onPress={() => router.push('/mcp-credits' as any)}
              >
                <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
                  <Ionicons name="flash" size={18} color={theme.textSecondary} />
                </View>
                <Text style={[styles.prefLabel, styles.mcpLabelFixed, { color: theme.textPrimary }]} numberOfLines={1}>
                  MCP Credits
                </Text>
                <View style={styles.mcpValueRow}>
                  <McpValue
                    part={mcp}
                    text={
                      mcp.data?.balance != null
                        ? `${mcp.data.balance.toLocaleString('en-US')} left`
                        : 'Unavailable'
                    }
                    color={theme.textSecondary}
                  />
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

              {/* Connected apps */}
              <TouchableOpacity
                style={styles.prefRow}
                activeOpacity={0.6}
                accessibilityRole="button"
                onPress={openMcpConnections}
              >
                <View style={[styles.prefIconBg, { backgroundColor: theme.iconCircleBg }]}>
                  <Ionicons name="link" size={18} color={theme.textSecondary} />
                </View>
                <Text style={[styles.prefLabel, styles.mcpLabelFixed, { color: theme.textPrimary }]} numberOfLines={1}>
                  Connected apps
                </Text>
                <View style={styles.mcpValueRow}>
                  <McpValue
                    part={mcp}
                    text={mcp.data ? formatMcpApps(mcp.data.apps) : ''}
                    color={theme.textSecondary}
                  />
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
        {!isPro && (
          <Text style={[styles.mcpCaption, { color: theme.textSecondary }]}>
            Connect Focalyst to ChatGPT and Claude. Available on Pro.
          </Text>
        )}

        {/* ═══ Support ═══ */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('settings.support')}</Text>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}>
          {/* How to use Row (in-app browser; public page, nothing appended to the URL) */}
          <TouchableOpacity
            style={styles.supportRow}
            activeOpacity={0.6}
            accessibilityRole="link"
            accessibilityLabel="How to use Focalyst, opens the guides"
            onPress={() => WebBrowser.openBrowserAsync('https://focalyst.online/guides').catch(() => {})}
          >
            <Text style={[styles.supportLabel, { color: theme.textPrimary }]}>How to use</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Help & FAQ Accordion Row */}
          <TouchableOpacity
            style={styles.supportRow}
            activeOpacity={0.6}
            onPress={() => toggleSection('faq')}
          >
            <Text style={[styles.supportLabel, { color: theme.textPrimary }]}>{t('settings.faq')}</Text>
            <Ionicons
              name={expandedSection === 'faq' ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          {expandedSection === 'faq' && (
            <View style={[styles.expandedContainer, { backgroundColor: darkMode ? '#0E1424' : '#F8FAFC', borderTopColor: theme.borderColor }]}>
              {FAQ_DATA.map((cat, idx) => (
                <View key={cat.title} style={[styles.accordionSection, idx > 0 && { marginTop: 16 }]}>
                  <Text style={styles.accordionCategoryHeader}>{cat.title}</Text>
                  {cat.items.map((item) => (
                    <View key={item.question} style={{ marginTop: 10 }}>
                      <Text style={[styles.accordionQuestion, { color: theme.textPrimary }]}>{item.question}</Text>
                      <Text style={[styles.accordionAnswer, { color: theme.textSecondary }]}>{item.answer}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Contact Us Row (External Link) */}
          <TouchableOpacity
            style={styles.supportRow}
            activeOpacity={0.6}
            onPress={() => Linking.openURL(SUPPORT_URLS.contact)}
          >
            <Text style={[styles.supportLabel, { color: theme.textPrimary }]}>{t('settings.contact')}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Privacy Policy Accordion Row */}
          <TouchableOpacity
            style={styles.supportRow}
            activeOpacity={0.6}
            onPress={() => toggleSection('privacy')}
          >
            <Text style={[styles.supportLabel, { color: theme.textPrimary }]}>{t('settings.privacy')}</Text>
            <Ionicons
              name={expandedSection === 'privacy' ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          {expandedSection === 'privacy' && (
            <View style={[styles.expandedContainer, { backgroundColor: darkMode ? '#0E1424' : '#F8FAFC', borderTopColor: theme.borderColor }]}>
              {PRIVACY_DATA.map((sec, idx) => (
                <View key={sec.title || idx} style={[styles.accordionSection, idx > 0 && { marginTop: 16 }]}>
                  {sec.title && <Text style={styles.accordionCategoryHeader}>{sec.title}</Text>}
                  {sec.content.map((p, pIdx) => (
                    <Text key={pIdx} style={[styles.accordionAnswer, { color: theme.textSecondary, marginTop: 6 }]}>
                      {p}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.borderColor }]} />

          {/* Terms of Service Accordion Row */}
          <TouchableOpacity
            style={styles.supportRow}
            activeOpacity={0.6}
            onPress={() => toggleSection('terms')}
          >
            <Text style={[styles.supportLabel, { color: theme.textPrimary }]}>{t('settings.terms')}</Text>
            <Ionicons
              name={expandedSection === 'terms' ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          {expandedSection === 'terms' && (
            <View style={[styles.expandedContainer, { backgroundColor: darkMode ? '#0E1424' : '#F8FAFC', borderTopColor: theme.borderColor }]}>
              {TERMS_DATA.map((sec, idx) => (
                <View key={sec.title || idx} style={[styles.accordionSection, idx > 0 && { marginTop: 16 }]}>
                  {sec.title && <Text style={styles.accordionCategoryHeader}>{sec.title}</Text>}
                  {sec.content.map((p, pIdx) => (
                    <Text key={pIdx} style={[styles.accordionAnswer, { color: theme.textSecondary, marginTop: 6 }]}>
                      {p}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ═══ Delete Account ═══ */}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.deleteBtnBg }]}
          activeOpacity={0.85}
          onPress={handleDeleteAccount}
        >
          <Text style={[styles.deleteButtonText, { color: theme.deleteBtnText }]}>{t('settings.deleteAccount')}</Text>
        </TouchableOpacity>

        {/* ═══ Version & Credits ═══ */}
        <View style={styles.metadataContainer}>
          <Text style={[styles.metadataText, { color: theme.textSecondary }]}>{t('settings.version')}</Text>
          <Text style={[styles.metadataText, { color: theme.textSecondary }]}>{t('settings.builtBy')}</Text>
        </View>

        {/* ═══ Logout ═══ */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.85}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ Language Picker Modal ═══ */}
      <LanguagePickerModal
        visible={languageModalVisible}
        currentLanguage={i18n.language}
        theme={theme}
        onSelect={handleLanguageSelect}
        onClose={() => setLanguageModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── MCP trailing value: loader, "Unavailable" or the value ────────────────────
function McpValue({
  part,
  text,
  color,
}: {
  part: { data: unknown; loading: boolean; error: boolean };
  text: string;
  color: string;
}) {
  if (part.error) {
    return <Text style={[styles.languageValue, styles.mcpValueText, { color }]} numberOfLines={1}>Unavailable</Text>;
  }
  if (part.data === null) {
    return <ActivityIndicator size="small" color={color} />;
  }
  return <Text style={[styles.languageValue, styles.mcpValueText, { color }]} numberOfLines={1}>{text}</Text>;
}

// ─── Language Picker Modal ─────────────────────────────────────────────────────
function LanguagePickerModal({
  visible,
  currentLanguage,
  theme,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentLanguage: string;
  theme: any;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalSheet, { backgroundColor: theme.cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.modalHandle, { backgroundColor: theme.borderColor }]} />
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('settings.language')}</Text>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.languageItem}
                activeOpacity={0.6}
                onPress={() => onSelect(item.code)}
              >
                <Text
                  style={[
                    styles.languageItemText,
                    { color: theme.textPrimary },
                    item.code === currentLanguage && styles.languageItemActive,
                  ]}
                >
                  {item.label}
                </Text>
                {item.code === currentLanguage && (
                  <Ionicons name="checkmark" size={20} color={ACCENT_ORANGE} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[styles.modalDivider, { backgroundColor: theme.borderColor }]} />}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  proBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: ACCENT_ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0B1021', // Use a dark offset for the overlapping badge border
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    color: ACCENT_ORANGE,
    fontWeight: '600',
    marginBottom: 12,
  },
  editProfileButton: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Subscription Card
  subscriptionCard: {
    backgroundColor: MUTED_BLUE_BG,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  subscriptionContent: {
    zIndex: 2,
  },
  subscriptionLabel: {
    color: '#B0B8C8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  renewalText: {
    color: '#B0B8C8',
    fontSize: 12,
    marginBottom: 16,
    marginTop: 2,
  },
  managePlanButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  managePlanText: {
    color: '#2C4259',
    fontSize: 15,
    fontWeight: '700',
  },
  diamondDecor: {
    position: 'absolute',
    top: 8,
    right: -10,
    zIndex: 1,
  },

  // Section Title
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 16,
  },

  // Card
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },

  // Preference Row
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  prefIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prefLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },

  // Language value
  languageValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageValue: {
    fontSize: 13,
    fontWeight: '500',
  },

  // MCP rows: the label keeps its width, the value takes what is left and truncates
  mcpLabelFixed: {
    flex: 0,
    flexShrink: 0,
    marginRight: 12,
  },
  mcpLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mcpValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  mcpValueText: {
    flexShrink: 1,
    textAlign: 'right',
  },
  // Same colour, radius and weight as the PRO badge, slightly smaller and without the overlap border
  mcpProPill: {
    backgroundColor: ACCENT_ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mcpProPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mcpCaption: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // Support Row
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  supportLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandedContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  accordionSection: {
    marginBottom: 8,
  },
  accordionCategoryHeader: {
    color: ACCENT_ORANGE,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  accordionQuestion: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  accordionAnswer: {
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
  },

  // Delete Button
  deleteButton: {
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Metadata
  metadataContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 2,
  },
  metadataText: {
    fontSize: 11,
    fontWeight: '400',
  },

  // Logout Button
  logoutButton: {
    backgroundColor: ACCENT_ORANGE,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: ACCENT_ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  languageItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  languageItemActive: {
    color: ACCENT_ORANGE,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
  },
});
