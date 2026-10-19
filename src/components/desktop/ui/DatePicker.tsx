'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover } from '@/components/desktop/ui/Popover';
import { localDateStr, parseYMDToLocalNoon } from '@/lib/utils/date';

export function monthMatrix(year: number, month: number) {
  // Monday-first, 6 weeks (42 days)
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const initialDate = value ? parseYMDToLocalNoon(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    if (value) {
      const d = parseYMDToLocalNoon(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const today = new Date();
  const todayYMD = localDateStr(today);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const days = monthMatrix(viewYear, viewMonth);

  const formattedLabel = value
    ? parseYMDToLocalNoon(value).toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : placeholder;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={`h-10 px-3 rounded-[12px] bg-surface-2 border border-line text-left text-[13px] flex items-center justify-between gap-2 transition-colors hover:border-line-strong focus:border-primary outline-none ${
            value ? 'text-ink' : 'text-ink-3'
          } ${className}`}
        >
          <span className="truncate">{formattedLabel}</span>
          <Calendar size={16} className="text-ink-3 shrink-0" />
        </button>
      }
    >
      <div className="w-[300px] p-3 rounded-[20px] glass-strong flex flex-col gap-2">
        {/* Header month title + Chevrons */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-[15px] font-semibold text-ink">
            {new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="h-7 w-7 rounded-[8px] flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="h-7 w-7 rounded-[8px] flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday row Mon..Sun */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((wd) => (
            <span key={wd} className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
              {wd}
            </span>
          ))}
        </div>

        {/* 6x7 grid of 36px cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, idx) => {
            const dYMD = localDateStr(d);
            const isSelected = value === dYMD;
            const isToday = dYMD === todayYMD;
            const isCurrentMonth = d.getMonth() === viewMonth;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange?.(dYMD);
                  setOpen(false);
                }}
                className={`h-9 w-9 rounded-[10px] text-[13px] font-medium flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-primary text-snow font-semibold'
                    : isToday
                    ? 'ring-1 ring-primary text-ink hover:bg-surface-2'
                    : isCurrentMonth
                    ? 'text-ink hover:bg-surface-2'
                    : 'text-ink-3/50 hover:bg-surface-2'
                }`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>

        {/* Footer: ghost Today and Clear */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button
            type="button"
            onClick={() => {
              onChange?.(todayYMD);
              setOpen(false);
            }}
            className="text-[12px] font-medium text-primary-text hover:underline px-1"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              setOpen(false);
            }}
            className="text-[12px] font-medium text-ink-3 hover:text-ink px-1"
          >
            Clear
          </button>
        </div>
      </div>
    </Popover>
  );
}
