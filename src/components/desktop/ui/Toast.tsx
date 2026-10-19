'use client';
import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import IconButton from './IconButton';

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: (id: string) => void;
  duration?: number;
}

export function Toast({
  id,
  message,
  type = 'info',
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    error: <AlertCircle className="h-4 w-4 text-danger" />,
    info: <Info className="h-4 w-4 text-primary" />,
  };

  return (
    <div
      role="status"
      className="glass-strong liquid flex items-center gap-3 rounded-[14px] px-4 py-3 shadow-[var(--shadow-glass)] text-ink text-[14px] font-medium animate-in slide-in-from-bottom-2 duration-200"
    >
      <span className="shrink-0">{icons[type]}</span>
      <span className="min-w-0 flex-1">{message}</span>
      <IconButton
        label="Dismiss notification"
        variant="ghost"
        size="sm"
        pill
        onClick={() => onDismiss(id)}
        className="text-ink-3 hover:text-ink shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
      {children}
    </div>
  );
}

export default Toast;
