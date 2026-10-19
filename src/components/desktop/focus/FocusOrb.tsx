'use client';
import React from 'react';

export function FocusOrb({
  progress,
  size,
  running,
  children,
}: {
  progress: number;
  size: string | number;
  running?: boolean;
  children?: React.ReactNode;
}) {
  const deg = Math.max(0, Math.min(1, progress)) * 360; // fraction REMAINING; idle = 1
  const wedge = `conic-gradient(from 0deg, #000 0deg, #000 ${deg}deg, transparent ${Math.min(deg + 0.6, 360)}deg)`;
  const fall =
    'radial-gradient(circle closest-side, #0B2CB1 0%, #1951FC 34%, #3781FC 58%, rgba(111,164,255,0.55) 76%, rgba(203,233,253,0.22) 90%, transparent 100%)';

  return (
    <div
      className={`relative grid place-items-center ${running ? 'fx-orb-breathe' : ''}`}
      style={{ width: size, height: size }}
    >
      {/* faint full disc so the circle reads even when little time remains */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full opacity-[0.10]"
        style={{ background: fall }}
      />
      {/* remaining-time wedge: crisp straight edges, soft outer fade */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{ background: fall, WebkitMaskImage: wedge, maskImage: wedge }}
      />
      {/* deep blue core: digits always sit on deep blue */}
      <div
        aria-hidden
        className="absolute inset-[20%] rounded-full"
        style={{
          background:
            'radial-gradient(circle closest-side, rgba(3,25,91,0.95) 0%, rgba(11,44,177,0.75) 45%, rgba(11,44,177,0) 100%)',
        }}
      />
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}

export default FocusOrb;
