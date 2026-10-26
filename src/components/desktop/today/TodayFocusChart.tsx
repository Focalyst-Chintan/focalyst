'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

export interface TodayFocusChartProps {
  data: Array<{ day: string; focus: number; break: number }>;
}

export default function TodayFocusChart({ data }: TodayFocusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fxFocusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3781FC" />
            <stop offset="100%" stopColor="#1951FC" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'var(--ink-3)' }}
          unit="h"
        />
        <RechartsTooltip
          cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="rounded-[12px] glass-strong px-3 py-2 text-[12px] text-ink shadow-md">
                  <span className="font-semibold block">{item.day}</span>
                  <span className="text-primary-text block">{item.focus}h focus</span>
                  {item.break > 0 && (
                    <span className="text-ink-3 block">{item.break}h break</span>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="focus"
          fill="url(#fxFocusGrad)"
          barSize={28}
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
