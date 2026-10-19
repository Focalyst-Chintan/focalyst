'use client';
import { useLayoutEffect, useRef, useState } from 'react';

export type Opt<T extends string = string> = { value: T; label: string; count?: number };

export interface SegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (v: T) => void;
  options: Opt<T>[];
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string = string>({
  value,
  onChange,
  options,
  className = '',
}: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector<HTMLElement>(`[data-seg="${value}"]`);
      if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [value, options]);

  return (
    <div
      ref={ref}
      role="tablist"
      className={`relative inline-flex items-center gap-1 rounded-full border border-line bg-surface-2/70 p-1 ${className}`}
    >
      {thumb && (
        <span
          aria-hidden
          className="fx-active-pill absolute bottom-1 top-1 left-0 rounded-full transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-seg={o.value}
            onClick={() => onChange(o.value)}
            className={`relative z-10 h-8 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors duration-150 ${
              active ? 'text-ink' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {o.label}
            {o.count != null && <span className="ml-1.5 tabular-nums text-ink-3">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
