import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { transcribeAudioWithWhisper } from '../src/services/openRouterService';

export interface ChatMicButtonProps {
  onSpeechResult: (text: string) => void;
  onRecordingStateChange?: (state: { isRecording: boolean; isTranscribing: boolean }) => void;
  isDarkMode: boolean;
  isVisible: boolean;
}

function getExpoAudio() {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    const nativeModule = requireOptionalNativeModule('ExpoAudio');
    if (!nativeModule) return null;
    return require('expo-audio');
  } catch {
    return null;
  }
}

export default function ChatMicButton({
  onSpeechResult,
  onRecordingStateChange,
  isDarkMode,
  isVisible,
}: ChatMicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<any>(null);

  const cleanupRecording = async () => {
    if (recorderRef.current) {
      try {
        await recorderRef.current.stop();
      } catch {
        // Silently handle
      }
      recorderRef.current = null;
    }
  };

  useEffect(() => {
    if (!isVisible && (isRecording || isTranscribing)) {
      cleanupRecording();
      setIsRecording(false);
      setIsTranscribing(false);
      onRecordingStateChange?.({ isRecording: false, isTranscribing: false });
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const handlePress = async () => {
    if (isTranscribing) return;

    const expoAudio = getExpoAudio();
    if (!expoAudio || !expoAudio.AudioModule) {
      Alert.alert(
        'Voice Recording',
        'Voice recording requires the native audio build. Run `npx expo run:android` to compile native audio libraries.'
      );
      return;
    }

    const { AudioModule, setAudioModeAsync, RecordingPresets } = expoAudio;

    if (isRecording) {
      try {
        setIsRecording(false);
        setIsTranscribing(true);
        onRecordingStateChange?.({ isRecording: false, isTranscribing: true });

        const recorder = recorderRef.current;
        if (!recorder) {
          setIsTranscribing(false);
          onRecordingStateChange?.({ isRecording: false, isTranscribing: false });
          return;
        }

        await recorder.stop();
        // Wait 100ms to ensure the audio file is fully written and finalized on disk
        await new Promise((r) => setTimeout(r, 100));
        await setAudioModeAsync({ allowsRecording: false });

        let uri = recorder.uri || (recorder.getStatus ? recorder.getStatus()?.url : undefined);
        recorderRef.current = null;

        if (!uri || typeof uri !== 'string' || !uri.trim()) {
          throw new Error('No audio recorded. Please speak for at least 1 second.');
        }

        if (Platform.OS !== 'web' && !uri.startsWith('file://') && !uri.startsWith('content://')) {
          uri = `file://${uri}`;
        }

        const transcript = await transcribeAudioWithWhisper(uri);
        if (transcript && transcript.trim()) {
          onSpeechResult(transcript.trim());
        }
      } catch (err: any) {
        console.warn('Voice transcription error:', err);
        const friendlyMsg =
          err?.message && !err.message.includes('{') && !err.message.includes('API') && !err.message.includes('413')
            ? err.message
            : 'Could not transcribe voice audio. Please try speaking again.';
        Alert.alert('Dictation Error', friendlyMsg);
      } finally {
        setIsTranscribing(false);
        onRecordingStateChange?.({ isRecording: false, isTranscribing: false });
      }
    } else {
      try {
        await cleanupRecording();

        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission Required',
            'Microphone access is required for voice dictation.'
          );
          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        const recorderOptions = RecordingPresets?.HIGH_QUALITY || {
          extension: '.m4a',
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        };

        const recorder = new AudioModule.AudioRecorder(recorderOptions);
        await recorder.prepareToRecordAsync();
        recorder.record();

        recorderRef.current = recorder;
        setIsRecording(true);
        onRecordingStateChange?.({ isRecording: true, isTranscribing: false });
      } catch (err: any) {
        console.warn('Failed to start voice recording:', err);
        Alert.alert('Error', 'Unable to start recording. Please try again.');
        setIsRecording(false);
        onRecordingStateChange?.({ isRecording: false, isTranscribing: false });
      }
    }
  };

  return (
    <TouchableOpacity
      id="voice-mic-btn"
      activeOpacity={0.7}
      disabled={isTranscribing}
      style={{
        padding: 10,
        borderRadius: 99,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: isRecording
          ? '#ef4444'
          : isTranscribing
          ? isDarkMode
            ? '#2d3748'
            : '#e2e8f0'
          : isDarkMode
          ? '#222A41'
          : '#f1f5f9',
      }}
      onPress={handlePress}
    >
      {isTranscribing ? (
        <ActivityIndicator size="small" color={isDarkMode ? '#8E95A9' : '#64748b'} />
      ) : (
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={18}
          color={isRecording ? '#ffffff' : isDarkMode ? '#8E95A9' : '#64748b'}
        />
      )}
    </TouchableOpacity>
  );
}
