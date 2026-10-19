'use client';

import React, { useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `${error.name}: ${error.message}${error.digest ? `\nDigest: ${error.digest}` : ''}\n${error.stack || ''}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0f1d',
          color: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '90%',
            padding: '32px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            !
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px', color: '#ffffff' }}>
            Something went wrong on this page.
          </h2>

          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.5 }}>
            A critical application error occurred.
          </p>

          <div
            style={{
              maxHeight: '140px',
              overflowY: 'auto',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#cbd5e1',
              wordBreak: 'break-all',
              userSelect: 'all',
              marginBottom: '24px',
            }}
          >
            {error?.message || 'Unknown error'}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {copied ? 'Copied' : 'Copy error'}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
