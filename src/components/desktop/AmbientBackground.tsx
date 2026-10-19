'use client';
import { useEffect, useState } from 'react';

export default function AmbientBackground({
  strong = false,
  className = 'fixed inset-0 z-0 overflow-hidden bg-canvas',
}: {
  strong?: boolean;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  const o = strong ? 1.4 : 1;

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const playState = paused ? 'paused' : 'running';

  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <div
        className="ambient-blob"
        style={{
          background: 'var(--blob-1)',
          width: '60vw',
          height: '60vw',
          top: '-22vw',
          left: '-12vw',
          opacity: `calc(var(--blob-opacity) * ${o})`,
          animationPlayState: playState,
        }}
      />
      <div
        className="ambient-blob"
        style={{
          background: 'var(--blob-2)',
          width: '45vw',
          height: '45vw',
          bottom: '-18vw',
          right: '-8vw',
          animationDelay: '-12s',
          opacity: `calc(var(--blob-opacity) * ${o})`,
          animationPlayState: playState,
        }}
      />
      <div
        className="ambient-blob"
        style={{
          background: 'var(--blob-3)',
          width: '30vw',
          height: '30vw',
          top: '35%',
          left: '45%',
          animationDelay: '-24s',
          opacity: `calc(var(--blob-opacity) * ${o * 0.6})`,
          animationPlayState: playState,
        }}
      />
      <div className="ambient-grain" />
    </div>
  );
}
