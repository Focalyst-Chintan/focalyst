import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, DeviceEventEmitter, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { processTranscriptWithAI, transcribeAudioUri } from '../../services/voiceNoteAI';
import { supabase } from '../utils/supabase';
import { useUser } from '../utils/UserContext';
import { mutateWithOfflineQueue } from './outageResilienceService';
import {
  consumePendingVoiceNoteIntent,
  subscribeVoiceNoteIntent,
  type VoiceNoteIntent,
} from './voiceNoteIntent';

const WAVEFORM_BUFFER_SIZE = 38;
export const INITIAL_WAVEFORM_SAMPLES = Array.from({ length: WAVEFORM_BUFFER_SIZE }, () => 0.08);

interface VoiceNoteContextValue {
  visible: boolean;
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  permissionDenied: boolean;
  seconds: number;
  liveTranscript: string;
  statusMessage: string;
  waveformSamples: number[];
  openAndStartRecording: () => void;
  bringToFront: () => void;
  retryPermissionsAndStart: () => void;
  openSettings: () => void;
  togglePause: () => Promise<void>;
  discardRecording: () => Promise<void>;
  stopAndSaveRecording: () => Promise<void>;
}

const VoiceNoteContext = createContext<VoiceNoteContextValue | null>(null);

export function useVoiceNoteRecorder(): VoiceNoteContextValue {
  const ctx = useContext(VoiceNoteContext);
  if (!ctx) {
    throw new Error('useVoiceNoteRecorder must be used inside VoiceNoteProvider');
  }
  return ctx;
}

export function VoiceNoteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile } = useUser();
  const userId = user?.id || profile?.id || '';

  const audioRecorder = useAudioRecorder({
    ...(RecordingPresets?.HIGH_QUALITY || {
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    }),
    isMeteringEnabled: true,
  });

  const [visible, setVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Listening... Speak clearly into your microphone.'
  );
  const [waveformSamples, setWaveformSamples] = useState<number[]>(INITIAL_WAVEFORM_SAMPLES);

  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);

  const recordingStartedAtMsRef = useRef<number | null>(null);
  const accumulatedPausedMsRef = useRef<number>(0);
  const pauseStartedAtMsRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const fallbackPhaseRef = useRef(0);
  const lastHandledIntentIdRef = useRef<number | null>(null);

  const getElapsedMs = useCallback((atMs: number = Date.now()): number => {
    if (!recordingStartedAtMsRef.current) return 0;
    const activePauseMs =
      pauseStartedAtMsRef.current !== null ? Math.max(0, atMs - pauseStartedAtMsRef.current) : 0;
    return Math.max(
      0,
      atMs - recordingStartedAtMsRef.current - accumulatedPausedMsRef.current - activePauseMs
    );
  }, []);

  const resetAudioSession = useCallback(async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
    } catch {}
  }, []);

  const cleanupSession = useCallback(async () => {
    isStoppingRef.current = true;
    isStartingRef.current = false;

    try {
      if (audioRecorder.isRecording) {
        await Promise.race([
          audioRecorder.stop(),
          new Promise((resolve) => setTimeout(resolve, 700)),
        ]);
      }
    } catch {}

    await resetAudioSession();

    recordingStartedAtMsRef.current = null;
    accumulatedPausedMsRef.current = 0;
    pauseStartedAtMsRef.current = null;
    sessionIdRef.current = null;

    isRecordingRef.current = false;
    isPausedRef.current = false;
    isProcessingRef.current = false;

    setIsRecording(false);
    setIsPaused(false);
    setIsProcessing(false);
    setPermissionDenied(false);
    setSeconds(0);
    setLiveTranscript('');
    setWaveformSamples(INITIAL_WAVEFORM_SAMPLES);
  }, [audioRecorder, resetAudioSession]);

  const stopAndSaveRecording = useCallback(async () => {
    if (isStoppingRef.current || isProcessingRef.current) return;
    isStoppingRef.current = true;
    isProcessingRef.current = true;

    const capturedDurationSec = Math.floor(getElapsedMs() / 1000);

    setIsProcessing(true);
    setIsRecording(false);
    isRecordingRef.current = false;
    setStatusMessage('Transcribing your voice note...');

    try {
      await audioRecorder.stop();
      // Allow iOS AVAudioRecorder to finalize the .m4a trailer on disk.
      await new Promise((r) => setTimeout(r, 300));
      await resetAudioSession();

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
        await cleanupSession();
        setVisible(false);
        return;
      }

      setLiveTranscript(fullRawTranscript);
      setStatusMessage('Generating structured summary...');

      let processed = {
        title: 'Voice Note',
        cleanedTranscript: fullRawTranscript,
        summary: fullRawTranscript,
      };

      let summarizationFailureReason: string | undefined;
      try {
        const aiResult = await processTranscriptWithAI(fullRawTranscript);
        processed = aiResult;
        summarizationFailureReason = aiResult.summarizationError;
      } catch (aiErr: any) {
        console.warn('[VoiceNote] AI summarization failed, saving raw transcript directly:', aiErr);
        summarizationFailureReason = aiErr?.message || 'Could not reach AI summarization service.';
      }

      if (summarizationFailureReason) {
        Alert.alert(
          'AI Summary Unavailable',
          `Saved your transcript, but AI summarization failed: ${summarizationFailureReason}`
        );
      }

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
        duration_seconds: capturedDurationSec,
        updated_at: new Date().toISOString(),
      };

      let savedNote: any = null;
      try {
        const { data, error } = await supabase
          .from('notes')
          .insert([notePayload])
          .select()
          .single();

        if (error) throw error;
        savedNote = data;
      } catch (insertErr: any) {
        if (
          insertErr?.status >= 500 ||
          insertErr?.message?.includes('FetchError') ||
          insertErr?.message?.includes('Network') ||
          insertErr?.message?.includes('timeout') ||
          insertErr?.message?.includes('Failed to fetch')
        ) {
          const offlineNote = {
            ...notePayload,
            id: `offline_${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          await mutateWithOfflineQueue(
            { table: 'notes', action: 'insert', payload: notePayload },
            'notes',
            (existing) => [offlineNote, ...(Array.isArray(existing) ? existing : [])]
          );
          savedNote = offlineNote;
        } else {
          throw insertErr;
        }
      }

      await cleanupSession();
      setVisible(false);
      DeviceEventEmitter.emit('refreshNotes');
      if (savedNote?.id) {
        router.push(`/note/${savedNote.id}` as any);
      }
    } catch (err: any) {
      console.warn('Voice Note Save Warning:', err?.message);
      await cleanupSession();
      setStatusMessage('Recording stopped. Tap Discard or try again.');
      const friendlyMsg =
        err?.message &&
        !err.message.includes('{') &&
        !err.message.includes('API') &&
        !err.message.includes('413')
          ? err.message
          : 'Could not process voice note. Please try recording again.';
      Alert.alert('Voice Note Error', friendlyMsg, [
        { text: 'OK', onPress: () => setVisible(false) },
      ]);
    } finally {
      isStoppingRef.current = false;
      isProcessingRef.current = false;
    }
  }, [audioRecorder, cleanupSession, getElapsedMs, resetAudioSession, router, userId]);

  const startRecordingSession = useCallback(async () => {
    if (
      isStartingRef.current ||
      isRecordingRef.current ||
      isPausedRef.current ||
      isProcessingRef.current
    ) {
      return;
    }
    isStartingRef.current = true;
    isStoppingRef.current = false;

    try {
      setSeconds(0);
      setLiveTranscript('');
      setPermissionDenied(false);
      setIsPaused(false);
      setIsProcessing(false);
      setStatusMessage('Listening... Speak clearly into your microphone.');

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setPermissionDenied(true);
        setStatusMessage(
          'Microphone permission is disabled. Enable microphone access in Settings to start recording.'
        );
        return;
      }

      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          allowsBackgroundRecording: true,
          interruptionMode: 'doNotMix',
        });
      } catch (modeErr) {
        console.warn('setAudioModeAsync error:', modeErr);
      }

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      const now = Date.now();
      const sid = `voice_${now}`;
      recordingStartedAtMsRef.current = now;
      accumulatedPausedMsRef.current = 0;
      pauseStartedAtMsRef.current = null;
      sessionIdRef.current = sid;

      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);
      setStatusMessage(
        'Listening... Speak freely. Your complete transcript will appear when you tap Stop.'
      );
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', err?.message || 'Could not start audio recording.');
      setVisible(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [audioRecorder]);

  const openAndStartRecording = useCallback(() => {
    setVisible(true);
    if (
      isRecordingRef.current ||
      isPausedRef.current ||
      isProcessingRef.current ||
      isStartingRef.current
    ) {
      return;
    }
    void startRecordingSession();
  }, [startRecordingSession]);

  const bringToFront = useCallback(() => {
    setVisible(true);
    if (recordingStartedAtMsRef.current) {
      setSeconds(Math.floor(getElapsedMs() / 1000));
    }
  }, [getElapsedMs]);

  const retryPermissionsAndStart = useCallback(() => {
    void startRecordingSession();
  }, [startRecordingSession]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  const togglePause = useCallback(async () => {
    if (!isRecordingRef.current || isProcessingRef.current) return;
    try {
      const now = Date.now();
      if (isPausedRef.current) {
        if (pauseStartedAtMsRef.current !== null) {
          accumulatedPausedMsRef.current += Math.max(0, now - pauseStartedAtMsRef.current);
          pauseStartedAtMsRef.current = null;
        }
        audioRecorder.record();
        isPausedRef.current = false;
        setIsPaused(false);

        const elapsedSec = Math.floor(getElapsedMs(now) / 1000);
        setSeconds(elapsedSec);
      } else {
        audioRecorder.pause();
        pauseStartedAtMsRef.current = now;
        isPausedRef.current = true;
        setIsPaused(true);

        const elapsedSec = Math.floor(getElapsedMs(now) / 1000);
        setSeconds(elapsedSec);
      }
    } catch (e) {
      console.warn('Pause/Resume error:', e);
    }
  }, [audioRecorder, getElapsedMs]);

  const discardRecording = useCallback(async () => {
    try {
      await cleanupSession();
    } catch (err) {
      console.warn('discardRecording cleanup error:', err);
    } finally {
      setVisible(false);
    }
  }, [cleanupSession]);

  // Handle pending and live widget intents.
  const handleIntent = useCallback(
    (intent: VoiceNoteIntent | null) => {
      if (!intent) return;
      if (lastHandledIntentIdRef.current === intent.id) return;
      lastHandledIntentIdRef.current = intent.id;

      if (intent.action === 'open') {
        bringToFront();
      } else if (intent.action === 'start') {
        openAndStartRecording();
      }
    },
    [bringToFront, openAndStartRecording]
  );

  useEffect(() => {
    const initialIntent = consumePendingVoiceNoteIntent();
    if (initialIntent) {
      handleIntent(initialIntent);
    }

    const unsub = subscribeVoiceNoteIntent(() => {
      const next = consumePendingVoiceNoteIntent();
      if (next) handleIntent(next);
    });
    return unsub;
  }, [handleIntent]);

  // Wall-clock elapsed timer (never drifts across background/foreground transitions).
  useEffect(() => {
    if (!isRecording || isPaused || isProcessing) return;

    const syncElapsed = () => {
      const elapsedSec = Math.floor(getElapsedMs() / 1000);
      setSeconds((prev) => (prev !== elapsedSec ? elapsedSec : prev));
      if (elapsedSec >= 600 && isRecordingRef.current && !isProcessingRef.current) {
        void stopAndSaveRecording();
      }
    };

    syncElapsed();
    const interval = setInterval(syncElapsed, 250);
    return () => clearInterval(interval);
  }, [getElapsedMs, isPaused, isProcessing, isRecording, stopAndSaveRecording]);

  // Sync timer immediately upon returning to foreground; never stop/pause on background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isRecordingRef.current) {
        setSeconds(Math.floor(getElapsedMs() / 1000));
      }
    });
    return () => sub.remove();
  }, [getElapsedMs]);

  // Real-time studio waveform sampler while modal is visible and recording.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (visible && isRecording && !isPaused && !isProcessing) {
      interval = setInterval(() => {
        let nextSample = 0.08;
        try {
          const status = audioRecorder.getStatus();
          const db = status?.metering;
          if (typeof db === 'number' && Number.isFinite(db) && db > -159) {
            const linear = Math.max(0, Math.min(1, (db + 60) / 60));
            const eased = Math.pow(linear, 1.35);
            const microVar = (Math.random() - 0.5) * 0.03;
            nextSample = Math.max(0.08, Math.min(1, 0.08 + eased * 0.92 + microVar));
          } else {
            fallbackPhaseRef.current += 0.45;
            const wave =
              0.18 +
              0.22 * Math.abs(Math.sin(fallbackPhaseRef.current)) +
              0.14 * Math.random();
            nextSample = Math.max(0.08, Math.min(0.75, wave));
          }
        } catch {
          nextSample = 0.08 + Math.random() * 0.05;
        }

        setWaveformSamples((prev) => [...prev.slice(1), nextSample]);
      }, 80);
    } else if (!isPaused && !isRecording) {
      setWaveformSamples(INITIAL_WAVEFORM_SAMPLES);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [audioRecorder, isPaused, isProcessing, isRecording, visible]);

  return (
    <VoiceNoteContext.Provider
      value={{
        visible,
        isRecording,
        isPaused,
        isProcessing,
        permissionDenied,
        seconds,
        liveTranscript,
        statusMessage,
        waveformSamples,
        openAndStartRecording,
        bringToFront,
        retryPermissionsAndStart,
        openSettings,
        togglePause,
        discardRecording,
        stopAndSaveRecording,
      }}
    >
      {children}
    </VoiceNoteContext.Provider>
  );
}
