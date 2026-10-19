import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Share,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import {
  fetchMyGroupLeaderboard,
  leaveCurrentHabitGroup,
  GroupLeaderboardData,
  HABIT_GROUP_UPDATED_EVENT,
} from '../../src/services/habitGroupService';
import { FormGroupModal, EnterGroupModal } from '../plan/HabitGroupModals';

interface HabitGroupLeaderboardSectionProps {
  isDark: boolean;
  activeHabits?: any[];
  userId?: string | null;
  onRefreshInsights?: () => void;
}

export default function HabitGroupLeaderboardSection({
  isDark,
  activeHabits = [],
  userId,
  onRefreshInsights,
}: HabitGroupLeaderboardSectionProps) {
  const insets = useSafeAreaInsets();
  const viewShotRef = useRef<any>(null);
  const [groupData, setGroupData] = useState<GroupLeaderboardData>({
    in_group: false,
    members: [],
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [isCapturingShareImage, setIsCapturingShareImage] = useState(false);

  // Silently refresh leaderboard data without blanking the screen into a skeleton
  const refreshLeaderboardSilently = useCallback(async () => {
    try {
      const data = await fetchMyGroupLeaderboard();
      setGroupData(data || { in_group: false, members: [] });
    } catch (e) {
      console.warn('Error refreshing habit group leaderboard:', e);
    }
  }, []);

  useEffect(() => {
    void refreshLeaderboardSilently();
    const sub = DeviceEventEmitter.addListener(HABIT_GROUP_UPDATED_EVENT, () => {
      void refreshLeaderboardSilently();
      onRefreshInsights?.();
    });
    return () => {
      sub.remove();
    };
  }, [refreshLeaderboardSilently, onRefreshInsights]);

  // Export Spotify-Style Leaderboard Card for Instagram Stories / WhatsApp
  const handleShareCard = async () => {
    if (sharingImage) return;
    setSharingImage(true);
    setIsCapturingShareImage(true);
    try {
      // Wait 80ms for React to hide the invite code badge before capturing the PNG
      await new Promise((resolve) => setTimeout(resolve, 80));
      const uri = await viewShotRef.current?.capture?.();
      setIsCapturingShareImage(false);
      if (!uri) {
        Alert.alert('Export Failed', 'Could not snapshot leaderboard card.');
        return;
      }

      if (await isAvailableAsync()) {
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Focalyst Habit Group Leaderboard',
          UTI: 'public.png',
        });
      } else {
        await Share.share({
          url: uri,
          message: `Check out our ${currentHabitName} streak leaderboard on Focalyst! 🚀\n\nDownload Focalyst: https://focalyst.online/app`,
        });
      }
    } catch (err: any) {
      setIsCapturingShareImage(false);
      Alert.alert('Sharing Error', err?.message || 'Could not export leaderboard image.');
    } finally {
      setIsCapturingShareImage(false);
      setSharingImage(false);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this habit group? You will be removed from the leaderboard.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Group',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveCurrentHabitGroup();
              await refreshLeaderboardSilently();
              onRefreshInsights?.();
              setModalVisible(false);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Could not leave group.');
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  };

  // Default habit fallback from active habits
  const defaultHabit = activeHabits.length > 0 ? activeHabits[0] : null;

  // Enrich members with real streak and total days if user's local habit data is richer
  const enrichedMembers = useMemo(() => {
    return groupData.members.map((m) => {
      const cleanDisplayName = (m.display_name || '').replace(/\s*\(you\)/i, '').trim();
      if (m.is_me) {
        const matchingHabit =
          activeHabits.find((h) => h.id === m.habit_id) || defaultHabit;
        const realStreak = m.streak || matchingHabit?.current_streak || 0;
        const realTotalDays = m.total_days || matchingHabit?.total_days || 0;
        const realHabitName =
          m.habit_name && m.habit_name !== 'Active Habit'
            ? m.habit_name
            : matchingHabit?.name || 'Active Habit';
        return {
          ...m,
          display_name: cleanDisplayName || 'You',
          streak: realStreak,
          total_days: realTotalDays,
          habit_name: realHabitName,
        };
      }
      return {
        ...m,
        display_name: cleanDisplayName || 'Member',
      };
    });
  }, [groupData.members, activeHabits, defaultHabit]);

  // Sort members: highest streak first, then total completed days
  const sortedMembers = useMemo(() => {
    return [...enrichedMembers].sort(
      (a, b) => b.streak - a.streak || b.total_days - a.total_days
    );
  }, [enrichedMembers]);

  const myIndex = sortedMembers.findIndex((m) => m.is_me);
  const myMember = myIndex >= 0 ? sortedMembers[myIndex] : null;
  const myRank = myIndex >= 0 ? myIndex + 1 : 1;
  const memberCount = sortedMembers.length;
  const inviteCode = groupData.invite_code || '';

  // Determine selected habit for display
  const selectedHabit =
    (myMember?.habit_id
      ? activeHabits.find((h) => h.id === myMember.habit_id)
      : null) || defaultHabit;

  const currentStreak = myMember?.streak ?? selectedHabit?.current_streak ?? 0;
  const currentTotalDays = myMember?.total_days ?? selectedHabit?.total_days ?? 0;
  const currentHabitName =
    myMember?.habit_name || selectedHabit?.name || 'Active Habit';

  // Theme tokens
  const cardBg = isDark ? '#151B2E' : '#FFFFFF';
  const cardBorder = isDark ? '#222A41' : '#E2E8F0';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#8E95A9' : '#64748B';
  const royalBlue = isDark ? '#2B6BFF' : '#2563EB';

  return (
    <>
      {/* ─── Compact Preview Card on Insights Tab ─── */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setModalVisible(true)}
        style={[
          styles.previewCard,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
        ]}
      >
        {/* Header Row: Title never truncates */}
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: isDark ? 'rgba(43, 107, 255, 0.15)' : '#EFF6FF' },
              ]}
            >
              <Ionicons name="trophy" size={17} color={royalBlue} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.cardTitle, { color: textPrimary, flex: 1 }]}
            >
              Habit Leaderboard
            </Text>
          </View>

          <View style={styles.headerRightRow}>
            {groupData.in_group && (
              <View
                style={[
                  styles.memberCountPill,
                  { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' },
                ]}
              >
                <Ionicons name="people" size={12} color={royalBlue} />
                <Text style={[styles.memberCountText, { color: royalBlue }]}>
                  {memberCount}/5
                </Text>
              </View>
            )}
            <View style={styles.expandPill}>
              <Text style={[styles.expandText, { color: royalBlue }]}>View</Text>
              <Ionicons name="chevron-forward" size={14} color={royalBlue} />
            </View>
          </View>
        </View>

        {groupData.in_group ? (
          <>
            {/* User's Position Highlight */}
            <View
              style={[
                styles.myPositionBanner,
                {
                  backgroundColor: isDark ? '#0B1021' : '#F8FAFC',
                  borderColor: isDark ? '#1F293D' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.myRankCircle}>
                <Text style={styles.myRankText}>#{myRank}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.myLabelName, { color: textPrimary }]}>
                    Your Position: Rank #{myRank} of {memberCount}
                  </Text>
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.myHabitName, { color: textSecondary, marginTop: 3 }]}
                >
                  {currentHabitName} • 🔥 {currentStreak}d streak • {currentTotalDays} total days
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={royalBlue} />
            </View>

            {/* Top Members Mini-Strip (Names only, no avatars) */}
            {sortedMembers.length > 1 && (
              <View style={styles.miniStripContainer}>
                {sortedMembers.slice(0, 3).map((m, idx) => (
                  <View
                    key={`mini-${m.user_id || idx}`}
                    style={[
                      styles.miniMemberChip,
                      {
                        backgroundColor: m.is_me
                          ? isDark
                            ? 'rgba(43, 107, 255, 0.18)'
                            : '#EFF6FF'
                          : isDark
                          ? '#0E1424'
                          : '#F1F5F9',
                        borderColor: m.is_me ? royalBlue : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniMemberRank,
                        { color: idx === 0 ? '#F59E0B' : textSecondary },
                      ]}
                    >
                      #{idx + 1}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.miniMemberName,
                        { color: m.is_me ? royalBlue : textPrimary },
                      ]}
                    >
                      {m.is_me ? 'You' : m.display_name}
                    </Text>
                    <Text style={styles.miniMemberStreak}>🔥{m.streak}d</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Empty / Not In Group State with Real Habit Stats Fallback */
          <View style={styles.emptyGroupContent}>
            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
              Compete with up to 4 friends (max 5 people) on your daily habit streak.
            </Text>

            <View
              style={[
                styles.emptyPreviewRow,
                {
                  backgroundColor: isDark ? '#0B1021' : '#F8FAFC',
                  borderColor: isDark ? '#222A41' : '#CBD5E1',
                },
              ]}
            >
              <View style={styles.emptyRankPill}>
                <Text style={styles.emptyRankText}>#1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.emptyPreviewText, { color: textPrimary }]}>
                  {selectedHabit
                    ? `${selectedHabit.name} (🔥 ${currentStreak}d • ${currentTotalDays} days)`
                    : 'Ready to compete'}
                </Text>
                <Text style={[styles.emptyPreviewSubtext, { color: textSecondary }]}>
                  Tap to form or enter group code
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={22} color={royalBlue} />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* ─── Full-Screen Expanded Leaderboard Modal ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[styles.modalSafeArea, { backgroundColor: isDark ? '#05070E' : '#FFFFFF' }]}
        >
          {/* Brand Gradients */}
          <LinearGradient
            colors={
              isDark
                ? ['#0256C9', '#072252', '#05070E']
                : ['#8EC5FC', '#D6E9FF', '#FFFFFF']
            }
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Modal Header Navigation: Spacious & Clean Top Header */}
          <View
            style={[
              styles.modalTopNav,
              {
                paddingTop: Math.max(insets.top, 52) + 6,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[
                styles.modalBackButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.16)'
                    : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.28)' : '#CBD5E1',
                },
              ]}
            >
              <Ionicons
                color={isDark ? '#FFFFFF' : '#0F172A'}
                name="arrow-back"
                size={18}
              />
              <Text
                style={[
                  styles.modalBackButtonText,
                  { color: isDark ? '#FFFFFF' : '#0F172A' },
                ]}
              >
                Back
              </Text>
            </TouchableOpacity>

            <Text
              numberOfLines={1}
              style={[
                styles.modalNavTitle,
                { color: isDark ? '#FFFFFF' : '#0F172A' },
              ]}
            >
              Habit Leaderboard
            </Text>

            <View style={styles.headerRightSpacer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleShareCard}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.modalHeaderIconBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(43, 107, 255, 0.25)'
                      : 'rgba(255, 255, 255, 0.85)',
                    borderColor: isDark ? '#2B6BFF' : '#93C5FD',
                  },
                ]}
              >
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={isDark ? '#60A5FA' : '#1D4ED8'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.modalScrollContent,
              {
                paddingBottom: Math.max(insets.bottom, 24) + 24,
              },
            ]}
          >
            {/* ── ViewShot Container for Instagram / WhatsApp Export ── */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 0.95 }}
              style={styles.viewShotContainer}
            >
              {/* Story Export Header Watermark */}
              <View style={styles.storyWatermarkHeader}>
                <View style={styles.watermarkBrandRow}>
                  <View style={styles.watermarkDot} />
                  <Text style={[styles.watermarkBrandName, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                    FOCALYST
                  </Text>
                  <Text style={[styles.watermarkDotSeparator, { color: isDark ? '#475569' : '#94A3B8' }]}>
                    •
                  </Text>
                  <Text style={[styles.watermarkPodTitle, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                    HABIT GROUP
                  </Text>
                </View>
              </View>

              {/* 1. Real Streak & Total Days Top Status Card with Clickable Share Code Pill */}
              <View
                style={[
                  styles.modalRankSummaryCard,
                  {
                    backgroundColor: isDark
                      ? 'rgba(11, 16, 33, 0.85)'
                      : 'rgba(255, 255, 255, 0.94)',
                    borderColor: isDark ? 'rgba(43, 107, 255, 0.35)' : '#BFDBFE',
                  },
                ]}
              >
                <View style={styles.rankSummaryLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text
                      style={[
                        styles.rankSummarySubtitle,
                        { color: isDark ? '#93C5FD' : '#2563EB' },
                      ]}
                    >
                      {groupData.in_group ? 'ACTIVE GROUP' : 'READY TO COMPETE'}
                    </Text>
                    {!isCapturingShareImage && groupData.in_group && inviteCode && inviteCode !== '------' && (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setShowFormModal(true)}
                        style={[
                          styles.inlineCodePill,
                          {
                            backgroundColor: isDark ? 'rgba(43, 107, 255, 0.22)' : '#EFF6FF',
                            borderColor: isDark ? '#2B6BFF' : '#93C5FD',
                          },
                        ]}
                      >
                        <Ionicons
                          name="key-outline"
                          size={11}
                          color={isDark ? '#60A5FA' : '#2563EB'}
                        />
                        <Text
                          style={[
                            styles.inlineCodePillText,
                            { color: isDark ? '#93C5FD' : '#2563EB' },
                          ]}
                        >
                          Code: {inviteCode}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.rankSummaryHeading,
                      { color: isDark ? '#FFFFFF' : '#0F172A' },
                    ]}
                  >
                    {groupData.in_group
                      ? `Rank #${myRank} of ${memberCount}`
                      : 'Form or join a group'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.rankSummaryHabit,
                      { color: isDark ? '#94A3B8' : '#475569' },
                    ]}
                  >
                    Shared habit: {currentHabitName}
                  </Text>
                </View>

                <View style={styles.rankSummaryRight}>
                  <View style={styles.rankStreakPill}>
                    <Text style={styles.rankStreakFire}>🔥</Text>
                    <Text style={styles.rankStreakValue}>{currentStreak}</Text>
                    <Text style={styles.rankStreakLabel}>days</Text>
                  </View>
                  <Text
                    style={[
                      styles.rankTotalDaysText,
                      { color: isDark ? '#94A3B8' : '#64748B' },
                    ]}
                  >
                    {currentTotalDays} total days
                  </Text>
                </View>
              </View>

              {/* 2. Top 3 Podium Section (STRICTLY NAMES ONLY - NO AVATAR ICONS) */}
              <View style={styles.podiumSection}>
                <Text
                  style={[
                    styles.sectionHeaderTitle,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  Top Standings
                </Text>

                <View style={styles.podiumContainer}>
                  {/* #2 Rank Pillar (Left) */}
                  <View style={[styles.podiumColumn, { marginTop: 32 }]}>
                    {sortedMembers[1] ? (
                      <View style={styles.podiumMemberCard}>
                        <View style={[styles.podiumRankBadge, { backgroundColor: '#64748B' }]}>
                          <Text style={styles.podiumRankBadgeText}>#2</Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.podiumMemberName,
                            { color: isDark ? '#FFFFFF' : '#0F172A' },
                          ]}
                        >
                          {sortedMembers[1].display_name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.podiumHabitName,
                            { color: isDark ? '#94A3B8' : '#475569' },
                          ]}
                        >
                          {sortedMembers[1].habit_name}
                        </Text>
                        <View style={styles.podiumStreakBadge}>
                          <Text style={styles.podiumStreakText}>
                            🔥 {sortedMembers[1].streak}d
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.podiumTotalDays,
                            { color: isDark ? '#8E95A9' : '#64748B' },
                          ]}
                        >
                          {sortedMembers[1].total_days} total days
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.podiumEmptyCard}>
                        <View style={[styles.podiumRankBadge, { backgroundColor: '#475569' }]}>
                          <Text style={styles.podiumRankBadgeText}>#2</Text>
                        </View>
                        <Text
                          style={[
                            styles.podiumEmptyText,
                            { color: isDark ? '#64748B' : '#94A3B8' },
                          ]}
                        >
                          Empty
                        </Text>
                      </View>
                    )}
                    {/* Pillar graphic */}
                    <View
                      style={[
                        styles.podiumPillar,
                        {
                          height: 95,
                          backgroundColor: isDark ? '#151F38' : '#DBEAFE',
                          borderColor: isDark ? '#233357' : '#BFDBFE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.podiumPillarNumber,
                          { color: isDark ? '#3B82F6' : '#2563EB' },
                        ]}
                      >
                        2
                      </Text>
                    </View>
                  </View>

                  {/* #1 Rank Pillar (Center - Elevated) */}
                  <View style={styles.podiumColumn}>
                    <View style={styles.crownIconRow}>
                      <Ionicons name="trophy" size={24} color="#F59E0B" />
                    </View>
                    {sortedMembers[0] ? (
                      <View style={styles.podiumMemberCard}>
                        <View style={[styles.podiumRankBadge, { backgroundColor: '#F59E0B' }]}>
                          <Text style={styles.podiumRankBadgeText}>#1</Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.podiumMemberName,
                            { color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: '800' },
                          ]}
                        >
                          {sortedMembers[0].display_name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.podiumHabitName,
                            { color: isDark ? '#94A3B8' : '#475569' },
                          ]}
                        >
                          {sortedMembers[0].habit_name}
                        </Text>
                        <View
                          style={[
                            styles.podiumStreakBadge,
                            { backgroundColor: 'rgba(245, 158, 11, 0.22)' },
                          ]}
                        >
                          <Text style={[styles.podiumStreakText, { color: '#F59E0B' }]}>
                            🔥 {sortedMembers[0].streak}d
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.podiumTotalDays,
                            { color: isDark ? '#8E95A9' : '#64748B' },
                          ]}
                        >
                          {sortedMembers[0].total_days} total days
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.podiumEmptyCard}>
                        <View style={[styles.podiumRankBadge, { backgroundColor: '#F59E0B' }]}>
                          <Text style={styles.podiumRankBadgeText}>#1</Text>
                        </View>
                        <Text
                          style={[
                            styles.podiumEmptyText,
                            { color: isDark ? '#64748B' : '#94A3B8' },
                          ]}
                        >
                          Empty
                        </Text>
                      </View>
                    )}
                    {/* Pillar graphic */}
                    <View
                      style={[
                        styles.podiumPillar,
                        {
                          height: 135,
                          backgroundColor: isDark ? '#1E2C4F' : '#BFDBFE',
                          borderColor: isDark ? '#3B82F6' : '#93C5FD',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.podiumPillarNumber,
                          { color: isDark ? '#60A5FA' : '#1D4ED8', fontSize: 26 },
                        ]}
                      >
                        1
                      </Text>
                    </View>
                  </View>

                  {/* #3 Rank Pillar (Right) */}
                  <View style={[styles.podiumColumn, { marginTop: 48 }]}>
                    {sortedMembers[2] ? (
                      <View style={styles.podiumMemberCard}>
                        <View style={[styles.podiumRankBadge, { backgroundColor: '#B45309' }]}>
                          <Text style={styles.podiumRankBadgeText}>#3</Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.podiumMemberName,
                            { color: isDark ? '#FFFFFF' : '#0F172A' },
                          ]}
                        >
                          {sortedMembers[2].display_name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.podiumHabitName,
                            { color: isDark ? '#94A3B8' : '#475569' },
                          ]}
                        >
                          {sortedMembers[2].habit_name}
                        </Text>
                        <View style={styles.podiumStreakBadge}>
                          <Text style={styles.podiumStreakText}>
                            🔥 {sortedMembers[2].streak}d
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.podiumTotalDays,
                            { color: isDark ? '#8E95A9' : '#64748B' },
                          ]}
                        >
                          {sortedMembers[2].total_days} total days
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.podiumEmptyCard}>
                        <View style={[styles.podiumRankBadge, { backgroundColor: '#475569' }]}>
                          <Text style={styles.podiumRankBadgeText}>#3</Text>
                        </View>
                        <Text
                          style={[
                            styles.podiumEmptyText,
                            { color: isDark ? '#64748B' : '#94A3B8' },
                          ]}
                        >
                          Empty
                        </Text>
                      </View>
                    )}
                    {/* Pillar graphic */}
                    <View
                      style={[
                        styles.podiumPillar,
                        {
                          height: 75,
                          backgroundColor: isDark ? '#111A30' : '#EFF6FF',
                          borderColor: isDark ? '#1E2C4F' : '#DBEAFE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.podiumPillarNumber,
                          { color: isDark ? '#2563EB' : '#3B82F6' },
                        ]}
                      >
                        3
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3. Full Group Standings List (Slots 1 to 5) - Strictly Names Only */}
              <View style={styles.standingsSection}>
                <Text
                  style={[
                    styles.sectionHeaderTitle,
                    { color: isDark ? '#FFFFFF' : '#0F172A' },
                  ]}
                >
                  Full Standings ({memberCount}/5)
                </Text>

                {/* Render slots 1 through 5 */}
                {[0, 1, 2, 3, 4].map((slotIndex) => {
                  const member = sortedMembers[slotIndex];
                  const rankNum = slotIndex + 1;

                  if (member) {
                    return (
                      <View
                        key={`member-${member.user_id || slotIndex}`}
                        style={[
                          styles.memberRowCard,
                          {
                            backgroundColor: member.is_me
                              ? isDark
                                ? 'rgba(43, 107, 255, 0.18)'
                                : '#EFF6FF'
                              : isDark
                              ? '#0E1528'
                              : 'rgba(255, 255, 255, 0.95)',
                            borderColor: member.is_me
                              ? royalBlue
                              : isDark
                              ? '#1E293B'
                              : '#E2E8F0',
                          },
                        ]}
                      >
                        {/* Clean Rank Badge */}
                        <View
                          style={[
                            styles.rowRankBadge,
                            {
                              backgroundColor:
                                rankNum === 1
                                  ? '#F59E0B'
                                  : rankNum === 2
                                  ? '#64748B'
                                  : rankNum === 3
                                  ? '#B45309'
                                  : isDark
                                  ? '#1E293B'
                                  : '#94A3B8',
                            },
                          ]}
                        >
                          <Text style={styles.rowRankBadgeText}>{rankNum}</Text>
                        </View>

                        {/* Name & Shared Habit */}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.rowMemberName,
                                { color: isDark ? '#FFFFFF' : '#0F172A' },
                              ]}
                            >
                              {member.display_name}
                            </Text>
                            {member.is_me && (
                              <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>YOU</Text>
                              </View>
                            )}
                          </View>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.rowHabitName,
                              { color: isDark ? '#94A3B8' : '#64748B' },
                            ]}
                          >
                            Sharing: {member.habit_name}
                          </Text>
                        </View>

                        {/* Right stats column */}
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={styles.rowStreakPill}>
                            <Text style={styles.rowStreakFire}>🔥</Text>
                            <Text style={styles.rowStreakText}>
                              {member.streak} day streak
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.rowTotalDays,
                              { color: isDark ? '#8E95A9' : '#64748B' },
                            ]}
                          >
                            {member.total_days} total days
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  {/* Empty slot row - Opens modal in 0ms */}
                  return (
                    <TouchableOpacity
                      key={`empty-slot-${slotIndex}`}
                      activeOpacity={0.75}
                      onPress={() => {
                        setShowFormModal(true);
                      }}
                      style={[
                        styles.emptySlotCard,
                        {
                          borderColor: isDark ? '#1F293D' : '#CBD5E1',
                          backgroundColor: isDark
                            ? 'rgba(15, 23, 42, 0.4)'
                            : 'rgba(255, 255, 255, 0.75)',
                        },
                      ]}
                    >
                      <View style={styles.emptySlotNumberCircle}>
                        <Text style={[styles.emptySlotNumberText, { color: textSecondary }]}>
                          {rankNum}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.emptySlotText,
                          { color: isDark ? '#8E95A9' : '#64748B' },
                        ]}
                      >
                        Empty Slot — Tap to invite a friend
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Watermark Footer for Story Export */}
              <View style={styles.storyWatermarkFooter}>
                <Text style={[styles.storyWatermarkFooterText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  Built with Focalyst 🚀 • Track streaks with friends
                </Text>
              </View>
            </ViewShot>

            {/* 4. Dynamic Bottom Footer Actions */}
            <View
              style={[
                styles.modalFooterActions,
                {
                  paddingBottom: Math.max(insets.bottom, 24) + 16,
                },
              ]}
            >
              {groupData.in_group ? (
                <>
                  {/* Primary Spotify-Style Story Card Export Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleShareCard}
                    disabled={sharingImage}
                    style={styles.shareStoryGradientBtn}
                  >
                    <Ionicons name="sparkles" size={17} color="#FFFFFF" />
                    <Text style={styles.shareStoryBtnText}>
                      {sharingImage ? 'Generating Story Card...' : 'Share to Instagram / WhatsApp'}
                    </Text>
                  </TouchableOpacity>

                  {/* Clean Two-Button Action Row (Join Another Removed) */}
                  <View style={styles.actionRowTwoBtn}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setShowFormModal(true)}
                      style={styles.shareCodeActionBtn}
                    >
                      <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                      <Text numberOfLines={1} style={styles.shareCodeActionText}>
                        Share Code ({inviteCode || 'Pod'})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleLeaveGroup}
                      disabled={leaving}
                      style={[
                        styles.leaveGroupOutlineBtn,
                        {
                          borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : '#FCA5A5',
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                        },
                      ]}
                    >
                      <Ionicons name="exit-outline" size={16} color="#EF4444" />
                      <Text numberOfLines={1} style={styles.leaveGroupOutlineText}>
                        {leaving ? 'Leaving...' : 'Leave Group'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeFooterBtnCenter}
                  >
                    <Text
                      style={[
                        styles.closeFooterText,
                        { color: isDark ? '#60A5FA' : '#2563EB' },
                      ]}
                    >
                      Done
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.noGroupActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setShowFormModal(true);
                    }}
                    style={styles.formGroupActionBtn}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.formGroupActionText}>Form Group</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowEnterModal(true)}
                    style={[
                      styles.enterGroupActionBtn,
                      {
                        backgroundColor: isDark ? '#151F38' : '#EFF6FF',
                        borderColor: royalBlue,
                      },
                    ]}
                  >
                    <Ionicons name="enter-outline" size={18} color={royalBlue} />
                    <Text style={[styles.enterGroupActionText, { color: royalBlue }]}>
                      Enter Group Code
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Render FormGroupModal & EnterGroupModal INSIDE Leaderboard Modal with useInlineOverlay={true} */}
          <FormGroupModal
            useInlineOverlay={true}
            visible={showFormModal}
            onClose={() => setShowFormModal(false)}
            habit={selectedHabit}
            allHabits={activeHabits}
            isDark={isDark}
            onGroupUpdated={refreshLeaderboardSilently}
          />

          <EnterGroupModal
            useInlineOverlay={true}
            visible={showEnterModal}
            onClose={() => setShowEnterModal(false)}
            initialHabit={selectedHabit}
            allHabits={activeHabits}
            isDark={isDark}
            onJoinSuccess={refreshLeaderboardSilently}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#2B6BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '700',
  },
  myPositionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  myRankCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2B6BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myRankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  myLabelName: {
    fontSize: 14,
    fontWeight: '700',
  },
  youBadge: {
    backgroundColor: '#2B6BFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  myHabitName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  miniStripContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  miniMemberChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  miniMemberRank: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniMemberName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  miniMemberStreak: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
  },
  emptyGroupContent: {
    gap: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyRankPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2B6BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyPreviewText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPreviewSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalTopNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 10,
  },
  modalBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
    minWidth: 80,
  },
  modalBackButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalNavTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerRightSpacer: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modalHeaderIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  viewShotContainer: {
    gap: 20,
    borderRadius: 24,
    paddingVertical: 6,
  },
  storyWatermarkHeader: {
    alignItems: 'center',
    marginBottom: -8,
  },
  watermarkBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watermarkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2B6BFF',
  },
  watermarkBrandName: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  watermarkDotSeparator: {
    fontSize: 12,
  },
  watermarkPodTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalRankSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  rankSummaryLeft: {
    flex: 1,
    gap: 3,
  },
  rankSummarySubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inlineCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  inlineCodePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rankSummaryHeading: {
    fontSize: 19,
    fontWeight: '800',
  },
  rankSummaryHabit: {
    fontSize: 12,
    fontWeight: '500',
  },
  rankSummaryRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rankStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rankStreakFire: {
    fontSize: 14,
  },
  rankStreakValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  rankStreakLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rankTotalDaysText: {
    fontSize: 11,
    fontWeight: '600',
  },
  podiumSection: {
    gap: 14,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  podiumColumn: {
    flex: 1,
    alignItems: 'center',
  },
  crownIconRow: {
    marginBottom: 4,
  },
  podiumMemberCard: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  podiumRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumRankBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  podiumMemberName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 95,
  },
  podiumHabitName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
    maxWidth: 95,
  },
  podiumStreakBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  podiumStreakText: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '700',
  },
  podiumTotalDays: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  podiumEmptyCard: {
    alignItems: 'center',
    marginBottom: 8,
  },
  podiumEmptyText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  podiumPillar: {
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumPillarNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  standingsSection: {
    gap: 10,
  },
  memberRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  rowRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowRankBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rowMemberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowHabitName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  rowStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rowStreakFire: {
    fontSize: 13,
  },
  rowStreakText: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '800',
  },
  rowTotalDays: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  emptySlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 10,
  },
  emptySlotNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  storyWatermarkFooter: {
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: -4,
  },
  storyWatermarkFooterText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  modalFooterActions: {
    gap: 12,
    marginTop: 8,
  },
  shareStoryGradientBtn: {
    width: '100%',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareStoryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionRowTwoBtn: {
    flexDirection: 'row',
    gap: 10,
  },
  shareCodeActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shareCodeActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  leaveGroupOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  leaveGroupOutlineText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  closeFooterBtnCenter: {
    paddingVertical: 6,
    alignSelf: 'center',
  },
  closeFooterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noGroupActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupActionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: '#2B6BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  formGroupActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  enterGroupActionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  enterGroupActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
