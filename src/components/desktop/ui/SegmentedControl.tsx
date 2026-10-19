'use client';
import React from 'react';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const itemPadding = size === 'sm' ? 'py-1 px-2.5 text-[12px]' : 'py-1.5 px-3.5 text-[13px]';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center bg-surface-2 p-1 rounded-full border border-line ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-200 cursor-pointer select-none focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${itemPadding} ${
              isActive
                ? 'bg-surface shadow-[var(--shadow-1)] text-ink font-semibold'
                : 'text-ink-2 hover:text-ink'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
