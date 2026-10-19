'use client';
import React, { useRef, useState, useLayoutEffect } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el) {
      setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    } else {
      setThumb(null);
    }
  }, [value, options]);

  const itemPadding = size === 'sm' ? 'py-1 px-2.5 text-[12px]' : 'py-1.5 px-3.5 text-[13px]';

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`relative inline-flex items-center bg-surface-2 p-1 rounded-full border border-line ${className}`}
    >
      {/* Sliding .fx-active-pill thumb */}
      {thumb && (
        <span
          aria-hidden
          className="fx-active-pill absolute top-1 bottom-1 rounded-full transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
          style={{
            transform: `translateX(${thumb.left - 4}px)`,
            width: thumb.width,
          }}
        />
      )}

      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            data-active={isActive ? 'true' : 'false'}
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${itemPadding} ${
              isActive ? 'text-ink font-semibold' : 'text-ink-2 hover:text-ink'
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
