'use client';
import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger' | 'onDark';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    pill = false,
    loading = false,
    icon,
    children,
    className = '',
    disabled,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-[14px]',
    lg: 'h-12 px-6 text-[14px]',
  }[size];

  const variantClasses = {
    primary: 'bg-primary text-snow hover:bg-primary-hover',
    secondary: 'bg-surface border border-line-strong text-ink hover:bg-surface-2 shadow-[var(--shadow-1)]',
    ghost: 'bg-transparent text-ink hover:bg-surface-2',
    glass: 'glass liquid text-snow hover:opacity-95',
    danger: 'bg-danger text-snow hover:opacity-90',
    onDark: 'bg-snow/15 border border-snow/25 text-snow backdrop-blur-md hover:bg-snow/25 active:bg-snow/30',
  }[variant];

  const radiusClass = pill ? 'rounded-full' : 'rounded-[14px]';

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium gap-2 transition-all duration-150 select-none cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${sizeClasses} ${variantClasses} ${radiusClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
