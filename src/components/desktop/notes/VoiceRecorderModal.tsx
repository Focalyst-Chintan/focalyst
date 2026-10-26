'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from '@/components/desktop/ui/Modal';
import { Button } from '@/components/desktop/ui/Button';
import { useRecorder } from '@/lib/audio/useRecorder';

export default function VoiceRecorderModal({
  open,
  onClose,
  onSaveVoiceNote,
  onSaveAudio,
}: {
  open: boolean;
  onClose: () => void;
  onSaveVoiceNote?: (transcript: string, durationSec: number) => Promise<void>;
  onSaveAudio?: (blob: Blob, durationSec: number) => Promise<void>;
}) {
  const [bars, setBars] = useState<number[]>(() => Array(32).fill(6));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    isRecording,
    isTranscribing,
    recordingSeconds,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
    stream,
  } = useRecorder();

  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync recorder error
  useEffect(() => {
    if (recorderError) {
      setErrorMessage(recorderError);
    }
  }, [recorderError]);

  // Start recording on modal open, cancel on close
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setSaving(false);
      startRecording();
    } else {
      cancelRecording();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    }
  }, [open, startRecording, cancelRecording]);

  // Waveform animation from recorder stream
  useEffect(() => {
    if (!stream) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        setBars(Array.from(data.slice(0, 32), (v) => Math.max(4, Math.round(4 + (v / 255) * 44))));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('[VoiceRecorderModal] AudioContext error:', e);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [stream]);

  const handleStopAndSave = useCallback(async () => {
    setErrorMessage(null);
    const duration = recordingSeconds;
    const text = await stopRecording();

    if (!text || !text.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (onSaveVoiceNote) {
        await onSaveVoiceNote(text.trim(), duration);
      } else if (onSaveAudio) {
        // Fallback for audio blob callers
        const blob = new Blob([text.trim()], { type: 'text/plain' });
        await onSaveAudio(blob, duration);
      }
      onClose();
    } catch (err: any) {
      console.error('[VoiceRecorderModal] Save error:', err);
      setErrorMessage('Could not process that recording. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [recordingSeconds, stopRecording, onSaveVoiceNote, onSaveAudio, onClose]);

  const mm = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
  const ss = String(recordingSeconds % 60).padStart(2, '0');

  const isBusy = saving || isTranscribing;

  return (
    <Modal isOpen={open} onClose={onClose} size="sm" title="Record voice note">
      <div className="flex flex-col items-center py-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
          {saving ? 'Summarising with AI' : isTranscribing ? 'Transcribing...' : 'Recording'}
        </span>
        <div className="mt-2 font-ui text-[32px] font-semibold tabular-nums text-ink">
          {mm}:{ss}
        </div>
        <div className="my-6 flex h-14 items-center justify-center gap-[3px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {errorMessage && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-[12px] text-danger text-center">
            {errorMessage}
          </div>
        )}

        <div className="mt-2 flex w-full items-center justify-end gap-3">
          <Button disabled={isBusy} onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isBusy} onClick={handleStopAndSave} variant="primary">
            {isBusy ? 'Saving...' : 'Stop and save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
