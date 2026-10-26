'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from '@/components/desktop/ui/Modal';
import { Button } from '@/components/desktop/ui/Button';

export default function VoiceRecorderModal({
  open,
  onClose,
  onSaveAudio,
}: {
  open: boolean;
  onClose: () => void;
  onSaveAudio: (blob: Blob, durationSec: number) => Promise<void>;
}) {
  const [seconds, setSeconds] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(32).fill(6));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isStoppingRef = useRef(false);

  const stopRecording = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || isStoppingRef.current) return;
    isStoppingRef.current = true;
    setSaving(true);
    setErrorMessage(null);

    rec.onstop = async () => {
      const mime = rec.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      if (blob.size === 0) {
        setErrorMessage('Could not process that recording. Please try again.');
        setSaving(false);
        isStoppingRef.current = false;
        return;
      }

      if (blob.size > 4 * 1024 * 1024) {
        setErrorMessage('That recording is too long. Keep voice notes under 10 minutes.');
        setSaving(false);
        isStoppingRef.current = false;
        return;
      }

      try {
        await onSaveAudio(blob, seconds);
        onClose();
      } catch (err: any) {
        console.error('Save audio error:', err);
        setErrorMessage('Could not process that recording. Please try again.');
      } finally {
        setSaving(false);
        isStoppingRef.current = false;
      }
    };

    try {
      rec.stop();
    } catch {
      setSaving(false);
      isStoppingRef.current = false;
    }
  }, [onSaveAudio, seconds, onClose]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let secTimer: ReturnType<typeof setInterval>;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    isStoppingRef.current = false;
    setErrorMessage(null);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setErrorMessage('Allow microphone access in your browser settings to record.');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];

        const preferredMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        let chosenMime = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined') {
          for (const candidate of preferredMimes) {
            if (MediaRecorder.isTypeSupported(candidate)) {
              chosenMime = candidate;
              break;
            }
          }
        }

        const recorder = new MediaRecorder(stream, {
          mimeType: chosenMime,
          audioBitsPerSecond: 32000,
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.start(500);
        mediaRecorderRef.current = recorder;

        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          setBars(Array.from(data.slice(0, 32), (v) => Math.max(4, Math.round(4 + (v / 255) * 44))));
          raf = requestAnimationFrame(tick);
        };
        tick();

        setSeconds(0);
        secTimer = setInterval(() => {
          setSeconds((s) => {
            const next = s + 1;
            if (next >= 600) {
              stopRecording();
              return 600;
            }
            return next;
          });
        }, 1000);
      } catch (err: any) {
        console.error('Microphone error:', err);
        setErrorMessage('Allow microphone access in your browser settings to record.');
      }
    })();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(secTimer);
      ctx?.close().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, stopRecording]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <Modal isOpen={open} onClose={onClose} size="sm" title="Record voice note">
      <div className="flex flex-col items-center py-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
          {saving ? 'Summarising with AI' : 'Recording'}
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
          <Button disabled={saving} onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={saving} onClick={stopRecording} variant="primary">
            {saving ? 'Saving...' : 'Stop and save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
