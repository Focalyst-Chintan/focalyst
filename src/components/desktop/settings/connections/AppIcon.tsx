'use client';
import React, { useState } from 'react';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** A public website host we can safely ask for a favicon, or null */
export function iconHost(host: string | null | undefined): string | null {
  const h = host?.trim().toLowerCase();
  if (!h || LOOPBACK.has(h) || h.endsWith('.localhost')) return null;
  return /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(h) ? h : null;
}

/**
 * The app's logo (from its registration, or its website favicon) on a light tile,
 * so dark icons stay visible in dark mode. Falls back to the app's initial.
 */
export function AppIcon({
  name,
  host,
  logo,
  size = 40,
}: {
  name: string;
  host?: string | null;
  logo?: string | null;
  size?: number;
}) {
  const safeHost = iconHost(host);
  const sources = [logo?.startsWith('https://') ? logo : null, safeHost ? `https://${safeHost}/favicon.ico` : null].filter(
    (s): s is string => !!s
  );
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  const radius = Math.round(size * 0.3);

  if (!src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center bg-primary-soft font-display text-primary-text"
        style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.45) }}
        aria-hidden
      >
        {(name.trim()[0] || '?').toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden border border-line bg-white"
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt=""
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="rounded-[4px] object-contain"
        onError={() => setFailed((n) => n + 1)}
      />
    </div>
  );
}
