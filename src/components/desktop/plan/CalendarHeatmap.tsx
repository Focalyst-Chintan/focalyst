'use client';

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { localDateStr } from '@/lib/utils/date';

export interface CalendarHeatmapProps {
  logs?: { completed_date: string; habit_id?: string }[];
  color?: string; // base habit color
  year?: number;
  onYearChange?: (year: number) => void;
  createdAt?: string; // ISO or YMD
  singleHabit?: boolean;
  className?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const createdYMD = useMemo(() => (createdAt ? createdAt.slice(0, 10) : '2000-01-01'), [createdAt]);

  // Log counts by date string
  const logsMap = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((l) => {
      if (l.completed_date) {
        map.set(l.completed_date, (map.get(l.completed_date) || 0) + 1);
      }
    });
    return map;
  }, [logs]);

  // Calendar bounds: Monday on or before Jan 1 of year, through Sunday on or after Dec 31
  const { weeks, monthLabels } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const dayOfJan1 = jan1.getDay(); // 0 is Sun, 1 is Mon...
    const mondayOffset = dayOfJan1 === 0 ? -6 : 1 - dayOfJan1;
    const startDate = new Date(year, 0, 1 + mondayOffset);

    const dec31 = new Date(year, 11, 31);
    const dayOfDec31 = dec31.getDay();
    const sundayOffset = dayOfDec31 === 0 ? 0 : 7 - dayOfDec31;
    const endDate = new Date(year, 11, 31 + sundayOffset);

    const weeksList: {
      dateStr: string;
      date: Date;
      count: number;
      isBeforeCreated: boolean;
      isAfterToday: boolean;
      dayOfWeek: number;
    }[][] = [];

    const mLabels: { col: number; label: string; key: string }[] = [];
    const seenMonths = new Set<number>();

    let cur = new Date(startDate);
    let colIndex = 0;

    while (cur <= endDate) {
      const daysInWeek: any[] = [];
      let weekContainsFirstOfMonth: number | null = null;

      for (let d = 0; d < 7; d++) {
        const dStr = localDateStr(cur);
        const count = logsMap.get(dStr) || 0;
        const isBeforeCreated = dStr < createdYMD;
        const isAfterToday = dStr > todayStr;

        if (cur.getDate() === 1 && cur.getFullYear() === year) {
          weekContainsFirstOfMonth = cur.getMonth();
        }

        daysInWeek.push({
          dateStr: dStr,
          date: new Date(cur),
          count,
          isBeforeCreated,
          isAfterToday,
          dayOfWeek: d,
        });

        cur.setDate(cur.getDate() + 1);
      }

      // Check month label
      if (weekContainsFirstOfMonth !== null && !seenMonths.has(weekContainsFirstOfMonth)) {
        // Skip if fewer than 3 columns after previous
        const lastCol = mLabels.length > 0 ? mLabels[mLabels.length - 1].col : -99;
        if (colIndex - lastCol >= 3 || mLabels.length === 0) {
          seenMonths.add(weekContainsFirstOfMonth);
          mLabels.push({
            col: colIndex,
            label: MONTH_NAMES[weekContainsFirstOfMonth],
            key: `${year}-${weekContainsFirstOfMonth}-${colIndex}`,
          });
        }
      }

      weeksList.push(daysInWeek);
      colIndex++;
    }

    return { weeks: weeksList, monthLabels: mLabels };
  }, [year, logsMap, createdYMD, todayStr]);

  const totalCols = weeks.length;

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Year Switcher Header */}
      {onYearChange && (
        <div className="flex items-center justify-between text-[13px] text-ink font-semibold mb-1">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            className="p-1 rounded-[6px] hover:bg-surface-2 text-ink-3 hover:text-ink transition-colors"
            aria-label="Previous year"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="tabular-nums">{year}</span>
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

      {/* Heatmap Grid */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {/* Weekday labels */}
          <div
            className="grid w-8 shrink-0 gap-[3px] pt-5 text-[11px] leading-[11px] text-ink-3"
            style={{ gridTemplateRows: 'repeat(7, 11px)' }}
          >
            <span className="row-start-1">Mon</span>
            <span className="row-start-3">Wed</span>
            <span className="row-start-5">Fri</span>
          </div>

          <div>
            {/* Month labels row */}
            <div className="relative h-5">
              {monthLabels.map((m) => (
                <span
                  key={m.key}
                  className="absolute top-0 whitespace-nowrap text-[11px] text-ink-3"
                  style={{ left: m.col * 14 }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Cells grid */}
            <div
              className="grid grid-flow-col gap-[3px]"
              style={{
                gridTemplateRows: 'repeat(7, 11px)',
                gridTemplateColumns: `repeat(${totalCols}, 11px)`,
              }}
            >
              {weeks.map((week) =>
                week.map((day) => {
                  const dateObj = day.date;
                  const dateFormatted = dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });

                  let bg = 'var(--surface-2)';
                  let opacity = 1;
                  const isDone = day.count > 0 && !day.isBeforeCreated && !day.isAfterToday;

                  if (isDone) {
                    if (singleHabit) {
                      bg = color;
                      opacity = 1;
                    } else {
                      bg = color;
                      opacity = day.count >= 4 ? 1 : day.count === 3 ? 0.7 : day.count === 2 ? 0.4 : 0.15;
                    }
                  }

                  const tooltipText = isDone
                    ? `${dateFormatted} · Done`
                    : day.isAfterToday
                    ? `${dateFormatted}`
                    : `${dateFormatted} · Not done`;

                  return (
                    <div
                      key={day.dateStr}
                      title={tooltipText}
                      className="h-[11px] w-[11px] rounded-[3px] transition-colors"
                      style={{
                        backgroundColor: bg,
                        opacity,
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
