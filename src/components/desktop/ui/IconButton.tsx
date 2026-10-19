'use client';
import React, { forwardRef } from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'ghost' | 'secondary' | 'glass' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    variant = 'ghost',
    size = 'md',
    pill = false,
    children,
    className = '',
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-10 w-10 text-base',
  }[size];

  const variantClasses = {
    ghost: 'bg-transparent text-ink hover:bg-surface-2',
    secondary: 'bg-surface border border-line-strong text-ink hover:bg-surface-2 shadow-[var(--shadow-1)]',
    glass: 'glass liquid text-snow hover:opacity-95',
    primary: 'bg-primary text-snow hover:bg-primary-hover',
  }[variant];

  const radiusClass = pill ? 'rounded-full' : size === 'sm' ? 'rounded-lg' : 'rounded-[10px]';

  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${sizeClasses} ${variantClasses} ${radiusClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
