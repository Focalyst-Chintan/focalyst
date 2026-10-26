'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] md:max-w-md animate-in slide-in-from-top-2 duration-200">
      <div className="glass-strong liquid flex items-center gap-2.5 rounded-full px-4 py-2 shadow-[var(--shadow-glass)] border border-line text-[13px] text-ink font-medium">
        <WifiOff size={15} className="text-danger shrink-0" />
        <span className="truncate">
          You are offline. Changes will not save until you are back online.
        </span>
      </div>
    </div>
  );
}

export default OfflineBanner;
