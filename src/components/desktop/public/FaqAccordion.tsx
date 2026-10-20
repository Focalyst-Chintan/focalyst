'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { FaqItem } from '@/data/faqData';

interface FaqAccordionProps {
  items: FaqItem[];
  searchQuery?: string;
  defaultOpenId?: string;
}

export function highlightText(text: string, query?: string) {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary-soft text-primary-text rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function FaqAccordion({
  items,
  searchQuery = '',
  defaultOpenId,
}: FaqAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(defaultOpenId ? [defaultOpenId] : []));

  useEffect(() => {
    const handleHash = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.slice(1);
      if (hash && items.some((item) => item.id === hash)) {
        setOpenIds((prev) => new Set(prev).add(hash));
        const el = document.getElementById(hash);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [items]);

  // If search query is non-empty, auto-open matching items
  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = items
        .filter((it) => it.question.toLowerCase().includes(q) || it.answer.toLowerCase().includes(q))
        .map((it) => it.id);
      setOpenIds(new Set(matches));
    }
  }, [searchQuery, items]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <div
            key={item.id}
            id={item.id}
            className="frost rounded-[16px] overflow-hidden border border-line transition-all duration-150 scroll-mt-28"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="min-h-[56px] w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left text-[15px] font-medium text-ink transition-colors hover:text-primary-text"
            >
              <span>{highlightText(item.question, searchQuery)}</span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3 transition-transform duration-200 ${
                  isOpen ? 'rotate-45 text-primary-text bg-primary-soft' : ''
                }`}
              >
                <Plus size={18} />
              </span>
            </button>

            {isOpen && (
              <div className="text-[15px] leading-[26px] text-ink-2 px-5 pb-4 pt-1 border-t border-line/60">
                <p>{highlightText(item.answer, searchQuery)}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
