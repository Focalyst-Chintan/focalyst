'use client';
import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/billing/checkout';

export const PRICES = {
  USD: { monthly: '$4.99', yearly: '$39.99', lifetime: '$99.99' },
  INR: { monthly: '₹99', yearly: '₹999', lifetime: '₹2,999' },
} as const;

let cached: 'INR' | 'USD' | null = null;

export function useCurrency(): 'INR' | 'USD' | null {
  const [cur, setCur] = useState<'INR' | 'USD' | null>(cached);
  useEffect(() => {
    if (cached || isNativeApp()) return;
    fetch('/api/billing/region', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => { cached = j.currency === 'INR' ? 'INR' : 'USD'; setCur(cached); })
      .catch(() => { cached = 'USD'; setCur('USD'); });
  }, []);
  return cur; // null while loading: show a price skeleton, never a wrong currency
}
