'use client';

export function FocusRing({
  progress,
  size,
  isBreak,
  children,
}: {
  progress: number;
  size: string;
  isBreak?: boolean;
  children?: React.ReactNode;
}) {
  const V = 400,
    stroke = 10,
    r = (V - stroke) / 2,
    c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress)); // fraction ELAPSED: fills clockwise from 12 o'clock
  return (
    <div className="relative grid aspect-square place-items-center" style={{ width: size }}>
      <svg viewBox={`0 0 ${V} ${V}`} className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="fx-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isBreak ? '#CBE9FD' : '#6FA4FF'} />
            <stop offset="100%" stopColor={isBreak ? '#6FA4FF' : '#1951FC'} />
          </linearGradient>
        </defs>
        <circle cx={V / 2} cy={V / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        {p > 0 && (
          <circle
            cx={V / 2}
            cy={V / 2}
            r={r}
            fill="none"
            stroke="url(#fx-ring-grad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            style={{
              transition: 'stroke-dashoffset 1s linear',
              filter: 'drop-shadow(0 0 6px rgba(55,129,252,0.55))',
            }}
          />
        )}
      </svg>
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
