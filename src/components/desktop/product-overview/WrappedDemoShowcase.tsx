'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { WRAPPED_DEMO_VIDEO } from './mediaManifest';

interface WrappedChapter {
  id: string;
  timestamp: string;
  seconds: number;
  title: string;
  detail: string;
}

const WRAPPED_CHAPTERS: WrappedChapter[] = [
  {
    id: 'receipts',
    timestamp: '0:02',
    seconds: 2,
    title: 'Annual Receipts',
    detail: 'Cover & Top 1% standing',
  },
  {
    id: 'deep-work',
    timestamp: '0:08',
    seconds: 8,
    title: 'Deep Work',
    detail: '190h 20m across 286 sessions',
  },
  {
    id: 'execution',
    timestamp: '0:12',
    seconds: 12,
    title: 'Execution',
    detail: '418 commitments closed',
  },
  {
    id: 'consistency',
    timestamp: '0:14',
    seconds: 14,
    title: 'Consistency',
    detail: '46d unbroken streak',
  },
  {
    id: 'voice-ai',
    timestamp: '0:17',
    seconds: 17,
    title: 'Voice & AI',
    detail: '18,450 words dictated',
  },
  {
    id: 'focus-shield',
    timestamp: '0:20',
    seconds: 20,
    title: 'Focus Shield',
    detail: '193 distractions deflected',
  },
  {
    id: 'archetype',
    timestamp: '0:24',
    seconds: 24,
    title: 'Archetype Poster',
    detail: 'Deep Work Monolith',
  },
];

function formatTime(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function WrappedDemoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(WRAPPED_DEMO_VIDEO.initialRestTime);
  const [duration, setDuration] = useState<number>(WRAPPED_DEMO_VIDEO.durationSeconds);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      if (video.currentTime < 0.5) {
        video.currentTime = WRAPPED_DEMO_VIDEO.initialRestTime;
        setCurrentTime(WRAPPED_DEMO_VIDEO.initialRestTime);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const replayFromStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 2;
    setCurrentTime(2);
    void video.play();
  };

  const seekToChapter = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    setCurrentTime(seconds);
    void video.play();
  };

  const activeChapterIndex = WRAPPED_CHAPTERS.reduce((acc, chapter, idx) => {
    return currentTime >= chapter.seconds ? idx : acc;
  }, 0);

  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-snow/15 p-6 text-snow shadow-[var(--shadow-glass)] sm:p-10"
      style={{
        background:
          'radial-gradient(120% 100% at 85% 15%, #1951FC 0%, #0B2CB1 48%, #03195B 100%)',
      }}
    >
      <div className="ambient-grain pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Vertical Phone Video Stage */}
        <div className="flex flex-col items-center lg:col-span-5">
          <div className="aspect-[9/19.5] w-[260px] overflow-hidden rounded-[40px] border border-snow/20 bg-surface shadow-[var(--shadow-glass)] sm:w-[290px]">
            <video
              ref={videoRef}
              src={`${WRAPPED_DEMO_VIDEO.src}#t=${WRAPPED_DEMO_VIDEO.initialRestTime}`}
              title={WRAPPED_DEMO_VIDEO.title}
              playsInline
              muted
              loop
              preload="metadata"
              onClick={togglePlay}
              className="h-full w-full cursor-pointer object-cover"
            />
          </div>

          {/* Custom Apple-grade Playback Controls */}
          <div className="mt-5 w-full max-w-[290px] space-y-2.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-snow/20">
              <div
                className="h-full rounded-full bg-snow transition-[width] duration-150 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause Wrapped preview' : 'Play Wrapped preview'}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-snow/25 bg-snow/15 px-3.5 text-[12px] font-medium text-snow transition-colors hover:bg-snow/25 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-snow/80"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={replayFromStart}
                  aria-label="Replay Wrapped preview"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-snow/20 bg-snow/10 text-snow/85 transition-colors hover:bg-snow/20 hover:text-snow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-snow/80"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <span className="tabular-nums text-[12px] font-medium text-snow/75">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Narrative & Interactive Chapter Index */}
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-snow/20 bg-snow/10 px-2.5 text-[12px] font-medium text-snow">
                Planned · 2026
              </span>
              <span className="text-[12px] font-medium text-snow/75">
                Releases Dec 31, 2026
              </span>
            </div>

            <h3 className="font-display text-[32px] leading-[38px] tracking-[-0.015em] text-snow sm:text-[40px] sm:leading-[46px]">
              Focalyst Wrapped: your entire year in receipts.
            </h3>

            <p className="max-w-[56ch] text-[15px] leading-[24px] text-snow/85">
              Focalyst Wrapped turns a full year of deep work hours, closed tasks, unbroken habit
              streaks, voice notes, and deflected distractions into a private, tactile year-end
              story and shareable archetype card (Deep Work Monolith). The walkthrough shows the
              in-app SAMPLE preview badge used for editorial review.
            </p>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-snow/70">
              Jump to chapter
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {WRAPPED_CHAPTERS.map((chapter, idx) => {
                const isActive = idx === activeChapterIndex;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => seekToChapter(chapter.seconds)}
                    className={`flex items-start gap-3 rounded-[14px] border px-3.5 py-2.5 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-snow/80 ${
                      isActive
                        ? 'border-snow/40 bg-snow/20 text-snow'
                        : 'border-snow/15 bg-snow/10 text-snow/85 hover:bg-snow/15 hover:text-snow'
                    }`}
                  >
                    <span className="mt-0.5 tabular-nums text-[12px] font-semibold text-snow/75">
                      {chapter.timestamp}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-[18px] text-snow">
                        {chapter.title}
                      </span>
                      <span className="block truncate text-[12px] leading-[17px] text-snow/75">
                        {chapter.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
