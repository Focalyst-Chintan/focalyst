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

export function GlobalToastContainer() {
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>>([]);

  React.useEffect(() => {
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.message) {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message: detail.message, type: detail.type || 'success' }]);
      }
    };
    window.addEventListener('fx:show-toast', handleToast);
    return () => window.removeEventListener('fx:show-toast', handleToast);
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <ToastContainer>
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id} message={t.message} type={t.type} onDismiss={handleDismiss} />
      ))}
    </ToastContainer>
  );
}

export function useToast() {
  return {
    show: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fx:show-toast', { detail: { message, type } }));
      }
    },
  };
}

export default Toast;
