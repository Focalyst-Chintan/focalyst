'use client';

import React, { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import { Button } from '@/components/desktop/ui/Button';
import { Toast } from '@/components/desktop/ui/Toast';

interface TocItem {
  id: string;
  label: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  shortVersion: string[];
  toc: TocItem[];
  children: React.ReactNode;
}

export default function LegalLayout({
  title,
  lastUpdated,
  shortVersion,
  toc,
  children,
}: LegalLayoutProps) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('contactfocalyst@gmail.com');
      setToastMessage('Email copied');
    } catch {}
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1040px] px-6 pt-10 pb-20">
        {/* Header */}
        <div className="max-w-[760px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            LEGAL
          </div>
          <h1 className="font-display text-[clamp(40px,5vw,56px)] leading-[1.08] text-ink mt-2">
            {title}
          </h1>
          <p className="mt-2 text-[14px] text-ink-3">Last updated {lastUpdated}</p>

          {/* The short version card */}
          {shortVersion && shortVersion.length > 0 && (
            <div className="glass liquid rounded-[20px] p-6 max-w-[760px] mt-8">
              <div className="text-[13px] font-semibold text-ink mb-3">
                The short version
              </div>
              <ul className="space-y-3">
                {shortVersion.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[14px] leading-[22px] text-ink-2">
                    <span className="bg-primary-soft text-primary-text rounded-full p-1 shrink-0 mt-0.5">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Mobile collapsible TOC */}
        <div className="lg:hidden mt-8 print:hidden">
          <details className="frost rounded-[16px] p-4 group">
            <summary className="cursor-pointer text-[14px] font-semibold text-ink select-none list-none flex items-center justify-between">
              <span>On this page</span>
              <span className="text-xs text-ink-3 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <nav className="mt-4 flex flex-col space-y-2 border-t border-line pt-3">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-[13px] text-ink-2 hover:text-ink transition-colors py-1"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>

        {/* Desktop Body: [240px | minmax(0,720px)] */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,720px)] gap-12 items-start">
          {/* Left TOC */}
          <aside className="hidden lg:block sticky top-24 print:hidden">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-3">
              Contents
            </div>
            <nav className="flex flex-col space-y-1">
              {toc.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`text-[13px] leading-[20px] transition-all py-1.5 ${
                      isActive
                        ? 'text-ink font-medium border-l-2 border-primary pl-3'
                        : 'text-ink-3 hover:text-ink pl-3.5'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Right Article Content */}
          <div>
            <article className="fx-article">{children}</article>

            {/* Questions bottom card */}
            <div className="mt-14 p-5 rounded-[16px] frost flex flex-wrap items-center justify-between gap-4 print:hidden">
              <span className="text-[14px] text-ink-2">
                Questions about this policy? Email contactfocalyst@gmail.com
              </span>
              <Button variant="secondary" size="sm" onClick={handleCopyEmail}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy email
              </Button>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </PublicLayout>
  );
}
