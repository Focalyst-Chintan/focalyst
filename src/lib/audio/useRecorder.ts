'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export function pickMime(): string {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const t of options) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

export function extFor(mime: string): string {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (base === 'audio/mp4' || base === 'audio/x-m4a' || base === 'audio/m4a') return 'm4a';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  if (base === 'audio/mpeg') return 'mp3';
  return 'webm';
}

export interface UseRecorderOptions {
  onAutoStop?: () => void;
}

export interface UseRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingSeconds: number;
  error: string | null;
  setError: (err: string | null) => void;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  stream: MediaStream | null;
}

export function useRecorder(options?: UseRecorderOptions): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isStoppingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.onstop = null;
        rec.ondataavailable = null;
        rec.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    releaseStream();
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
    isStoppingRef.current = false;
  }, [releaseStream]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive' || isStoppingRef.current) {
      return null;
    }
    isStoppingRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setError(null);

    return new Promise<string | null>((resolve) => {
      rec.onstop = async () => {
        try {
          const mime = pickMime();
          const blob = new Blob(chunksRef.current, {
            type: rec.mimeType || mime || 'audio/webm',
          });
          chunksRef.current = [];
          releaseStream();

          if (blob.size < 2000) {
            const msg = 'That was too short. Hold the mic a little longer.';
            setError(msg);
            resolve(null);
            return;
          }

          if (blob.size > 4_000_000) {
            const msg = 'That recording is too long. Keep it under 10 minutes.';
            setError(msg);
            resolve(null);
            return;
          }

          setIsTranscribing(true);

          const fd = new FormData();
          fd.append('file', blob, `recording.${extFor(blob.type)}`);

          let res: Response;
          try {
            res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              body: fd,
              credentials: 'same-origin',
            });
          } catch (fetchErr) {
            console.error('[recorder] network error', fetchErr);
            setError('Could not reach Focalyst. Check your connection and try again.');
            resolve(null);
            return;
          }

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error('[recorder]', res.status, data.code);
            setError(data.error || 'Could not process that recording. Please try again.');
            resolve(null);
            return;
          }

          const data = await res.json();
          resolve(data.text || '');
        } catch (procErr: any) {
          console.error('[recorder] process error', procErr);
          setError('Could not process that recording. Please try again.');
          resolve(null);
        } finally {
          setIsTranscribing(false);
          isStoppingRef.current = false;
          mediaRecorderRef.current = null;
        }
      };

      try {
        rec.stop();
      } catch (err) {
        console.error('[recorder] rec.stop error', err);
        releaseStream();
        setIsTranscribing(false);
        isStoppingRef.current = false;
        resolve(null);
      }
    });
  }, [releaseStream]);

  // Handle 10-minute cap
  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    cancelRecording();
    setError(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Allow microphone access in your browser settings to record.');
      return false;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      const mime = pickMime();
      const recorder = new MediaRecorder(
        mediaStream,
        mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }
      );

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          if (next >= 600) {
            // 10 minutes cap reached
            stopRecordingRef.current();
            options?.onAutoStop?.();
            return 600;
          }
          return next;
        });
      }, 1000);

      return true;
    } catch (err: any) {
      console.error('[recorder] getUserMedia error:', err);
      setError('Allow microphone access in your browser settings to record.');
      releaseStream();
      return false;
    }
  }, [cancelRecording, releaseStream, options]);

  return {
    isRecording,
    isTranscribing,
    recordingSeconds,
    error,
    setError,
    startRecording,
    stopRecording,
    cancelRecording,
    stream,
  };
}
