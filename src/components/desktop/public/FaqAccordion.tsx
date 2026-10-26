'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

function renderAnswer(text: string, query?: string) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  if (!linkRegex.test(text)) {
    return <p>{highlightText(text, query)}</p>;
  }

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  linkRegex.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(highlightText(text.slice(lastIndex, match.index), query));
    }
    const label = match[1];
    const href = match[2];
    elements.push(
      <Link key={match.index} href={href} className="text-primary-text underline hover:text-primary">
        {highlightText(label, query)}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(highlightText(text.slice(lastIndex), query));
  }

  return <p>{elements}</p>;
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
        .filter(
          (it) =>
            it.question.toLowerCase().includes(q) ||
            (typeof it.answer === 'string' && it.answer.toLowerCase().includes(q))
        )
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
            className="glass liquid rounded-2xl overflow-hidden transition-all duration-150 scroll-mt-28"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left text-[16px] font-medium text-[var(--ink)] transition-colors hover:text-primary-text"
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

            <div
              className={`text-[15px] leading-7 text-[var(--ink-2)] px-5 pb-5 pt-1 border-t border-line/60 ${
                isOpen ? 'block' : 'hidden'
              }`}
            >
              {renderAnswer(item.answer, searchQuery)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
