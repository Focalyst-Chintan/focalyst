'use client';

import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `${error.name}: ${error.message}${error.digest ? `\nDigest: ${error.digest}` : ''}\n${error.stack || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-[480px] w-full items-center justify-center p-6">
      <div className="flex max-w-lg flex-col items-center rounded-2xl border border-line bg-surface/80 p-8 text-center backdrop-blur-xl shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-ink">
          Something went wrong on this page.
        </h2>

        <p className="mt-1 text-sm text-ink-3">
          An unexpected error occurred while rendering this section.
        </p>

        <div className="mt-4 max-h-36 w-full overflow-auto rounded-lg bg-surface-2 p-3 text-left font-mono text-xs text-ink-2 select-all border border-line">
          {error.message || 'Unknown error'}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="sm" onClick={() => reset()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>

          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy error
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
