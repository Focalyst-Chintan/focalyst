'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/desktop/ui/Input';
import { SegmentedControl } from '@/components/desktop/ui/SegmentedControl';
import { GUIDE_CATEGORIES, type GuideCategory } from '@/content/guides';
import { GuideCard, type GuideCardData } from './GuideCard';
import { SUPPORT_EMAIL } from './guideUtils';

type Filter = 'all' | GuideCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...GUIDE_CATEGORIES.map((c) => ({ value: c.key as Filter, label: c.label })),
];

const GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';

export function GuidesHub({ cards, basePath }: { cards: GuideCardData[]; basePath: string }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (filter !== 'all' && c.category !== filter) return false;
      if (!q) return true;
      return [c.title, c.summary, ...c.keywords].some((s) => s.toLowerCase().includes(q));
    });
  }, [cards, query, filter]);

  const groups = useMemo(
    () =>
      GUIDE_CATEGORIES.map((cat) => ({
        ...cat,
        cards: visible.filter((c) => c.category === cat.key),
      })).filter((g) => g.cards.length > 0),
    [visible],
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <span className="text-[11px] font-medium uppercase leading-[14px] tracking-[0.08em] text-ink-3">
          How to use
        </span>
        <h1 className="font-display text-[32px] font-normal leading-[38px] text-ink sm:text-[44px] sm:leading-[48px]">
          How to use Focalyst
        </h1>
        <p className="text-[15px] leading-[24px] text-ink-2">
          Step-by-step guides for the web app and the phone app.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="max-w-[520px]">
          <Input
            type="search"
            aria-label="Search guides"
            placeholder="Search guides"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        {/* Phones: chips wrap so every category fits the same width as the search box */}
        <div role="tablist" aria-label="Categories" className="flex max-w-[520px] flex-wrap gap-2 sm:hidden">
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.value)}
                className={`h-9 rounded-full border px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
                  active
                    ? 'border-primary/40 bg-primary-soft text-primary-text'
                    : 'border-line bg-surface-2/70 text-ink-2 hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="hidden sm:block">
          <SegmentedControl value={filter} onChange={setFilter} options={FILTERS} />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="frost rounded-[20px] p-6 text-[15px] leading-[24px] text-ink-2" role="status">
          No guide for that yet. Email{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Question about Focalyst')}`}
            className="font-medium text-primary-text underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{' '}
          and we&apos;ll help.
        </p>
      ) : filter === 'all' ? (
        <div className="flex flex-col gap-10">
          {groups.map((g) => (
            <section key={g.key} id={g.key} aria-labelledby={`cat-${g.key}`} className="scroll-mt-24">
              <h2
                id={`cat-${g.key}`}
                className="mb-4 text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-ink"
              >
                {g.label}
              </h2>
              <div className={GRID}>
                {g.cards.map((c, i) => (
                  <GuideCard key={c.slug} card={c} basePath={basePath} index={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={GRID}>
          {visible.map((c, i) => (
            <GuideCard key={c.slug} card={c} basePath={basePath} index={i} />
          ))}
        </div>
      )}

      <p className="text-[14px] leading-[22px] text-ink-2">
        Can&apos;t find it? Email{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Question about Focalyst')}`}
          className="font-medium text-primary-text underline-offset-2 hover:underline"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}

export default GuidesHub;
