'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ThemeSwitch } from '@/components/desktop/ui/ThemeSwitch';

export function EditorialNav() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      rafId = 0;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) {
        setProgress(0);
        return;
      }
      const ratio = Math.min(1, Math.max(0, scrollTop / maxScroll));
      setProgress(ratio);
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header className="glass sticky top-0 z-40 h-[60px] w-full border-x-0 border-t-0">
      {/* 2px reading progress bar pinned to the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-[2px] w-full bg-transparent"
      >
        <div
          className="h-full origin-left bg-primary transition-transform duration-75 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <div className="mx-auto flex h-full max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="rounded-[10px] py-1 text-[13px] font-semibold tracking-[0.32em] text-ink transition-colors hover:text-primary-text focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
          >
            FOCALYST
          </Link>
          <span aria-hidden className="hidden h-3.5 w-px bg-line-strong sm:inline-block" />
          <span className="hidden truncate text-[13px] font-normal text-ink-3 sm:inline">
            Product &amp; Design Overview
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <ThemeSwitch />
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
          >
            <span>Open Focalyst</span>
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </header>
  );
}
