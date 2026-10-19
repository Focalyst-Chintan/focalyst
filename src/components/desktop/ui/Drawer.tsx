'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import IconButton from './IconButton';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'w-[420px]',
  className = '',
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#05070F]/40 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Drawer Content */}
      <div
        className={`relative z-10 h-full ${width} max-w-full glass-strong shadow-2xl flex flex-col transition-transform duration-220 ease-out animate-in slide-in-from-right ${className}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-line shrink-0">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[18px] font-semibold text-ink leading-tight tracking-[-0.01em]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[13px] text-ink-3 mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          <IconButton
            label="Close drawer"
            variant="ghost"
            size="sm"
            pill
            onClick={onClose}
            className="text-ink-3 hover:text-ink shrink-0"
          >
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export default Drawer;
