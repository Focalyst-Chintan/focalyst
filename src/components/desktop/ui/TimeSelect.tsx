'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Popover } from '@/components/desktop/ui/Popover';

export interface TimeSelectProps {
  value?: string; // "HH:MM" 24h
  onChange?: (val: string) => void;
  className?: string;
  disabled?: boolean;
}

// Generate 15-minute time steps for 24h: 00:00 to 23:45
const TIME_STEPS: { value: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const val = `${hh}:${mm}`;

    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const label = `${String(hour12).padStart(2, '0')}:${mm} ${ampm}`;
    TIME_STEPS.push({ value: val, label });
  }
}

function formatTimeTo12h(time24?: string): string {
  if (!time24) return '12:00 PM';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return time24;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${String(hour12).padStart(2, '0')}:${m} ${ampm}`;
}

export function TimeSelect({
  value = '09:00',
  onChange,
  className = '',
  disabled = false,
}: TimeSelectProps) {
  const [open, setOpen] = useState(false);
  const [typedInput, setTypedInput] = useState(formatTimeTo12h(value));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTypedInput(formatTimeTo12h(value));
  }, [value]);

  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        (activeEl as HTMLElement).scrollIntoView({ block: 'center' });
      }
    }
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedInput(e.target.value);
  };

  const handleInputBlur = () => {
    // Attempt parse typed input like "7:30", "14:00", "7:30 PM", "9am"
    const text = typedInput.trim().toLowerCase();
    const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3];

      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;

      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        onChange?.(val);
        setTypedInput(formatTimeTo12h(val));
        return;
      }
    }
    // Fallback if invalid
    setTypedInput(formatTimeTo12h(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      setOpen(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      trigger={
        <div
          className={`h-10 px-3 rounded-[12px] bg-surface-2 border border-line text-[13px] flex items-center justify-between gap-2 hover:border-line-strong focus-within:border-primary transition-colors ${className}`}
        >
          <input
            type="text"
            disabled={disabled}
            value={typedInput}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-ink outline-none w-24 tabular-nums text-[13px]"
          />
          <Clock size={16} className="text-ink-3 shrink-0 cursor-pointer" />
        </div>
      }
    >
      <div
        ref={listRef}
        className="w-36 max-h-[240px] overflow-y-auto p-1 rounded-[14px] glass-strong flex flex-col gap-0.5"
      >
        {TIME_STEPS.map((step) => {
          const isSelected = value === step.value;
          return (
            <button
              key={step.value}
              type="button"
              data-selected={isSelected ? 'true' : 'false'}
              onClick={() => {
                onChange?.(step.value);
                setTypedInput(step.label);
                setOpen(false);
              }}
              className={`h-8 px-2.5 rounded-[8px] text-[12px] tabular-nums font-medium text-left flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-primary text-snow font-semibold'
                  : 'text-ink hover:bg-surface-2'
              }`}
            >
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
