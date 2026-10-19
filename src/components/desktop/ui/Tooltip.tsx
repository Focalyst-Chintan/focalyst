'use client';
import React, { useState } from 'react';
import Kbd from './Kbd';

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  content,
  shortcut,
  children,
  side = 'top',
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-[8px] bg-surface-3 px-2.5 py-1 text-[12px] font-medium text-ink shadow-md border border-line animate-in fade-in zoom-in-95 duration-100 ${sideClasses} ${className}`}
        >
          <span>{content}</span>
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
