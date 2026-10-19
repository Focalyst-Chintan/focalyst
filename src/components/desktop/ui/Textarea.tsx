'use client';
import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = '', id, rows = 3, ...props },
  ref
) {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={generatedId} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={generatedId}
        rows={rows}
        className={`w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 p-3.5 text-[14px] resize-y transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-danger focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--danger)]' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Textarea;
