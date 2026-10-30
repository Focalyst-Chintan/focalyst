import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Guide, GuideCategory } from '@/content/guides';
import { GuideIconTile } from './GuideIcon';
import { PlatformChips } from './PlatformChips';
import { availability, type Availability } from './guideUtils';

export type GuideCardData = {
  slug: string;
  title: string;
  summary: string;
  category: GuideCategory;
  icon: string;
  color: string;
  keywords: string[];
  a: Availability;
};

export function toCardData(g: Guide): GuideCardData {
  return {
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    category: g.category,
    icon: g.icon,
    color: g.color,
    keywords: g.keywords,
    a: availability(g),
  };
}

const cardBase =
  'group frost flex flex-1 flex-col rounded-[20px] transition-[transform,border-color] duration-150 ease-[var(--ease)] hover:-translate-y-px hover:border-line-strong motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]';

export function GuideCard({
  card,
  basePath,
  index = 0,
}: {
  card: GuideCardData;
  basePath: string;
  index?: number;
}) {
  return (
    // The entrance animation sits on a wrapper so its fill mode never blocks the hover lift
    <div className="fx-reveal flex" style={{ ['--fx-delay' as string]: `${index * 40}ms` }}>
      <Link href={`${basePath}/${card.slug}`} className={`${cardBase} p-5`}>
        <span className="flex items-start justify-between">
          <GuideIconTile icon={card.icon} color={card.color} />
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors group-hover:bg-surface-2 group-hover:text-ink"
          >
            <ArrowUpRight size={16} />
          </span>
        </span>
        <h3 className="mt-4 text-[16px] font-semibold leading-[22px] text-ink">{card.title}</h3>
        <p className="mt-1 line-clamp-2 text-[14px] leading-[21px] text-ink-2">{card.summary}</p>
        <span className="mt-auto pt-4">
          <PlatformChips a={card.a} />
        </span>
      </Link>
    </div>
  );
}

// Compact card for "Related guides"
export function RelatedGuideCard({
  guide,
  basePath,
  index = 0,
}: {
  guide: Guide;
  basePath: string;
  index?: number;
}) {
  return (
    <div className="fx-reveal flex" style={{ ['--fx-delay' as string]: `${index * 40}ms` }}>
      <Link href={`${basePath}/${guide.slug}`} className={`${cardBase} gap-3 p-4`}>
        <span className="flex items-center gap-3">
          <GuideIconTile icon={guide.icon} color={guide.color} size={32} />
          <span className="text-[15px] font-semibold leading-[20px] text-ink">{guide.title}</span>
        </span>
        <span className="line-clamp-2 text-[13px] leading-[19px] text-ink-2">{guide.summary}</span>
      </Link>
    </div>
  );
}

export default GuideCard;
