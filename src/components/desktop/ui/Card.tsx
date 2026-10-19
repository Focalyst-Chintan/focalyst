'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import IconButton from './IconButton';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actionHref?: string;
  onAction?: () => void;
  actionLabel?: string;
  headerRight?: React.ReactNode;
}

export function Card({
  title,
  subtitle,
  actionHref,
  onAction,
  actionLabel = 'Open details',
  headerRight,
  children,
  className = '',
  ...props
}: CardProps) {
  const hasHeader = title || subtitle || actionHref || onAction || headerRight;

  return (
    <div
      className={`frost p-5 relative overflow-hidden transition-all duration-200 ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && (
              <h3 className="text-[16px] font-semibold text-ink leading-snug tracking-[-0.01em] truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[13px] text-ink-3 mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            {actionHref ? (
              <Link href={actionHref} aria-label={actionLabel}>
                <IconButton
                  label={actionLabel}
                  variant="ghost"
                  size="sm"
                  pill
                  className="text-ink-3 hover:text-ink hover:bg-surface-2"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </IconButton>
              </Link>
            ) : onAction ? (
              <IconButton
                label={actionLabel}
                variant="ghost"
                size="sm"
                pill
                onClick={onAction}
                className="text-ink-3 hover:text-ink hover:bg-surface-2"
              >
                <ArrowUpRight className="h-4 w-4" />
              </IconButton>
            ) : null}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
