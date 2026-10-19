import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useColorScheme,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { transcribeAudioUri, processTranscriptWithAI } from '../services/voiceNoteAI';

interface VoiceNoteRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: (savedNote: any) => void;
  userId?: string;
  supabase: any;
  isDarkMode?: boolean;
}

export const VoiceNoteRecorderModal: React.FC<VoiceNoteRecorderModalProps> = (props) => {
  if (!props.visible) return null;
  return <VoiceNoteRecorderModalContent {...props} />;
};

const VoiceNoteRecorderModalContent: React.FC<VoiceNoteRecorderModalProps> = ({
  visible,
  onClose,
  onSaveSuccess,
  userId,
  supabase,
  isDarkMode: propDarkMode,
}) => {
  const colorScheme = useColorScheme();
  const isDark = propDarkMode !== undefined ? propDarkMode : colorScheme !== 'light';

  const audioRecorder = useAudioRecorder({
    ...(RecordingPresets?.HIGH_QUALITY || {
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    }),
    isMeteringEnabled: true,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Listening... Speak clearly into your microphone.'
  );
  const BASE_BAR_HEIGHTS = [
    16, 22, 18, 28, 36, 24, 42, 54, 38, 48, 62, 70, 58, 44, 52, 36, 40, 26, 32, 20, 24, 16,
  ];

  const [barHeights, setBarHeights] = useState<number[]>(BASE_BAR_HEIGHTS);
  const isStoppingRef = useRef(false);
  const isSnapshottingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      startSession();
    } else {
      cleanupSession();
    }
    return () => {
      cleanupSession();
    };
  }, [visible]);

  // 1-second timer
  useEffect(() => {
    let timer: any = null;
    if (visible && isRecording && !isPaused && !isProcessing) {
      timer = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next >= 600 && isRecording && !isProcessing) {
            handleStopAndSave();
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, isRecording, isPaused, isProcessing]);

  // Live status message while recording (avoids reading unfinalized .m4a files)
  useEffect(() => {
    if (visible && isRecording && !isPaused && !isProcessing) {
      setStatusMessage('Listening... Speak freely. Your complete transcript will appear when you tap Stop.');
    }
  }, [visible, isRecording, isPaused, isProcessing]);

  // Live organic random noise + inertia waveform jitter engine
  useEffect(() => {
    let interval: any = null;
    if (visible && isRecording && !isPaused && !isProcessing) {
      interval = setInterval(() => {
        setBarHeights((prev) => {
          const totalBars = BASE_BAR_HEIGHTS.length;
          const centerIndex = Math.floor(totalBars / 2);
          return prev.map((currH, i) => {
            const baseHeight = BASE_BAR_HEIGHTS[i];
            const randomBurst = Math.random() * 0.75 + 0.25; // chaotic human speech variation
            const centerFactor = 1 - Math.abs(i - centerIndex) / (totalBars * 0.7); // taller in center
            const targetHeight = Math.max(12, baseHeight * randomBurst * Math.max(0.3, centerFactor));

            // Smooth interpolation (lerp) so bars glide organically instead of snapping:
            return currH * 0.4 + targetHeight * 0.6;
          });
        });
      }, 90);
    } else {
      setBarHeights(BASE_BAR_HEIGHTS);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, isRecording, isPaused, isProcessing]);

  const startSession = async () => {
    try {
      setSeconds(0);
      setLiveTranscript('');
      isStoppingRef.current = false;
      isSnapshottingRef.current = false;
      setIsPaused(false);
      setIsProcessing(false);
      setStatusMessage('Listening... Speak clearly into your microphone.');

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in Settings to record voice notes.'
        );
        onClose();
        return;
      }

      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch (modeErr) {
        console.warn('setAudioModeAsync error:', modeErr);
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', err?.message || 'Could not start audio recording.');
      onClose();
    }
  };

  /**
   * Copies the currently recording file to a temp path without stopping the microphone,
   * allowing Whisper to transcribe progressive audio if the OS flushes audio frames.
   */
  const pollLiveSnapshot = async () => {
    if (isSnapshottingRef.current || isStoppingRef.current || isPaused || isProcessing) return;
    const currentUri = audioRecorder.uri;
    if (!currentUri) return;

    isSnapshottingRef.current = true;
    const tempUri = `${FileSystem.cacheDirectory}live_snapshot_${Date.now()}.m4a`;

    try {
      const normalizedSource = currentUri.startsWith('file://')
        ? currentUri
        : `file://${currentUri}`;
      const info = await FileSystem.getInfoAsync(normalizedSource);

      if (info.exists && info.size && info.size > 8192) {
        await FileSystem.copyAsync({ from: normalizedSource, to: tempUri });
        setIsLiveSyncing(true);
        const partialText = await transcribeAudioUri(tempUri);
        if (partialText && !isStoppingRef.current) {
          setLiveTranscript(partialText);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
        }
      }
    } catch {
      // Ignore partial m4a container read warnings while recording is still open
    } finally {
      setIsLiveSyncing(false);
      isSnapshottingRef.current = false;
      FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
  };

  const cleanupSession = async () => {
    isStoppingRef.current = true;
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
    } catch {}
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {}
    setIsRecording(false);
    setIsPaused(false);
    setSeconds(0);
    setBarHeights(BASE_BAR_HEIGHTS);
  };

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        audioRecorder.record();
        setIsPaused(false);
      } else {
        audioRecorder.pause();
        setIsPaused(true);
      }
    } catch (e) {
      console.warn('Pause/Resume error:', e);
    }
  };

  const handleDiscard = async () => {
    await cleanupSession();
    onClose();
  };

  const handleStopAndSave = async () => {
    try {
      isStoppingRef.current = true;
      setIsProcessing(true);
      setIsRecording(false);
      setStatusMessage('Transcribing your recording with Whisper...');

      await audioRecorder.stop();
      // Give iOS AVAudioRecorder 300ms to finalize the m4a trailer on disk
      await new Promise((r) => setTimeout(r, 300));

      try {
        await setAudioModeAsync({ allowsRecording: false });
      } catch {}

      const finalUri = audioRecorder.uri;
      if (!finalUri) {
        throw new Error('No audio recording URI was generated.');
      }

      const fullRawTranscript = await transcribeAudioUri(finalUri);

      if (!fullRawTranscript || !fullRawTranscript.trim()) {
        Alert.alert(
          'No Speech Detected',
          'The microphone recorded silence. If you are using the iOS Simulator on a Mac, please check Simulator > I/O > Audio Input and ensure your Mac microphone is selected.'
        );
        setIsProcessing(false);
        onClose();
        return;
      }

      setLiveTranscript(fullRawTranscript);
      setStatusMessage('Generating structured summary...');

      let processed = {
        title: 'Voice Note',
        cleanedTranscript: fullRawTranscript,
        summary: fullRawTranscript,
      };

      try {
        processed = await processTranscriptWithAI(fullRawTranscript);
      } catch (aiErr) {
        console.warn('[VoiceNoteModal] AI summarization failed, saving raw transcript directly:', aiErr);
      }

      // Resolve user_id
      let finalUserId = userId;
      if (!finalUserId) {
        const { data: userData } = await supabase.auth.getUser();
        finalUserId = userData?.user?.id || '';
      }

      const notePayload = {
        user_id: finalUserId,
        title: processed.title || 'Voice Note',
        content: processed.summary || processed.cleanedTranscript,
        transcript: processed.cleanedTranscript || fullRawTranscript,
        note_type: 'voice',
        is_favourite: false,
        duration_seconds: seconds,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('notes')
        .insert([notePayload])
        .select()
        .single();

      if (error) {
        console.error('Supabase note insert error:', error);
        throw error;
      }

      setIsProcessing(false);
      onSaveSuccess(data);
    } catch (err: any) {
      console.warn('Voice Note Save Warning:', err?.message);
      setIsProcessing(false);
      const friendlyMsg =
        err?.message && !err.message.includes('{') && !err.message.includes('API') && !err.message.includes('413')
          ? err.message
          : 'Could not process voice note. Please try recording again.';
      Alert.alert('Voice Note Error', friendlyMsg);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${mins} : ${secs}`;
  };

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121c2a' : '#f8fafc' }]}>
        <View style={styles.container}>
          {/* TOP RECORDING CARD: Static Elegant iOS Widget Gradient */}
          <View
            style={[
              styles.topCard,
              {
                backgroundColor: '#0A0909',
                borderColor: 'rgba(59, 130, 246, 0.2)',
              },
            ]}
          >
            {/* Static Background & Bottom Blue Glow (LinearGradient) */}
            <LinearGradient
              colors={['#0A0909', '#0A0909', '#0F172A', '#1E3A8A', '#3B82F6', '#60A5FA']}
              locations={[0, 0.35, 0.55, 0.75, 0.92, 1.0]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.topBarRow, { zIndex: 2 }]}>
              <TouchableOpacity
                disabled={isProcessing}
                onPress={handleDiscard}
                style={[
                  styles.backCircle,
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.15)',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#ffffff" />
              </TouchableOpacity>

              <View
                style={[
                  styles.recordingBadge,
                  {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.15)',
                  },
                ]}
              >
                <View style={[styles.redDot, { opacity: isPaused ? 0.4 : 1 }]} />
                <Text style={[styles.recordingBadgeText, { color: '#ffffff' }]}>
                  {isProcessing ? 'PROCESSING AI' : isPaused ? 'PAUSED' : 'NOW RECORDING'}
                </Text>
              </View>

              <View style={{ width: 38 }} />
            </View>

            <Text style={[styles.sessionTitle, { color: '#ffffff', zIndex: 2 }]}>
              Voice Note Session
            </Text>
            <Text style={[styles.sessionSubtitle, { color: 'rgba(255, 255, 255, 0.7)', zIndex: 2 }]}>
              High Accuracy • 44.1 kHz
            </Text>

            <Text style={[styles.timerText, { color: '#ffffff', zIndex: 2 }]}>
              {formatTime(seconds)}
            </Text>

            <View style={[styles.waveformContainer, { zIndex: 2 }]}>
              {barHeights.map((currentHeight, i) => {
                const totalBars = barHeights.length;
                const centerIndex = Math.floor(totalBars / 2);
                const isCenter = i === centerIndex;
                const distFromCenter = Math.abs(i - centerIndex);
                const isActive = isRecording && !isPaused && !isProcessing;

                let barColor: string;
                if (isCenter) {
                  barColor = '#FF3B30';
                } else if (isActive) {
                  if (currentHeight > 36) {
                    barColor = '#60A5FA';
                  } else if (currentHeight > 22) {
                    barColor = '#3B82F6';
                  } else {
                    barColor = 'rgba(96, 165, 250, 0.35)';
                  }
                } else {
                  const isOuter = distFromCenter > 6;
                  barColor = isOuter ? 'rgba(96, 165, 250, 0.35)' : '#60A5FA';
                }

                return (
                  <View
                    key={i}
                    style={[
                      styles.waveformBar,
                      {
                        height: isCenter ? Math.max(currentHeight, 46) : currentHeight,
                        width: isCenter ? 6 : 4,
                        backgroundColor: barColor,
                      },
                      isCenter && {
                        shadowColor: '#FF3B30',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 6,
                        elevation: 4,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* MIDDLE TRANSCRIPT LIVE CARD */}
          <View
            style={[
              styles.transcriptCard,
              {
                backgroundColor: isDark ? '#16202c' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.transcriptHeader}>
              <View style={styles.transcriptTitleRow}>
                <Text style={[styles.transcriptTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
                  Transcript
                </Text>
                <View
                  style={[
                    styles.liveBadge,
                    {
                      backgroundColor: isDark ? 'rgba(74,108,140,0.3)' : 'rgba(49,84,114,0.12)',
                      borderColor: isDark ? 'rgba(74,108,140,0.5)' : 'rgba(49,84,114,0.3)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: isDark ? '#a7caee' : '#315472' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveBadgeText,
                      { color: isDark ? '#a7caee' : '#315472' },
                    ]}
                  >
                    LIVE
                  </Text>
                </View>
              </View>
              {(isProcessing || isLiveSyncing) && (
                <ActivityIndicator size="small" color={isDark ? '#a7caee' : '#315472'} />
              )}
            </View>

            <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} style={styles.transcriptScroll}>
              {liveTranscript ? (
                <Text style={[styles.transcriptBody, { color: isDark ? '#f1f5f9' : '#1e293b' }]}>
                  "{liveTranscript}"
                </Text>
              ) : (
                <Text style={[styles.transcriptPlaceholder, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                  {statusMessage}
                </Text>
              )}
            </ScrollView>
          </View>

          {/* BOTTOM 3-BUTTON DOCK */}
          <View style={styles.bottomDock}>
            <TouchableOpacity
              disabled={isProcessing}
              onPress={handleDiscard}
              style={[
                styles.sideButton,
                {
                  backgroundColor: isDark ? '#1c2633' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                },
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={20} color={isDark ? '#94a3b8' : '#475569'} />
              </View>
              <Text style={[styles.dockLabel, { color: isDark ? '#94a3b8' : '#475569' }]}>
                Discard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isProcessing}
              onPress={handleStopAndSave}
              style={[
                styles.centerStopCard,
                {
                  backgroundColor: isDark ? '#1c2633' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.redStopCircle}>
                {isProcessing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.whiteStopSquare} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isProcessing}
              onPress={handleTogglePause}
              style={[
                styles.sideButton,
                {
                  backgroundColor: isDark ? '#1c2633' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                },
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                  },
                ]}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={20}
                  color={isDark ? '#a7caee' : '#315472'}
                />
              </View>
              <Text style={[styles.dockLabel, { color: isDark ? '#a7caee' : '#315472' }]}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 8,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  topCard: {
    borderRadius: 32,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#0A0909',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  topBarRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 7,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ba1a1a',
  },
  recordingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sessionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 10,
  },
  timerText: {
    fontSize: 44,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    marginVertical: 4,
  },
  waveformContainer: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  waveformBar: {
    borderRadius: 4,
  },
  transcriptCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginVertical: 14,
    maxHeight: 210,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transcriptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  transcriptPlaceholder: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  bottomDock: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingTop: 4,
  },
  sideButton: {
    flex: 1,
    height: 78,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  centerStopCard: {
    flex: 1,
    height: 78,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redStopCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ba1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  whiteStopSquare: {
    width: 15,
    height: 15,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
