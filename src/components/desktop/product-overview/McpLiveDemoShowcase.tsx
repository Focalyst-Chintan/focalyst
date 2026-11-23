'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { MCP_DEMO_VIDEO } from './mediaManifest';

interface McpChapter {
  id: string;
  timestamp: string;
  seconds: number;
  title: string;
  description: string;
}

const MCP_CHAPTERS: McpChapter[] = [
  {
    id: 'daily-briefing',
    timestamp: '0:00',
    seconds: 0,
    title: 'Daily Briefing',
    description:
      "Queries today's completed habits (11-day streaks), 27m logged focus, open tasks, and 30-day countdown.",
  },
  {
    id: 'weekly-focus-audit',
    timestamp: '0:38',
    seconds: 38,
    title: 'Weekly Focus Audit',
    description:
      'Pulls weekly focus stats (4.9h across 3 days, Saturday peak, and 7 to 9 PM sweet spot).',
  },
  {
    id: 'actionable-coaching',
    timestamp: '1:08',
    seconds: 68,
    title: 'Actionable Coaching',
    description:
      'Synthesizes 6 tailored recommendations and offers to schedule a daily focus habit and dated tasks.',
  },
];

function formatTime(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function McpLiveDemoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(MCP_DEMO_VIDEO.initialRestTime);
  const [duration, setDuration] = useState<number>(MCP_DEMO_VIDEO.durationSeconds);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      if (!hasStarted && video.currentTime < 1) {
        video.currentTime = MCP_DEMO_VIDEO.initialRestTime;
        setCurrentTime(MCP_DEMO_VIDEO.initialRestTime);
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
  }, [hasStarted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (!hasStarted) {
        video.currentTime = 0;
        setCurrentTime(0);
        setHasStarted(true);
      }
      void video.play();
    } else {
      video.pause();
    }
  };

  const replayFromStart = () => {
    const video = videoRef.current;
    if (!video) return;
    setHasStarted(true);
    video.currentTime = 0;
    setCurrentTime(0);
    void video.play();
  };

  const seekToChapter = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    setHasStarted(true);
    video.currentTime = seconds;
    setCurrentTime(seconds);
    void video.play();
  };

  const activeChapterIndex = !hasStarted
    ? 0
    : MCP_CHAPTERS.reduce((acc, chapter, idx) => {
        return currentTime >= chapter.seconds ? idx : acc;
      }, 0);

  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="frost rounded-[28px] p-6 sm:p-10">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Vertical Phone Video Frame */}
        <div className="flex flex-col items-center lg:col-span-5">
          <div className="aspect-[9/19.5] w-[260px] overflow-hidden rounded-[40px] border border-line-strong bg-surface shadow-[var(--shadow-glass)] sm:w-[290px]">
            <video
              ref={videoRef}
              src={`${MCP_DEMO_VIDEO.src}#t=${MCP_DEMO_VIDEO.initialRestTime}`}
              title={MCP_DEMO_VIDEO.title}
              playsInline
              muted
              loop
              preload="metadata"
              onClick={togglePlay}
              className="h-full w-full cursor-pointer object-cover"
            />
          </div>

          {/* Minimal Custom Playback Controls */}
          <div className="mt-5 w-full max-w-[290px] space-y-2.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause Claude MCP demo' : 'Play Claude MCP demo'}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[12px] font-medium text-snow transition-colors hover:bg-primary-hover cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
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
                  aria-label="Replay Claude MCP demo"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <span className="tabular-nums text-[12px] font-medium text-ink-3">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Grounded Tool Breakdown & Interactive Chapter Jump Pills */}
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary-text">
              LIVE MCP INTEGRATION · CLAUDE
            </p>
            <h3 className="font-display text-[32px] leading-[38px] tracking-[-0.015em] text-ink sm:text-[38px] sm:leading-[44px]">
              Your real Focalyst workspace, inside Claude.
            </h3>
            <p className="max-w-[56ch] text-[15px] leading-[24px] text-ink-2">
              In this live recording, Claude connects to Focalyst MCP and invokes{' '}
              <span className="font-medium text-ink">Today in Focalyst</span>,{' '}
              <span className="font-medium text-ink">Listing Focalyst MCP tasks</span>, and{' '}
              <span className="font-medium text-ink">Focus stats</span> to answer questions using
              real user activity.
            </p>
          </div>

          <div className="space-y-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Jump to chapter
            </p>
            <div className="space-y-2.5">
              {MCP_CHAPTERS.map((chapter, idx) => {
                const isActive = idx === activeChapterIndex;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => seekToChapter(chapter.seconds)}
                    className={`flex w-full items-start gap-3.5 rounded-[16px] border px-4 py-3 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                      isActive
                        ? 'border-line-strong bg-surface shadow-[var(--shadow-1)]'
                        : 'border-line bg-surface-2/60 hover:bg-surface-2'
                    }`}
                  >
                    <span
                      className={`mt-0.5 tabular-nums text-[12px] font-semibold ${
                        isActive ? 'text-primary-text' : 'text-ink-3'
                      }`}
                    >
                      {chapter.timestamp}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-[14px] font-semibold leading-[20px] text-ink">
                        {chapter.title}
                      </p>
                      <p className="text-[13px] leading-[20px] text-ink-2">
                        {chapter.description}
                      </p>
                    </div>
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
