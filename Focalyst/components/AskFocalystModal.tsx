import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  DeviceEventEmitter,
  BackHandler,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { supabase } from '../src/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatMicButton from './ChatMicButton';
import ChatBottomGlow from './ChatBottomGlow';
import { fetchAuthorizedUserContext } from '../src/services/focalystContextService';
import { sendChatMessageToGroq as sendChatMessageToOpenRouter } from '../src/services/openRouterService';
import { useUser } from '../src/utils/UserContext';
import { isProPlan } from '../src/utils/plan';

// ─── Official Markdown Display Style Definitions ──────────────────────────────
const markdownStyles = {
  body: {
    color: '#0f172a',
    fontSize: 14.5,
    lineHeight: 22,
  },
  strong: {
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Theme Colors ────────────────────────────────────────────────────────────
const BRAND = '#4a6c8c';       // Premium Slate Blue
const ACCENT = '#ff6b2b';      // Catalyst orange
const BG = '#ffffff';
const CARD_BG = '#f8fafc';     // Soft gray
const BORDER = '#f1f5f9';
const TEXT_PRIMARY = '#0f172a';
const TEXT_SECONDARY = '#64748b';
const TEXT_MUTED = '#94a3b8';

interface AskFocalystModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isPaywall?: boolean;
}

export default function AskFocalystModal({ isVisible, onClose, isDarkMode: isDarkModeProp }: AskFocalystModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const activeUserId = user?.id || '';
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [isDarkMode, setIsDarkMode] = useState(isDarkModeProp ?? true);

  // Reset messages and messageCount whenever active user changes or logs out
  const lastActiveUserRef = useRef<string>(activeUserId);
  useEffect(() => {
    if (lastActiveUserRef.current !== activeUserId) {
      lastActiveUserRef.current = activeUserId;
      setMessages([]);
      setInputText('');
      setMessageCount(0);
      setPlan('free');
      if (activeUserId) {
        fetchUserUsageAndPlan();
      }
    }
  }, [activeUserId]);

  // Task 4: Android BackHandler — dismiss keyboard then close modal
  useEffect(() => {
    if (!isVisible) return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      onClose();
      return true; // Consume the event, prevent default back action
    });

    return () => handler.remove();
  }, [isVisible, onClose]);

  const [micState, setMicState] = useState<{ isRecording: boolean; isTranscribing: boolean }>({
    isRecording: false,
    isTranscribing: false,
  });

  const handleVoiceInput = (text: string) => {
    setInputText((prev) => (prev ? `${prev} ${text}` : text));
  };

  // Sync isDarkMode state with prop
  useEffect(() => {
    if (isDarkModeProp !== undefined) {
      setIsDarkMode(isDarkModeProp);
    }
  }, [isDarkModeProp]);

  // Load message usage details, subscription status and check fallback theme
  useEffect(() => {
    if (isVisible) {
      fetchUserUsageAndPlan();
      if (isDarkModeProp === undefined) {
        const checkTheme = async () => {
          try {
            const val = await AsyncStorage.getItem('darkMode');
            if (val !== null) {
              setIsDarkMode(val === 'true');
            }
          } catch (e) {
            console.warn('Error loading theme in AskFocalystModal:', e);
          }
        };
        checkTheme();
      }
    }
  }, [isVisible, isDarkModeProp]);

  async function fetchUserUsageAndPlan() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch users profile
        const { data: userData, error } = await supabase
          .from('users')
          .select('plan, plan_expires_at, ai_message_count, last_message_date')
          .eq('id', user.id)
          .single();

        if (!error && userData) {
          setPlan(isProPlan(userData.plan, userData.plan_expires_at) ? 'pro' : 'free');
          
          const todayStr = new Date().toISOString().split('T')[0];
          const lastMsgDateStr = userData.last_message_date 
            ? new Date(userData.last_message_date).toISOString().split('T')[0]
            : null;

          if (!lastMsgDateStr || lastMsgDateStr < todayStr) {
            setMessageCount(0);
            await supabase
              .from('users')
              .update({ ai_message_count: 0 })
              .eq('id', user.id);
          } else {
            setMessageCount(userData.ai_message_count || 0);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching usage:', e);
    }
  }

  // Auto-scroll to bottom of the chat stream
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCopyText = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied ✓', 'Message copied to clipboard.');
    } catch {
      Alert.alert('Error', 'Failed to copy text.');
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    if (plan === 'free' && messageCount >= 5) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: '',
          isPaywall: true,
        },
      ]);
      scrollToBottom();
      return;
    }

    const userMsgText = textToSend.trim();
    setInputText('');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsgText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    scrollToBottom();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to chat with Focalyst AI.');
      }

      // Fetch real-time authorized user context
      const context = await fetchAuthorizedUserContext(session.user.id);

      // Route and send to OpenRouter (Llama 3.1 8B / Llama 3.3 70B) with tool execution & Gemini 3.8 Flash failover
      const groqResponse = await sendChatMessageToOpenRouter(
        userMsgText,
        messages.map((m) => ({ role: m.role, content: m.content })),
        session.user.id,
        context
      );

      // Successful response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: groqResponse.content,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Refresh listeners across tabs if tools mutated tasks, habits, or countdowns
      DeviceEventEmitter.emit('refreshPlanData');
      DeviceEventEmitter.emit('refreshHabits');
      DeviceEventEmitter.emit('refreshCountdowns');

      // Update user message counters
      const nextCount = messageCount + 1;
      setMessageCount(nextCount);
      await supabase
        .from('users')
        .update({
          ai_message_count: nextCount,
          last_message_date: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      // Record chat logs safely
      try {
        await supabase.from('ai_chat_logs').insert([
          { user_id: session.user.id, role: 'user', content: userMsgText, tab_context: 'chat' },
          { user_id: session.user.id, role: 'assistant', content: groqResponse.content, tab_context: 'chat' },
        ]);
      } catch (logErr) {
        // Non-blocking log persistence
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errMsg: string = typeof error?.message === 'string' ? error.message : '';
      
      const isOverloaded =
        errMsg.includes('503') ||
        errMsg.includes('500') ||
        errMsg.toLowerCase().includes('service unavailable') ||
        errMsg.toLowerCase().includes('overloaded') ||
        errMsg.toLowerCase().includes('high demand');

      const friendlyText = isOverloaded
        ? 'Focalyst AI is currently experiencing high demand. Please try again in a moment.'
        : 'Unable to reach Focalyst AI right now. Please check your connection and try again.';

      const friendlyMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: friendlyText,
      };
      setMessages((prev) => [...prev, friendlyMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const suggestionChips = [
    'What should I focus on today?',
    'Add a task for tomorrow',
    'How productive was I this week?',
    'Remind me to review notes at 8pm',
  ];

  const handleUpgradeToPro = () => {
    onClose();
    router.push('/plan');
  };


  // Dynamic theme colors
  const theme = {
    bg: isDarkMode ? '#0B1021' : '#ffffff',
    cardBg: isDarkMode ? '#151B2E' : '#f8fafc',
    border: isDarkMode ? '#222A41' : '#f1f5f9',
    textPrimary: isDarkMode ? '#FFFFFF' : '#0f172a',
    textSecondary: isDarkMode ? '#8E95A9' : '#64748b',
    dragHandle: isDarkMode ? '#8E95A9' : '#cbd5e1',
    inputBg: isDarkMode ? '#050814' : '#f8fafc',
    inputBorder: isDarkMode ? '#222A41' : '#f1f5f9',
    backdropBg: isDarkMode ? 'rgba(5, 8, 20, 0.7)' : 'rgba(15, 23, 42, 0.45)',
    closeBtnBg: isDarkMode ? '#151B2E' : '#f8fafc',
  };

  // Dynamic styles for Markdown rendering
  const currentMarkdownStyles = {
    body: {
      color: theme.textPrimary,
      fontSize: 14.5,
      lineHeight: 22,
    },
    strong: {
      fontWeight: '700' as const,
      color: theme.textPrimary,
    },
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
    },
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: theme.backdropBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.contentContainer, { backgroundColor: theme.bg }]}>
          <ChatBottomGlow isDark={isDarkMode} />
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.dragHandle }]} />
            <View style={styles.headerTextRow}>
              <View>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Ask Focalyst AI</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={[styles.closeButton, { backgroundColor: theme.closeBtnBg }]}
              >
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chat Stream */}
          <ScrollView
            ref={scrollViewRef}
            style={{ backgroundColor: 'transparent' }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              // Suggestion Chips (Vertically Stacked cards)
              <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionSpace} />
                {suggestionChips.map((chip, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[
                      styles.suggestionCard,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                        borderRadius: 24, // smooth rounded corners
                      }
                    ]}
                    onPress={() => handleSendMessage(chip)}
                  >
                    <Text style={[styles.suggestionText, { color: theme.textPrimary }]}>{chip}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                  I can add tasks, set reminders, summarise your week, and answer productivity questions.
                </Text>
              </View>
            ) : (
              // Active Conversation Bubbles
              messages.map((m) => {
                const isUser = m.role === 'user';
                
                if (m.isPaywall) {
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.paywallBubble,
                        isDarkMode && {
                          backgroundColor: '#1E1B18',
                          borderColor: '#3D2A1C',
                        }
                      ]}
                    >
                      <View style={[styles.paywallIconBg, isDarkMode && { backgroundColor: '#3D2A1C' }]}>
                        <Ionicons name="sparkles" size={26} color={ACCENT} />
                      </View>
                      <Text style={[styles.paywallTitle, isDarkMode && { color: '#FFFFFF' }]}>You've reached your daily limit of 5 messages.</Text>
                      <Text style={[styles.paywallDesc, isDarkMode && { color: '#8E95A9' }]}>
                        Unlock limitless productivity coach interaction, detailed calendar analysis, note sync, and pro metrics.
                      </Text>
                      <TouchableOpacity
                        style={styles.upgradeBtn}
                        activeOpacity={0.9}
                        onPress={handleUpgradeToPro}
                      >
                        <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View
                    key={m.id}
                    style={[
                      styles.chatBubbleContainer,
                      isUser ? styles.userContainer : styles.aiContainer,
                    ]}
                  >
                    <View style={{ maxWidth: '85%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                      <TouchableOpacity
                        activeOpacity={0.92}
                        onLongPress={() => handleCopyText(m.content)}
                        style={[
                          styles.chatBubble,
                          isUser ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }],
                        ]}
                      >
                        {isUser ? (
                          <Text style={styles.userText}>{m.content}</Text>
                        ) : (
                          <Markdown style={currentMarkdownStyles}>{m.content}</Markdown>
                        )}
                      </TouchableOpacity>
                      
                      {/* Subdued copy action trigger button under bubble */}
                      <TouchableOpacity 
                        style={[styles.copyActionRow, isUser ? { marginRight: 8 } : { marginLeft: 8 }]}
                        onPress={() => handleCopyText(m.content)}
                        activeOpacity={0.6}
                      >
                        <Ionicons name="copy-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.copyActionText, { color: theme.textSecondary }]}>Copy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {loading && (
              <View style={[styles.chatBubbleContainer, styles.aiContainer]}>
                <View style={[styles.chatBubble, styles.aiBubble, styles.loadingBubble, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <ActivityIndicator size="small" color={isDarkMode ? '#ffffff' : BRAND} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Input */}
          <View style={[styles.footer, { backgroundColor: 'transparent' }]}>
            {plan === 'free' && messageCount >= 5 && (
              <TouchableOpacity
                style={styles.bannerContainer}
                activeOpacity={0.8}
                onPress={handleUpgradeToPro}
              >
                <Ionicons name="flash" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.bannerText}>Daily AI limit reached. ⚡️ Upgrade to Pro</Text>
              </TouchableOpacity>
            )}
          <View style={[styles.inputRow, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, paddingLeft: 12 }]}>
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder={
                  micState.isRecording
                    ? 'Listening... tap mic when done'
                    : micState.isTranscribing
                    ? 'Transcribing...'
                    : 'Ask anything...'
                }
                placeholderTextColor={micState.isRecording ? '#ef4444' : theme.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage(inputText)}
              />

              {/* Microphone voice note button */}
              <ChatMicButton
                onSpeechResult={handleVoiceInput}
                onRecordingStateChange={setMicState}
                isDarkMode={isDarkMode}
                isVisible={isVisible}
              />

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={!inputText.trim()}
                style={[
                  styles.sendButton,
                  inputText.trim() ? styles.sendButtonActive : [styles.sendButtonDisabled, { backgroundColor: theme.cardBg }],
                  { shadowColor: BRAND }
                ]}
                onPress={() => handleSendMessage(inputText)}
              >
                <Ionicons name="arrow-up" size={18} color={inputText.trim() ? '#ffffff' : theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Daily limit counter */}
            {plan === 'free' ? (
              <Text style={[styles.limitCounter, { color: theme.textSecondary }]}>
                {messageCount} of 5 daily messages used
              </Text>
            ) : (
              <Text style={[styles.limitCounter, { color: isDarkMode ? 'rgba(255,255,255,0.72)' : theme.textSecondary }]}>
                Focalyst Pro Active
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Layout Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Premium dim backdrop
    justifyContent: 'flex-end',
  },
  contentContainer: {
    height: '92%',
    backgroundColor: BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: BRAND,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 99,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  
  // Suggestion chips
  suggestionsContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 12,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  suggestionSpace: {
    flex: 1,
  },
  suggestionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  helperText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 8,
  },

  // Active chat items
  chatBubbleContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    width: '100%',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: BRAND,
    borderBottomRightRadius: 6,
    shadowColor: BRAND,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  aiBubble: {
    backgroundColor: CARD_BG,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  loadingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    color: '#ffffff',
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Footer Input
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 99,
    paddingHorizontal: 8,
    height: 52,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: TEXT_PRIMARY,
    paddingHorizontal: 8,
    height: '100%',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonActive: {
    backgroundColor: BRAND,
    shadowOpacity: 0.18,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  micButtonActive: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  limitCounter: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  copyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 6,
    opacity: 0.8,
  },
  copyActionText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },

  // Paywall UI bubble
  paywallBubble: {
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#ffedd5',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#ff6b2b',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  paywallIconBg: {
    width: 56,
    height: 56,
    backgroundColor: '#ffedd5',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  paywallTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  paywallDesc: {
    fontSize: 12.5,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  upgradeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 99,
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  upgradeBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  bannerContainer: {
    backgroundColor: '#ff6b2b',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 12,
    shadowColor: '#ff6b2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
