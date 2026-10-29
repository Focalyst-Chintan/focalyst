'use client';
// Chapter 1 visuals: the collage (screen 1) and the benefit cards (3). Screens 2 and 3 use FeaturePills.
import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck, CalendarDays, ChartColumn, LayoutGrid, MessageCircle, Plug, Timer, Trophy,
} from 'lucide-react';
import { BENEFITS } from './copy';

/** The 8 collage screens, in order (screen 1 spec). */
const COLLAGE: { label: string; icon: LucideIcon }[] = [
  { label: 'Today', icon: CalendarCheck },
  { label: 'Plan', icon: CalendarDays },
  { label: 'Focus timer', icon: Timer },
  { label: 'Insights', icon: ChartColumn },
  { label: 'Habit group leaderboard', icon: Trophy },
  { label: 'Phone widgets', icon: LayoutGrid },
  { label: 'AI chat', icon: MessageCircle },
  { label: 'AI connections', icon: Plug },
];

const SPEED = 12; // px per second

function CollageTile({ index, height, hasImage, priority }: { index: number; height: number; hasImage: boolean; priority: boolean }) {
  const item = COLLAGE[index];
  const n = index + 1;
  return (
    <div className="glass liquid relative w-full overflow-hidden rounded-[16px]" style={{ height }}>
      {hasImage ? (
        <>
          <Image
            src={`/onboarding/collage-${n}-light.webp`}
            alt={`Focalyst ${item.label}`}
            fill
            sizes="(min-width: 1024px) 240px, 33vw"
            priority={priority}
            className="object-cover object-top dark:hidden"
          />
          <Image
            src={`/onboarding/collage-${n}-dark.webp`}
            alt={`Focalyst ${item.label}`}
            fill
            sizes="(min-width: 1024px) 240px, 33vw"
            priority={priority}
            className="hidden object-cover object-top dark:block"
          />
        </>
      ) : (
        <div className="frost flex h-full w-full items-center justify-center rounded-[16px]">
          <item.icon className="h-7 w-7 text-primary-text" aria-hidden />
          <span className="sr-only">{item.label}</span>
        </div>
      )}
    </div>
  );
}

function CollageColumn({
  items, tileH, gap, offset, images, eager,
}: {
  items: number[]; tileH: number; gap: number; offset: number; images: boolean[]; eager: number[];
}) {
  const loopPx = items.length * (tileH + gap);
  const duration = loopPx / SPEED;
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div className="ob-drift" style={{ animationDuration: `${duration}s`, animationDelay: `-${duration * offset}s` }}>
        {[...items, ...items].map((idx, k) => (
          <div key={k} style={{ paddingBottom: gap }} aria-hidden={k >= items.length || undefined}>
            <CollageTile index={idx} height={tileH} hasImage={images[idx]} priority={k < items.length && eager.includes(idx)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Drifting collage, 12 px/s, paused when the tab is hidden, static with reduce motion. */
export function Collage({ columns, images, className = '' }: { columns: 2 | 3; images: boolean[]; className?: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const cols = columns === 2 ? [[0, 2, 4, 6], [1, 3, 5, 7]] : [[0, 3, 6], [1, 4, 7], [2, 5]];
  const tileH = columns === 2 ? 260 : 170;
  const gap = columns === 2 ? 16 : 10;

  return (
    <div className={`flex h-full ${columns === 2 ? 'gap-4' : 'gap-2.5'} ${hidden ? 'ob-paused' : ''} ${className}`} aria-label="Focalyst screens" role="img">
      {cols.map((items, i) => (
        <CollageColumn key={i} items={items} tileH={tileH} gap={gap} offset={i / cols.length} images={images} eager={[0, 1]} />
      ))}
    </div>
  );
}

/** The 4 benefit cards on screen 3, with a 60 ms entrance stagger. */
export function BenefitCards() {
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {BENEFITS.map((b, i) => (
        <li key={b.title} className="frost ob-stagger flex min-h-[72px] items-center gap-3 px-4 py-3" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-text">
            <b.icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold leading-[20px] text-ink">{b.title}</span>
            <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-2">{b.line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Screen 12: the chosen chips gather into one frost card (fade and move 8 px, stagger 40 ms). */
export function GatheredChips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="frost mt-6 flex flex-wrap justify-center gap-2 p-4 lg:justify-start">
      {items.map((t, i) => (
        <span
          key={t}
          className="ob-gather inline-flex h-8 items-center rounded-full bg-primary-soft px-3 text-[13px] font-medium text-primary-text"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
