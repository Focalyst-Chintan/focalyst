'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

const SCOPE_TAGS = [
  'Daily Planning',
  'Pomodoro & App Blocker',
  'Voice Notes',
  'AI & Insights',
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ProductWalkthroughSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(164.35); // 2:44
  const [isScrubbing, setIsScrubbing] = useState(false);

  const onPlay = useCallback(() => setIsPlaying(true), []);
  const onPause = useCallback(() => setIsPlaying(false), []);
  const onEnded = useCallback(() => setIsPlaying(false), []);

  const onTimeUpdate = useCallback(() => {
    if (!isScrubbing && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [isScrubbing]);

  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration) {
      setDuration(video.duration);
    }
    // Seek to 0.5s so a crisp initial frame is visible before playback starts
    if (video.currentTime === 0) {
      video.currentTime = 0.5;
    }
  }, []);

  const onVolumeChange = useCallback(() => {
    if (videoRef.current) {
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.muted = false;
      setIsMuted(false);
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentTime(0);
    video.muted = false;
    setIsMuted(false);
    video.play().catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    });
  }, []);

  const seekToPosition = useCallback(
    (clientX: number) => {
      const track = progressTrackRef.current;
      const video = videoRef.current;
      if (!track || !video) return;

      const rect = track.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const targetPercent = rect.width > 0 ? clickX / rect.width : 0;
      const targetTime = targetPercent * (video.duration || duration);

      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    },
    [duration]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsScrubbing(true);
      seekToPosition(e.clientX);

      const onPointerMove = (moveEvent: PointerEvent) => {
        seekToPosition(moveEvent.clientX);
      };

      const onPointerUp = () => {
        setIsScrubbing(false);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [seekToPosition]
  );

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <section
      className="fx-reveal mx-auto w-full max-w-[960px]"
      aria-labelledby="product-walkthrough-heading"
    >
      {/* Section Header */}
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          PRODUCT WALKTHROUGH · 2 MIN 44 SEC
        </span>
        <h2
          id="product-walkthrough-heading"
          className="mt-3 font-display text-[28px] leading-[34px] text-ink sm:text-[36px] sm:leading-[42px]"
        >
          See Focalyst in action.
        </h2>
        <p className="mx-auto mt-3 max-w-[680px] text-[15px] leading-[26px] text-ink-2 sm:text-[16px]">
          A complete walkthrough of daily planning, distraction-free focus sessions, voice notes, habits, and AI insights working together in one calm app.
        </p>
      </div>

      {/* 16:9 Studio Video Frame */}
      <div className="relative mt-8 sm:mt-10 aspect-video w-full overflow-hidden rounded-[24px] sm:rounded-[28px] border border-snow/15 bg-snow shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
        <video
          ref={videoRef}
          playsInline
          preload="metadata"
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onVolumeChange={onVolumeChange}
          onClick={togglePlay}
          className="h-full w-full object-contain cursor-pointer"
          aria-label="Walkthrough video demonstrating Focalyst features"
        >
          <source src="/videos/focalyst-walkthrough.mp4" type="video/mp4" />
          <source src="/videos/focalyst-walkthrough.mp4" type="video/quicktime" />
        </video>

        {/* Centered Tactile Play Button Overlay */}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play product walkthrough"
            className="pointer-events-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full glass-strong liquid border border-snow/50 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
          >
            <Play className="h-6 w-6 sm:h-8 sm:w-8 translate-x-0.5 fill-current text-ink" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Custom Minimal Control Bar */}
      <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-snow/10 bg-snow/[0.04] px-4 py-3 backdrop-blur-md">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] active:scale-95"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" strokeWidth={1.75} />
          ) : (
            <Play className="h-4 w-4 translate-x-px fill-current" strokeWidth={1.75} />
          )}
        </button>

        {/* Mute/Unmute Button */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] active:scale-95"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Volume2 className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>

        {/* Interactive Progress / Scrub Bar */}
        <div
          ref={progressTrackRef}
          onPointerDown={handlePointerDown}
          role="slider"
          aria-label="Video playback progress"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              const video = videoRef.current;
              if (video) {
                video.currentTime = Math.min(duration, video.currentTime + 5);
              }
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              const video = videoRef.current;
              if (video) {
                video.currentTime = Math.max(0, video.currentTime - 5);
              }
            }
          }}
          className="group relative flex h-6 flex-1 cursor-pointer items-center touch-none select-none focus-visible:outline-none"
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-snow/15">
            <div
              className="h-full rounded-full bg-[#1951FC] transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1951FC] ring-2 ring-snow shadow-sm transition-transform group-hover:scale-125"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Timestamp */}
        <span className="shrink-0 text-xs font-medium tabular-nums text-snow/65 select-none font-ui">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Replay Button */}
        <button
          type="button"
          onClick={handleReplay}
          aria-label="Restart walkthrough video"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-ink transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] active:scale-95"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Subtle Scope Strip Below Controls */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
        {SCOPE_TAGS.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-snow/10 px-3 py-1 text-xs text-snow/60 select-none"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
