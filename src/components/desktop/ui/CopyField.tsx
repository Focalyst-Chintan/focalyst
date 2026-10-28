'use client';
import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from './Toast';

export interface CopyFieldProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyField({ value, label = 'Copy', className = '' }: CopyFieldProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.show('Copied', 'success');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.show('Something went wrong. Please try again.', 'error');
    }
  };

  return (
    <div
      className={`flex min-h-11 h-auto min-w-0 items-center gap-2 rounded-[12px] border border-line bg-surface-2/70 py-1.5 pl-3.5 pr-1.5 sm:h-11 sm:py-0 ${className}`}
    >
      <code className="min-w-0 flex-1 font-mono text-[13px] text-ink break-all select-all sm:break-normal sm:truncate" title={value}>
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ring)]"
      >
        {copied ? <Check className="h-4 w-4 text-primary-text" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default CopyField;
