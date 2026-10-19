'use client';
import React, { useState, useRef, useEffect } from 'react';

export interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode | ((props: { close: () => void }) => React.ReactNode);
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Popover({
  trigger,
  children,
  align = 'left',
  className = '',
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const alignClasses = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
    center: 'left-1/2 -translate-x-1/2 origin-top',
  }[align];

  return (
    <div ref={containerRef} className="relative inline-block">
      <div onClick={() => setOpen((prev) => !prev)} className="inline-flex cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-2 z-50 min-w-[200px] glass-strong rounded-[14px] p-1.5 shadow-[var(--shadow-glass)] animate-in fade-in zoom-in-95 duration-150 ${alignClasses} ${className}`}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}

export function PopoverItem({
  icon,
  children,
  onClick,
  active = false,
  danger = false,
  disabled = false,
  className = '',
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full h-9 px-3 flex items-center gap-2.5 rounded-[10px] text-[13px] font-medium transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? 'text-danger hover:bg-danger/10'
          : active
          ? 'bg-surface shadow-[var(--shadow-1)] text-ink'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      } ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span className="truncate flex-1 text-left">{children}</span>
    </button>
  );
}

export default Popover;
