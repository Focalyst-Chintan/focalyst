'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Mail } from 'lucide-react';
import PublicLayout from '@/components/desktop/public/PublicLayout';
import FaqAccordion from '@/components/desktop/public/FaqAccordion';
import { FAQ_CATEGORIES } from '@/data/faqData';
import { Button } from '@/components/desktop/ui/Button';

export default function HelpPage() {
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

  // JSON-LD structured data for FAQPage
  const faqJsonLd = useMemo(() => {
    const mainEntity = FAQ_CATEGORIES.flatMap((cat) =>
      cat.items.map((it) => ({
        '@type': 'Question',
        name: it.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: it.answer,
        },
      }))
    );

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity,
    };
  }, []);

  return (
    <PublicLayout>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-[840px] px-6 pt-12 pb-24">
        {/* Header Hero */}
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            HELP CENTRE
          </div>
          <h1 className="font-display text-[clamp(40px,5vw,56px)] leading-[1.08] text-ink mt-2">
            How can we help?
          </h1>

          {/* Search bar */}
          <div className="relative max-w-[520px] mx-auto mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions"
              className="w-full h-12 pl-11 pr-4 rounded-[16px] frost border border-line text-[15px] text-ink outline-none transition-all placeholder:text-ink-3 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)]"
            />
          </div>
        </div>

        {/* Sticky category chip bar under the nav */}
        {!searchQuery && (
          <div className="sticky top-20 z-30 py-3 mt-8 -mx-6 px-6 bg-canvas/80 backdrop-blur-md overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition-all ${
                  activeCategory === 'all'
                    ? 'bg-primary text-snow shadow-sm'
                    : 'bg-surface-2 text-ink-2 hover:text-ink hover:bg-surface-3'
                }`}
              >
                All questions
              </button>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-primary text-snow shadow-sm'
                      : 'bg-surface-2 text-ink-2 hover:text-ink hover:bg-surface-3'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories and Accordions */}
        <div className="mt-10 space-y-12">
          {filteredCategories.length === 0 ? (
            <div className="frost rounded-[20px] p-10 text-center">
              <p className="text-[16px] font-semibold text-ink">No questions found</p>
              <p className="text-[14px] text-ink-3 mt-1">
                Try searching with different keywords or email our team.
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <section key={cat.id} id={cat.id} className="scroll-mt-36">
                <h2 className="font-display text-[28px] leading-[34px] text-ink mb-4">
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
