'use client';

import React from 'react';

export function FocusOrb({
  progress,
  size,
  children,
  isRunning = false,
}: {
  progress: number;
  size: string | number;
  children?: React.ReactNode;
  isRunning?: boolean;
}) {
  const p = Math.max(0, Math.min(1, progress)); // fraction of time REMAINING
  const deg = p * 360;
  const sector = `conic-gradient(from 0deg, #000 0deg ${deg}deg, transparent ${deg}deg 360deg)`;

  return (
    <div
      className={`relative grid place-items-center ${isRunning ? 'animate-[fx-orb-pulse_4s_ease-in-out_infinite]' : ''}`}
      style={{ width: size, height: size }}
    >
      {/* constant core so the digits always sit on deep blue */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle closest-side, #03195B 0%, #0B2CB1 28%, rgba(25,81,252,0.55) 50%, rgba(55,129,252,0.18) 66%, transparent 78%)',
          filter: 'blur(6px)',
        }}
      />
      {/* remaining-time wedge: blur on the wrapper softens the wedge edges */}
      <div aria-hidden className="absolute inset-0" style={{ filter: 'blur(18px)' }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle closest-side, #0B2CB1 0%, #1951FC 38%, #3781FC 62%, rgba(203,233,253,0.85) 82%, transparent 100%)',
            WebkitMaskImage: sector,
            maskImage: sector,
          }}
        />
      </div>
      {/* gentle breathing glow and time display */}
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}

export default FocusOrb;
