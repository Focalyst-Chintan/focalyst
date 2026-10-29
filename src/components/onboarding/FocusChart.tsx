'use client';
// Screen 24 chart: the 12 planned weeks (6.2). Loaded with next/dynamic (ssr: false), so recharts stays out of the first load.
import { useId } from 'react';
import { Area, AreaChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNumber } from './copy';

interface Point { week: number; hours: number }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: Point }> }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="glass-strong rounded-[10px] px-3 py-2 text-[12px] font-medium text-ink tabular-nums">
      Week {p.week} · {formatNumber(p.hours)} h
    </div>
  );
}

export default function FocusChart({ weekly, weekLabel, animate }: { weekly: number[]; weekLabel: string; animate: boolean }) {
  const gid = `ob-area-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const data: Point[] = weekly.map((hours, i) => ({ week: i + 1, hours }));
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 32, right: 16, bottom: 0, left: 16 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week"
            type="number"
            domain={[1, 12]}
            ticks={[1, 4, 7, 10]}
            interval={0}
            tickFormatter={(w: number) => `Wk ${w}`}
            axisLine={{ stroke: 'var(--line)' }}
            tickLine={false}
            tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--line)' }} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="var(--primary)"
            strokeWidth={2}
            fill={`url(#${gid})`}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={animate}
            animationDuration={450}
          />
          <ReferenceDot
            x={6}
            y={weekly[5]}
            r={4}
            fill="var(--primary)"
            stroke="var(--surface)"
            strokeWidth={2}
            label={{ value: weekLabel, position: 'top', offset: 10, fill: 'var(--ink-2)', fontSize: 12 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
