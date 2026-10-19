'use client';
import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import IconButton from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  onConfirm,
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  children,
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-[440px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[720px]',
  }[size];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#05070F]/40 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative z-10 w-full ${sizeClasses} glass-strong liquid rounded-[28px] p-7 text-ink shadow-[var(--shadow-glass)] animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[20px] font-semibold text-ink leading-tight tracking-[-0.01em]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[14px] text-ink-3 mt-1 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onConfirm && (
              <IconButton
                label={confirmLabel}
                variant="primary"
                size="sm"
                pill
                disabled={confirmDisabled}
                onClick={onConfirm}
              >
                <Check className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton
              label="Close dialog"
              variant="ghost"
              size="sm"
              pill
              onClick={onClose}
              className="text-ink-3 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
