'use client';

import { useState } from 'react';
import { useToast } from '@/components/desktop/ui/Toast';

interface UseRestorePurchaseOptions {
  onSuccess?: (plan: string) => void;
}

export function useRestorePurchase(options?: UseRestorePurchaseOptions) {
  const [isRestoring, setIsRestoring] = useState(false);
  const toast = useToast();

  const restore = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch('/api/billing/sync-me', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.plan && data.plan !== 'free') {
        toast.show('Your Focalyst Pro is active.');
        options?.onSuccess?.(data.plan);
      } else {
        toast.show(
          'We could not find a purchase for this account. Email contactfocalyst@gmail.com and we will sort it out.'
        );
      }
    } catch {
      toast.show(
        'We could not find a purchase for this account. Email contactfocalyst@gmail.com and we will sort it out.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return { restore, isRestoring };
}
