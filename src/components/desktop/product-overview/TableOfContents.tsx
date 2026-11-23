'use client';

import { useEffect, useState } from 'react';

export interface TocItem {
  id: string;
  numeral: string;
  label: string;
}

const TOC_ITEMS: TocItem[] = [
  { id: 'philosophy', numeral: '01', label: 'Philosophy' },
  { id: 'experience', numeral: '02', label: 'Experience' },
  { id: 'design', numeral: '03', label: 'Design & UX' },
  { id: 'ai-mcp', numeral: '04', label: 'AI & MCP' },
  { id: 'accountability', numeral: '05', label: 'Accountability' },
  { id: 'looking-ahead', numeral: '06', label: 'Looking Ahead' },
];

export function TableOfContents() {
  const [activeId, setActiveId] = useState<string>('philosophy');
  const [availableIds, setAvailableIds] = useState<Set<string>>(
    () => new Set(['philosophy', 'experience', 'design'])
  );

  useEffect(() => {
    const present = new Set<string>();
    const elements: HTMLElement[] = [];

    for (const item of TOC_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) {
        present.add(item.id);
        elements.push(el);
      }
    }

    setAvailableIds(present);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0 && visible[0].target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-20% 0px -65% 0px',
        threshold: [0, 0.1, 0.25],
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <aside
      aria-label="Document contents"
      className="hidden xl:block"
    >
      <nav className="sticky top-24 w-[200px]">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          Contents
        </p>
        <ul className="space-y-1 border-l border-line">
          {TOC_ITEMS.map((item) => {
            const isAvailable = availableIds.has(item.id);
            const isActive = activeId === item.id && isAvailable;

            if (!isAvailable) {
              return (
                <li key={item.id} className="relative pl-3.5 py-1.5">
                  <span className="flex items-center gap-2 text-[13px] text-ink-3/60">
                    <span className="tabular-nums text-[11px]">{item.numeral}</span>
                    <span>{item.label}</span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.id} className="relative">
                <span
                  aria-hidden
                  className={`absolute top-1.5 bottom-1.5 left-[-1px] w-[2px] rounded-full transition-opacity duration-200 ${
                    isActive ? 'bg-primary opacity-100' : 'opacity-0'
                  }`}
                />
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={`flex items-center gap-2 rounded-[10px] py-1.5 pl-3.5 pr-2 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                    isActive
                      ? 'font-medium text-ink'
                      : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  <span
                    className={`tabular-nums text-[11px] ${
                      isActive ? 'text-primary-text' : 'text-ink-3'
                    }`}
                  >
                    {item.numeral}
                  </span>
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
