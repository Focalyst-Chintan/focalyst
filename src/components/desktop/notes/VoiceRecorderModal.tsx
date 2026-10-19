'use client';
import React, { useEffect, useRef, useState } from 'react';
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let secTimer: ReturnType<typeof setInterval>;
    let ctx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.start();
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
        secTimer = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch (err) {
        console.error('Microphone error:', err);
        onClose();
      }
    })();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(secTimer);
      ctx?.close().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onClose]);

  const handleStopAndSave = async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || saving) return;
    setSaving(true);
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      try {
        await onSaveAudio(blob, seconds);
      } finally {
        setSaving(false);
        onClose();
      }
    };
    rec.stop();
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <Modal isOpen={open} onClose={onClose} size="sm" title="Record voice note">
      <div className="flex flex-col items-center py-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
          {saving ? 'SUMMARISING WITH AI' : 'RECORDING'}
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
        <div className="mt-2 flex w-full items-center justify-end gap-3">
          <Button disabled={saving} onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={saving} onClick={handleStopAndSave} variant="primary">
            {saving ? 'Saving...' : 'Stop and save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
