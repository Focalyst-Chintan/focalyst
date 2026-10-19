'use client';
import React from 'react';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'neutral' | 'warning' | 'danger' | 'success';
  customColor?: string;
  icon?: React.ReactNode;
}

export function Chip({
  variant = 'primary',
  customColor,
  icon,
  children,
  className = '',
  style,
  ...props
}: ChipProps) {
  const variantClasses = {
    primary: 'bg-primary-soft text-primary-text',
    neutral: 'bg-surface-2 text-ink-2 border border-line',
    warning: 'bg-amber-500/10 text-warning dark:text-amber-400',
    danger: 'bg-danger/10 text-danger',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  }[variant];

  const customStyle: React.CSSProperties = customColor
    ? {
        backgroundColor: `${customColor}1F`, // ~12% opacity
        color: customColor,
        ...style,
      }
    : (style || {});

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-medium select-none ${
        customColor ? '' : variantClasses
      } ${className}`}
      style={customStyle}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Chip;
