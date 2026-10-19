import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  formOrUpdateHabitGroup,
  joinHabitGroupByCode,
  leaveCurrentHabitGroup,
  getCachedGroupLeaderboard,
} from '../../src/services/habitGroupService';

export interface HabitSummaryItem {
  id: string;
  name: string;
  icon?: string;
  current_streak?: number;
}

interface FormGroupModalProps {
  visible: boolean;
  onClose: () => void;
  habit: HabitSummaryItem | null;
  allHabits?: HabitSummaryItem[];
  isDark: boolean;
  onGroupUpdated?: () => void;
  useInlineOverlay?: boolean;
}

export const FormGroupModal: React.FC<FormGroupModalProps> = ({
  visible,
  onClose,
  habit,
  allHabits = [],
  isDark,
  onGroupUpdated,
  useInlineOverlay = false,
}) => {
  const cached = getCachedGroupLeaderboard();
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>(cached?.invite_code || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [leaving, setLeaving] = useState<boolean>(false);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);

  const habitsList = allHabits.length > 0 ? allHabits : habit ? [habit] : [];
  const activeHabit =
    habitsList.find((h) => h.id === selectedHabitId) || habit || habitsList[0] || null;

  useEffect(() => {
    if (visible) {
      const initialId = habit?.id || allHabits[0]?.id || '';
      setSelectedHabitId(initialId);
      const existingCode = getCachedGroupLeaderboard()?.invite_code;
      if (existingCode) {
        setInviteCode(existingCode);
      }
      if (initialId) {
        void generateOrSyncGroup(initialId, Boolean(existingCode));
      }
    } else {
      setCopiedFeedback(false);
    }
  }, [visible, habit?.id]);

  const generateOrSyncGroup = async (habitId: string, silent: boolean = false) => {
    if (!habitId) return;
    if (!silent) setLoading(true);
    try {
      const res = await formOrUpdateHabitGroup(habitId);
      if (res?.invite_code) {
        setInviteCode(res.invite_code);
      }
      onGroupUpdated?.();
    } catch (err: any) {
      Alert.alert('Group Error', err?.message || 'Could not create group code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHabit = async (newHabitId: string) => {
    setSelectedHabitId(newHabitId);
    await generateOrSyncGroup(newHabitId, true);
  };

  const handleShareCode = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join my Focalyst Habit Group with code ${inviteCode}! Let's track our daily streaks together on the leaderboard.\n\nDownload Focalyst: https://focalyst.online/app`,
      });
    } catch {}
  };

  const handleTapCodeBox = async () => {
    if (!inviteCode || inviteCode === '------') return;
    try {
      await Clipboard.setStringAsync(inviteCode);
    } catch {}
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
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
              setInviteCode('');
              onGroupUpdated?.();
              onClose();
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

  if (!visible) return null;

  const cardBg = isDark ? '#151B2E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const codeBoxBg = isDark ? '#0B1021' : '#F1F5F9';

  const content = (
    <Pressable onPress={onClose} style={styles.backdrop}>
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={[
          styles.modalCard,
          {
            backgroundColor: cardBg,
            borderColor: isDark ? '#222A41' : '#E2E8F0',
          },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Close modal"
          accessibilityRole="button"
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          onPress={onClose}
          style={styles.closeIconBtn}
        >
          <Ionicons color={textSecondary} name="close" size={22} />
        </TouchableOpacity>

        <Text style={[styles.modalTitle, { color: textPrimary }]}>
          Your Group Code
        </Text>

        {loading && !inviteCode ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color="#2B6BFF" size="large" />
            <Text style={[styles.helperText, { color: textSecondary, marginTop: 12 }]}>
              Creating your 6-character code...
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTapCodeBox}
              style={[
                styles.codeContainer,
                {
                  backgroundColor: codeBoxBg,
                  borderColor: isDark ? '#222A41' : '#CBD5E1',
                },
              ]}
            >
              <Text style={[styles.codeText, { color: textPrimary }]}>
                {inviteCode || '------'}
              </Text>
              <Text
                style={[
                  styles.tapToCopyText,
                  { color: copiedFeedback ? '#10B981' : textSecondary },
                ]}
              >
                {copiedFeedback ? 'Copied to clipboard!' : 'Tap code to copy'}
              </Text>
            </TouchableOpacity>

            {habitsList.length > 1 ? (
              <View style={{ width: '100%', marginBottom: 14 }}>
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                  SHARED HABIT (TAP TO SWITCH)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{}}>
                  {habitsList.map((h) => {
                    const selected = h.id === (activeHabit?.id || selectedHabitId);
                    return (
                      <TouchableOpacity
                        key={h.id}
                        onPress={() => handleSelectHabit(h.id)}
                        style={[
                          styles.habitChip,
                          {
                            backgroundColor: selected
                              ? 'rgba(43, 107, 255, 0.16)'
                              : codeBoxBg,
                            borderColor: selected
                              ? '#2B6BFF'
                              : isDark
                              ? '#222A41'
                              : '#E2E8F0',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? '#2B6BFF' : textPrimary,
                            fontWeight: selected ? '700' : '500',
                            fontSize: 13,
                          }}
                        >
                          {h.icon ? `${h.icon} ` : ''}{h.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <Text
                style={[
                  styles.sharingBadgeText,
                  { color: isDark ? '#60A5FA' : '#2563EB' },
                ]}
              >
                Sharing habit: {activeHabit?.name || 'Yoga'}
              </Text>
            )}

            <Text style={[styles.helperText, { color: textSecondary }]}>
              Share this code with up to 4 friends (max 5 people). They'll enter it on their device to compete on the leaderboard.
            </Text>

            <TouchableOpacity activeOpacity={0.8} onPress={handleShareCode} style={styles.primaryBlueBtn}>
              <Ionicons color="#FFFFFF" name="share-outline" size={18} />
              <Text style={styles.primaryBlueBtnText}>Share Code</Text>
            </TouchableOpacity>

            <View style={styles.bottomRowActions}>
              <TouchableOpacity disabled={leaving} onPress={handleLeaveGroup} style={styles.leaveBtn}>
                <Ionicons color="#EF4444" name="exit-outline" size={16} />
                <Text style={styles.leaveBtnText}>
                  {leaving ? 'Leaving...' : 'Leave Group'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
                <Text style={[styles.doneBtnText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Pressable>
    </Pressable>
  );

  if (useInlineOverlay) {
    return <View style={styles.inlineOverlayWrapper}>{content}</View>;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      {content}
    </Modal>
  );
};

interface EnterGroupModalProps {
  visible: boolean;
  onClose: () => void;
  initialHabit: HabitSummaryItem | null;
  allHabits: HabitSummaryItem[];
  isDark: boolean;
  onJoinSuccess?: () => void;
  useInlineOverlay?: boolean;
}

export const EnterGroupModal: React.FC<EnterGroupModalProps> = ({
  visible,
  onClose,
  initialHabit,
  allHabits,
  isDark,
  onJoinSuccess,
  useInlineOverlay = false,
}) => {
  const [code, setCode] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setCode('');
      setSelectedHabitId(initialHabit?.id || allHabits[0]?.id || '');
    }
  }, [visible, initialHabit, allHabits]);

  if (!visible) return null;

  const handleJoin = async () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character invite code.');
      return;
    }
    const targetHabitId = selectedHabitId || initialHabit?.id || allHabits[0]?.id;
    if (!targetHabitId) {
      Alert.alert('No Habit Found', 'Please create at least one habit in your Plan tab first.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await joinHabitGroupByCode(clean, targetHabitId);
      if (!result.success) {
        Alert.alert('Cannot Join Group', result.message);
        return;
      }
      onJoinSuccess?.();
      onClose();
      Alert.alert(
        result.creator_name ? `${result.creator_name} invited you!` : 'Joined Group!',
        'You are now paired! Your habit streak and total days are live on the leaderboard.'
      );
    } catch (err: any) {
      Alert.alert('Join Error', err?.message || 'Failed to join group.');
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = isDark ? '#151B2E' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const inputBg = isDark ? '#0B1021' : '#F1F5F9';

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}
    >
      <Pressable onPress={onClose} style={styles.backdropInner}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.modalCard,
            {
              backgroundColor: cardBg,
              borderColor: isDark ? '#222A41' : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.modalTitleLeft, { color: textPrimary }]}>
            Enter invite code
          </Text>
          <Text style={[styles.helperTextLeft, { color: textSecondary }]}>
            Ask your friend for their 6-character code.
          </Text>

          <TextInput
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            value={code}
            placeholder="------"
            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[
              styles.codeInput,
              {
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: isDark ? '#222A41' : '#CBD5E1',
              },
            ]}
          />

          {allHabits.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                PICK THE HABIT YOU WANT TO SHARE
              </Text>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.habitPickerList}>
                {allHabits.map((h) => {
                  const isSelected = h.id === selectedHabitId;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      key={h.id}
                      onPress={() => setSelectedHabitId(h.id)}
                      style={[
                        styles.habitOptionRow,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(43, 107, 255, 0.14)'
                            : inputBg,
                          borderColor: isSelected
                            ? '#2B6BFF'
                            : isDark
                            ? '#222A41'
                            : '#E2E8F0',
                        },
                      ]}
                    >
                      <Text style={styles.habitOptionEmoji}>{h.icon || '🎯'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={[styles.habitOptionName, { color: textPrimary }]}>
                          {h.name}
                        </Text>
                        <Text style={[styles.habitOptionMeta, { color: textSecondary }]}>
                          Daily • Habit streak {h.current_streak || 0} days
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkboxSquare,
                          {
                            borderColor: isSelected ? '#2B6BFF' : '#64748B',
                            backgroundColor: isSelected ? '#2B6BFF' : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Ionicons color="#FFFFFF" name="checkmark" size={15} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.joinButtonRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={[styles.cancelBtn, { backgroundColor: inputBg }]}
            >
              <Text style={[styles.cancelBtnText, { color: textPrimary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={submitting}
              onPress={handleJoin}
              style={styles.joinConfirmBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinConfirmBtnText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );

  if (useInlineOverlay) {
    return <View style={styles.inlineOverlayWrapper}>{content}</View>;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  inlineOverlayWrapper: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 23, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  backdropInner: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeIconBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 18,
  },
  modalTitleLeft: {
    fontSize: 20,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  loaderBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  codeContainer: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
  },
  tapToCopyText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  habitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  sharingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  helperTextLeft: {
    fontSize: 13,
    lineHeight: 18,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  primaryBlueBtn: {
    width: '100%',
    height: 50,
    borderRadius: 999,
    backgroundColor: '#2B6BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  primaryBlueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomRowActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  leaveBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  doneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  codeInput: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 18,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  habitPickerList: {
    width: '100%',
    maxHeight: 185,
    marginBottom: 18,
  },
  habitOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  habitOptionEmoji: {
    fontSize: 20,
  },
  habitOptionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  habitOptionMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  joinConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#2B6BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
