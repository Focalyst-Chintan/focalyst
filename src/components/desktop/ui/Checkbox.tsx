'use client';
import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  color?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
  color,
}: CheckboxProps) {
  const generatedId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <label
      htmlFor={generatedId}
      className={`inline-flex items-center gap-2.5 select-none cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <button
        type="button"
        role="checkbox"
        id={generatedId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
          checked
            ? color
              ? 'border-transparent text-snow'
              : 'bg-primary border-primary text-snow shadow-sm'
            : 'border-line-strong bg-surface hover:border-ink-3'
        }`}
        style={checked && color ? { backgroundColor: color, borderColor: color } : undefined}
      >
        {checked && <Check className="h-3.5 w-3.5 stroke-[2.75]" />}
      </button>
      {label && <span className="text-[14px] text-ink">{label}</span>}
    </label>
  );
}

export default Checkbox;
