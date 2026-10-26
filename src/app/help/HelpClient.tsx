'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Mail } from 'lucide-react';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import FaqAccordion from '@/components/desktop/public/FaqAccordion';
import { FAQ_CATEGORIES } from '@/data/faqData';
import { Button } from '@/components/desktop/ui/Button';

export default function HelpClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Filter questions and categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      if (activeCategory === 'all') return FAQ_CATEGORIES;
      return FAQ_CATEGORIES.filter((cat) => cat.id === activeCategory);
    }

    const q = searchQuery.toLowerCase().trim();
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) => it.question.toLowerCase().includes(q) || it.answer.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery, activeCategory]);

  const totalQuestionsCount = useMemo(() => {
    return filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [filteredCategories]);

  return (
    <PublicLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 pt-16 sm:pt-20 pb-24 font-ui">
        {/* Header Block */}
        <div className="mx-auto max-w-[760px] text-center mb-10 sm:mb-12">
          <span className="inline-flex items-center justify-center rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
            HELP CENTER
          </span>
          <h1 className="mt-4 font-display text-[36px] sm:text-[48px] lg:text-[56px] leading-[1.08] tracking-[-0.015em] text-ink">
            Frequently asked questions.
          </h1>
          <p className="mt-3.5 text-[15px] sm:text-[17px] leading-[1.55] text-ink-2 max-w-[620px] mx-auto">
            Everything you need to know about Focalyst, your account, plans, focus sessions, habits, notes and privacy.
          </p>

          {/* Search Box - max-w-xl, centered */}
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full h-12 rounded-[16px] bg-surface-2 border border-line pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="mx-auto max-w-3xl border-b border-line pb-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeCategory === 'all'
                  ? 'bg-primary text-snow shadow-sm'
                  : 'bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink'
              }`}
            >
              All questions ({totalQuestionsCount})
            </button>
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-primary text-snow shadow-sm'
                    : 'bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories and Accordions - max-w-3xl, centered, gap-3 */}
        <div className="mx-auto mt-10 max-w-3xl space-y-10">
          {filteredCategories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[16px] leading-7 text-[var(--ink-2)]">
                No questions match &ldquo;{searchQuery.trim()}&rdquo;. Try another word, or email contactfocalyst@gmail.com.
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <section key={cat.id} id={cat.id} className="scroll-mt-36">
                <h2 className="font-display text-[24px] leading-[32px] text-ink mb-4">
                  {cat.name}
                </h2>
                <FaqAccordion items={cat.items} searchQuery={searchQuery} />
              </section>
            ))
          )}
        </div>

        {/* Bottom CTA Card */}
        <div className="frost rounded-[24px] p-8 sm:p-10 text-center mt-20 border border-line">
          <h2 className="font-display text-[28px] sm:text-[32px] text-ink">
            Still need help?
          </h2>
          <p className="mt-2 text-[15px] text-ink-2">Our team reads every message.</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                window.location.href = 'mailto:contactfocalyst@gmail.com';
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email us
            </Button>

            <Link
              href="/contact"
              className="inline-flex h-10 items-center justify-center rounded-[14px] bg-surface-2 px-5 text-[14px] font-medium text-ink hover:bg-surface-3 transition-colors"
            >
              Contact page
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
