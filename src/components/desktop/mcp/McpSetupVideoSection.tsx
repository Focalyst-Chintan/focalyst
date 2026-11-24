'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface Chapter {
  time: number;
  timestamp: string;
  title: string;
  description: string;
}

const CHAPTERS: Chapter[] = [
  {
    time: 11,
    timestamp: '0:11',
    title: 'Copy connector URL',
    description: 'Open Focalyst Settings -> AI connections.',
  },
  {
    time: 46,
    timestamp: '0:46',
    title: 'Add custom connector',
    description: 'Paste your URL inside Claude Connectors.',
  },
  {
    time: 69,
    timestamp: '1:09',
    title: 'Allow read-only tools',
    description: 'Set permissions to Always allow for instant lookups.',
  },
  {
    time: 80,
    timestamp: '1:20',
    title: 'Ask from any device',
    description: 'Check live tasks and habits in Claude web or mobile.',
  },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function McpSetupVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(95);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Sync state from native video events
  const onPlay = useCallback(() => setIsPlaying(true), []);
  const onPause = useCallback(() => setIsPlaying(false), []);
  const onEnded = useCallback(() => setIsPlaying(false), []);

  const onTimeUpdate = useCallback(() => {
    if (!isScrubbing && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [isScrubbing]);

  const onLoadedMetadata = useCallback(() => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
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
      // Tutorial has narration: unmute when user explicitly starts playback
      video.muted = false;
      setIsMuted(false);
      video.play().catch(() => {
        // Fallback to muted if browser blocks unmuted playback
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

  const seekToChapter = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
    video.muted = false;
    setIsMuted(false);
    video.play().catch(() => {
      video.muted = true;
      setIsMuted(true);
      video.play().catch(() => {});
    });
  }, []);

  // Scrubbing via click and drag on progress bar
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

  // Active chapter determination
  const currentChapterIndex = useMemo(() => {
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (currentTime >= CHAPTERS[i].time - 0.5) {
        return i;
      }
    }
    return -1;
  }, [currentTime]);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <section
      className="fx-reveal mx-auto mt-20 max-w-[920px] px-4 sm:px-6"
      style={{ ['--fx-delay' as string]: '40ms' }}
      aria-labelledby="walkthrough-heading"
    >
      {/* Section Header */}
      <div className="text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          SETUP WALKTHROUGH · 95 SECONDS
        </span>
        <h2
          id="walkthrough-heading"
          className="mt-3 font-display text-[28px] leading-[34px] text-ink sm:text-[36px] sm:leading-[42px]"
        >
          Connect Focalyst to Claude in under two minutes.
        </h2>
        <p className="mx-auto mt-3 max-w-[680px] text-[15px] leading-[26px] text-ink-2 sm:text-[16px]">
          Copy your personal connector URL from Settings, paste it into Claude as a custom connector, and query your live tasks and habits across desktop and mobile.
        </p>
      </div>

      {/* 16:9 Widescreen Video Frame */}
      <div className="relative mt-8 sm:mt-10 aspect-video w-full overflow-hidden rounded-[24px] sm:rounded-[28px] border border-line-strong bg-snow shadow-glass">
        <video
          ref={videoRef}
          src="/mcp/mcp-claude-setup.mp4#t=0.5"
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
          aria-label="Walkthrough video demonstrating connecting Focalyst MCP to Claude"
        />

        {/* Centered Glass Play Button Overlay */}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play walkthrough video"
            className="pointer-events-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full glass-strong liquid border border-snow/50 text-ink shadow-glass transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
          >
            <Play className="h-6 w-6 sm:h-8 sm:w-8 translate-x-0.5 fill-current text-ink" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Minimal Custom Control Bar & Chapter Jump Pills */}
      <div className="frost mt-3 sm:mt-4 rounded-[20px] p-3.5 sm:p-4">
        {/* Play/Pause, Progress Bar, Time, Mute Toggle */}
        <div className="flex items-center gap-3">
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

          {/* Scrubbable Progress Bar */}
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
            className="group relative flex h-7 flex-1 cursor-pointer items-center touch-none select-none focus-visible:outline-none"
          >
            {/* Background Track */}
            <div className="relative h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-surface-3">
              {/* Progress Fill */}
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Chapter Tick Marks */}
            {CHAPTERS.map((ch) => {
              const tickLeft = duration > 0 ? (ch.time / duration) * 100 : 0;
              return (
                <span
                  key={ch.time}
                  aria-hidden="true"
                  title={`${ch.timestamp} · ${ch.title}`}
                  className="pointer-events-none absolute top-1/2 h-2.5 sm:h-3 w-0.5 -translate-y-1/2 rounded-full bg-ink-3/50"
                  style={{ left: `${tickLeft}%` }}
                />
              );
            })}

            {/* Scrub Thumb */}
            <span
              className="pointer-events-none absolute top-1/2 h-3 sm:h-3.5 w-3 sm:w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-snow shadow-1 transition-transform group-hover:scale-125"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Time Display */}
          <span className="shrink-0 font-ui text-[12px] sm:text-[13px] font-medium tabular-nums text-ink-2 select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Mute/Unmute Toggle */}
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
        </div>

        {/* 4 Clickable Chapter Pills */}
        <div className="mt-3.5 pt-3.5 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {CHAPTERS.map((ch, idx) => {
            const isCurrent = currentChapterIndex === idx;
            return (
              <button
                key={ch.time}
                type="button"
                onClick={() => seekToChapter(ch.time)}
                className={`group flex items-start gap-2.5 rounded-[14px] border p-2.5 text-left transition-all ${
                  isCurrent
                    ? 'border-primary/50 bg-primary-soft/40 shadow-sm'
                    : 'border-line bg-surface-2/40 hover:bg-surface-2 hover:border-line-strong'
                } focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] active:scale-[0.99]`}
              >
                <span
                  className={`inline-flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-colors ${
                    isCurrent
                      ? 'bg-primary text-snow'
                      : 'bg-surface-2 text-primary-text group-hover:bg-primary-soft'
                  }`}
                >
                  {ch.timestamp}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink leading-tight">
                    {ch.title}
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-2 leading-snug">
                    {ch.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
