'use client';
import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, leftIcon, rightIcon, className = '', id, ...props },
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
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span className="absolute left-3.5 flex items-center text-ink-3 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={generatedId}
          className={`h-11 w-full rounded-[14px] bg-surface-2 border border-line text-ink placeholder:text-ink-3 text-[14px] transition-colors focus:border-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : 'px-3.5'
          } ${rightIcon ? 'pr-10' : 'px-3.5'} ${
            error ? 'border-danger focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--danger)]' : ''
          } ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 flex items-center text-ink-3">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
