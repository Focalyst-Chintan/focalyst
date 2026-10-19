'use client';
import React from 'react';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count?: number;
  level?: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapProps {
  data?: Record<string, number | boolean>; // date -> count or completed
  weeks?: number; // default 20 or 52
  color?: string; // base habit color, e.g. #1951FC
  className?: string;
  onDayClick?: (date: string) => void;
}

export function Heatmap({
  data = {},
  weeks = 20,
  color = '#1951FC',
  className = '',
  onDayClick,
}: HeatmapProps) {
  // Generate the last N weeks ending today
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + distanceToSunday);

  const totalDays = weeks * 7;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - totalDays + 1);

  // Group days into columns of 7 (Mon to Sun)
  const columns: { dateStr: string; date: Date }[][] = [];
  let currentWeek: { dateStr: string; date: Date }[] = [];

  const cur = new Date(startDate);
  for (let i = 0; i < totalDays; i++) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    currentWeek.push({ dateStr, date: new Date(cur) });
    if (currentWeek.length === 7) {
      columns.push(currentWeek);
      currentWeek = [];
    }
    cur.setDate(cur.getDate() + 1);
  }

  const getDayStyle = (dateStr: string) => {
    const val = data[dateStr];
    if (!val) {
      return { backgroundColor: 'var(--surface-2)', border: '1px solid var(--line)' };
    }
    if (typeof val === 'boolean') {
      return { backgroundColor: color, border: `1px solid ${color}` };
    }
    // numeric count
    const opacity = Math.min(Math.max(val * 0.25, 0.2), 1);
    return {
      backgroundColor: color,
      opacity,
      border: `1px solid ${color}`,
    };
  };

  return (
    <div className={`overflow-x-auto pb-2 ${className}`}>
      <div className="inline-flex gap-[3px]">
        {columns.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-[3px]">
            {week.map(({ dateStr }) => (
              <button
                key={dateStr}
                type="button"
                title={dateStr}
                onClick={() => onDayClick?.(dateStr)}
                style={getDayStyle(dateStr)}
                className="h-[11px] w-[11px] rounded-[3px] transition-transform duration-100 hover:scale-125 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ring)] cursor-pointer"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Heatmap;
