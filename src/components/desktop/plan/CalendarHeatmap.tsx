'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { localDateStr } from '@/lib/utils/date';
import { monthMatrix } from '@/components/desktop/ui/DatePicker';

export interface CalendarHeatmapProps {
  logs?: { completed_date: string; habit_id?: string }[];
  color?: string; // base habit color
  year?: number;
  onYearChange?: (year: number) => void;
  createdAt?: string; // ISO or YMD
  singleHabit?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function CalendarHeatmap({
  logs = [],
  color = '#1951FC',
  year = new Date().getFullYear(),
  onYearChange,
  createdAt,
  singleHabit = false,
  className = '',
}: CalendarHeatmapProps) {
  const todayStr = useMemo(() => localDateStr(new Date()), []);
  const createdYMD = useMemo(
    () => (createdAt ? createdAt.slice(0, 10) : '2000-01-01'),
    [createdAt]
  );

  // Group logs by date string
  const logsMap = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      if (l.completed_date) {
        map.set(l.completed_date, (map.get(l.completed_date) || 0) + 1);
      }
    });
    return map;
  }, [logs]);

  // Months matrix for 12 months in the year
  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const days = monthMatrix(year, monthIdx);
      return {
        monthName: MONTH_NAMES[monthIdx],
        monthIdx,
        days,
      };
    });
  }, [year]);

  return (
    <div className={`w-full flex flex-col gap-3 ${className}`}>
      {/* Year Switcher Header: ‹ 2026 › */}
      {onYearChange && (
        <div className="flex items-center justify-between text-[13px] text-ink font-semibold">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            className="p-1 rounded-[6px] hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="tabular-nums">‹ {year} ›</span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            className="p-1 rounded-[6px] hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors"
            aria-label="Next year"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Year at a glance: 12 mini months in a 3-column grid (gap 12). No scrollbars */}
      <div className="grid grid-cols-3 gap-3">
        {monthsData.map(({ monthName, monthIdx, days }) => (
          <div key={monthName} className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-3">{monthName}</span>
            <div className="grid grid-cols-7 gap-[2px]">
              {days.map((d, dIdx) => {
                const isCurrentMonth = d.getMonth() === monthIdx;
                if (!isCurrentMonth) {
                  return <div key={dIdx} className="h-2 w-2 rounded-[2px] bg-transparent" />;
                }

                const dYMD = localDateStr(d);
                const count = logsMap.get(dYMD) || 0;
                const isDone = count > 0;
                const isBeforeCreated = dYMD < createdYMD;
                const isFuture = dYMD > todayStr;

                let cellBg = 'bg-surface-2';
                let style: React.CSSProperties | undefined = undefined;

                if (isDone) {
                  cellBg = '';
                  style = { backgroundColor: color };
                } else if (isBeforeCreated || isFuture) {
                  cellBg = 'bg-surface-2';
                } else {
                  // Scheduled not done in past
                  cellBg = 'bg-surface-3';
                }

                const tooltip = `${d.toLocaleDateString('en-US', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })} · ${isDone ? 'Done' : 'Not done'}`;

                return (
                  <div
                    key={dIdx}
                    title={tooltip}
                    style={style}
                    className={`h-2 w-2 rounded-[2px] ${cellBg} transition-colors`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarHeatmap;
