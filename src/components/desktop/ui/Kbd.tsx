'use client';
import React from 'react';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Kbd({ children, className = '', ...props }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-[6px] border border-line-strong bg-surface-2 text-[11px] font-ui font-medium text-ink-2 select-none shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)] ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
}

export default Kbd;
