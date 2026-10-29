'use client';
// Store buttons for screen 32 and /get-app. Only the links that are set are shown.
import { useSyncExternalStore } from 'react';
import { Smartphone } from 'lucide-react';

export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || '';
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || '';
export const GET_APP_URL = 'https://focalyst.online/get-app';

export type Platform = 'ios' | 'android' | 'other';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS reports itself as a Mac with touch.
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

const noSubscribe = () => () => {};

/** The visitor's platform after hydration; null on the server. */
export function usePlatform(): Platform | null {
  return useSyncExternalStore(noSubscribe, detectPlatform, () => null);
}

function StoreLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-ink px-4 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
    >
      <Smartphone className="h-4 w-4" aria-hidden />
      {label}
    </a>
  );
}

/** iOS shows the App Store, Android shows Google Play, anything else shows both. */
export function StoreButtons({ platform, className = '' }: { platform: Platform; className?: string }) {
  const ios = APP_STORE_URL && platform !== 'android';
  const android = PLAY_STORE_URL && platform !== 'ios';
  if (!ios && !android) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {ios && <StoreLink href={APP_STORE_URL} label="App Store" />}
      {android && <StoreLink href={PLAY_STORE_URL} label="Google Play" />}
    </div>
  );
}

export default StoreButtons;
