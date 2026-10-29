import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  dismissReviewPromptForLater,
  getReviewModalState,
  markReviewCompletedAndOpenStore,
  MilestoneActionType,
  ReviewModalTriggerState,
  subscribeReviewModal,
} from '../src/services/reviewPromptService';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PositivePreset {
  id: string;
  label: string;
  sentence: string;
}

const POSITIVE_PRESETS: PositivePreset[] = [
  {
    id: 'design',
    label: 'Clean Design',
    sentence: 'Love the clean, distraction-free UI design.',
  },
  {
    id: 'ai',
    label: 'AI Assistant',
    sentence: 'Focalyst AI makes planning my day effortless.',
  },
  {
    id: 'voice',
    label: 'Voice Notes',
    sentence: 'Voice notes with instant AI summaries are a game changer.',
  },
  {
    id: 'focus',
    label: 'Focus Timer',
    sentence: 'The focus sessions help me stay locked in without distractions.',
  },
  {
    id: 'habits',
    label: 'Habit Tracking',
    sentence: 'Tracking my daily habits and tasks in one place keeps me consistent.',
  },
  {
    id: 'speed',
    label: 'Speed & Flow',
    sentence: 'Super fast, smooth, and intuitive to use every day.',
  },
];

function getMilestoneContext(type: MilestoneActionType | null): { milestone: string; unlocked: string } {
  if (type === 'habit') return { milestone: 'First habit logged', unlocked: 'Consistency unlocked' };
  if (type === 'focus') return { milestone: 'First focus session', unlocked: 'Deep work unlocked' };
  return { milestone: 'First task completed', unlocked: 'Momentum unlocked' };
}

export const AppReviewModal: React.FC<{
  onSaveFeedback?: (stars: number, text: string, tags: string[]) => void;
}> = ({ onSaveFeedback }) => {
  const [trigger, setTrigger] = useState<ReviewModalTriggerState>(
    getReviewModalState()
  );
  // 0 = unselected gray stars in compact card; >0 = blue stars + expanded card
  const [selectedStars, setSelectedStars] = useState<number>(0);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [customComment, setCustomComment] = useState<string>('');
  const [isUserEditedText, setIsUserEditedText] = useState<boolean>(false);
  const [submittedThanks, setSubmittedThanks] = useState<boolean>(false);

  useEffect(() => {
    return subscribeReviewModal((nextState) => {
      setTrigger(nextState);
      if (nextState.visible) {
        setSelectedStars(0);
        setSelectedPresetIds([]);
        setCustomComment('');
        setIsUserEditedText(false);
        setSubmittedThanks(false);
      }
    });
  }, []);

  if (!trigger.visible) {
    return null;
  }

  const isExpanded = selectedStars > 0;
  const milestone = getMilestoneContext(trigger.milestoneType);

  const handleSelectStar = (star: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedStars(star);
  };

  const handleTogglePreset = (preset: PositivePreset) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const exists = selectedPresetIds.includes(preset.id);
    const nextIds = exists
      ? selectedPresetIds.filter((id) => id !== preset.id)
      : [...selectedPresetIds, preset.id];

    setSelectedPresetIds(nextIds);

    // Auto-build a ready-to-submit positive review string unless user manually edited
    if (!isUserEditedText) {
      const autoText = POSITIVE_PRESETS.filter((p) => nextIds.includes(p.id))
        .map((p) => p.sentence)
        .join(' ');
      setCustomComment(autoText);
    }
  };

  const handleChangeText = (text: string) => {
    setIsUserEditedText(true);
    setCustomComment(text);
  };

  const handleSubmit = async () => {
    const chosenLabels = POSITIVE_PRESETS.filter((p) =>
      selectedPresetIds.includes(p.id)
    ).map((p) => p.label);

    const finalReviewText =
      customComment.trim() ||
      POSITIVE_PRESETS.filter((p) => selectedPresetIds.includes(p.id))
        .map((p) => p.sentence)
        .join(' ');

    if (onSaveFeedback) {
      onSaveFeedback(selectedStars, finalReviewText, chosenLabels);
    }

    if (selectedStars >= 4) {
      await markReviewCompletedAndOpenStore(true);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSubmittedThanks(true);
      setTimeout(() => {
        void markReviewCompletedAndOpenStore(false);
      }, 1300);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={trigger.visible}
      onRequestClose={() => void dismissReviewPromptForLater()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          style={styles.backdropPress}
          onPress={() => void dismissReviewPromptForLater()}
        >
          <Pressable style={styles.card} onPress={() => {}}>
            {submittedThanks ? (
              <View style={styles.thanksWrap}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.thanksTitle}>Thank you!</Text>
                <Text style={styles.thanksSub}>
                  Your feedback helps us make Focalyst better every week.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.milestoneLine}>{milestone.milestone.toUpperCase()}</Text>
                <Text style={styles.title}>Rate your experience</Text>
                <Text style={styles.subtitle}>
                  {`${milestone.unlocked}. How is Focalyst working for you so far?`}
                </Text>

                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= selectedStars;
                    return (
                      <TouchableOpacity
                        key={star}
                        activeOpacity={0.75}
                        accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
                        onPress={() => handleSelectStar(star)}
                        style={styles.starTouch}
                      >
                        <Ionicons
                          name={isFilled ? 'star' : 'star-outline'}
                          size={36}
                          color={isFilled ? ACCENT_BLUE : SECONDARY_TEXT}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Expandable Section: Appears only after user selects a star */}
                {isExpanded ? (
                  <View style={styles.expandedSection}>
                    <Text style={styles.sectionTitle}>
                      What did you like the most?
                    </Text>

                    <View style={styles.chipsWrap}>
                      {POSITIVE_PRESETS.map((preset) => {
                        const isSelected = selectedPresetIds.includes(
                          preset.id
                        );
                        return (
                          <TouchableOpacity
                            key={preset.id}
                            activeOpacity={0.8}
                            onPress={() => handleTogglePreset(preset)}
                            style={[
                              styles.chip,
                              isSelected && styles.chipSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && styles.chipTextSelected,
                              ]}
                            >
                              {preset.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.commentBoxWrap}>
                      <TextInput
                        maxLength={400}
                        multiline
                        onChangeText={handleChangeText}
                        placeholder="Write a comment (or tap options above)"
                        placeholderTextColor="#64748B"
                        style={styles.commentInput}
                        value={customComment}
                      />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => void handleSubmit()}
                      style={styles.submitBtn}
                    >
                      <Text style={styles.submitBtnText}>Submit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => void dismissReviewPromptForLater()}
                      style={styles.secondaryCancelBtn}
                    >
                      <Text style={styles.secondaryCancelText}>Maybe Later</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Compact Initial State Button */
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => void dismissReviewPromptForLater()}
                    style={styles.compactCancelBtn}
                  >
                    <Text style={styles.compactCancelText}>Not now</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const ACCENT_BLUE = '#0A84FF';
const SECONDARY_TEXT = '#94A3B8';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 20, 0.82)',
    justifyContent: 'center',
  },
  backdropPress: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  milestoneLine: {
    color: ACCENT_BLUE,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: SECONDARY_TEXT,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginTop: 20,
  },
  starTouch: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCancelBtn: {
    marginTop: 16,
    height: 48,
    alignSelf: 'stretch',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCancelText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  expandedSection: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  chipSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.22)',
    borderColor: '#0A84FF',
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  commentBoxWrap: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  commentInput: {
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 46,
    maxHeight: 96,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A84FF',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryCancelBtn: {
    marginTop: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  secondaryCancelText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  thanksWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  thanksTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  thanksSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AppReviewModal;
