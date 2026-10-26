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
  const modalBoxRef = React.useRef<HTMLDivElement>(null);
  const triggerElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Remember the button/element that opened the modal
    triggerElementRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable element or the modal box itself
    const timer = setTimeout(() => {
      if (modalBoxRef.current) {
        const focusable = modalBoxRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalBoxRef.current.focus();
        }
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalBoxRef.current) return;
        const focusable = modalBoxRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalBoxRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalBoxRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Return focus to the button that opened the modal
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        setTimeout(() => {
          triggerElementRef.current?.focus();
        }, 0);
      }
    };
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
        ref={modalBoxRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${sizeClasses} glass-strong liquid rounded-[28px] p-7 text-ink shadow-[var(--shadow-glass)] outline-none animate-in fade-in zoom-in-95 duration-200 ${className}`}
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
