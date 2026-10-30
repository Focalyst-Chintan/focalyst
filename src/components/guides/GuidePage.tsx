import React from 'react';
import Link from 'next/link';
import { ChevronRight, Info, Mail, Monitor, Smartphone, type LucideIcon } from 'lucide-react';
import { CATEGORY_LABELS, GUIDES_BY_SLUG, type Guide, type Platform } from '@/content/guides';
import { GuideText } from './GuideText';
import { PlatformChips } from './PlatformChips';
import { PlatformTabs } from './PlatformTabs';
import { RelatedGuideCard } from './GuideCard';
import { SUPPORT_EMAIL, availability, formatUpdated, readMinutes } from './guideUtils';

function PlatformSection({
  id,
  heading,
  icon: Icon,
  platform,
}: {
  id: string;
  heading: string;
  icon: LucideIcon;
  platform: Platform;
}) {
  const methods = platform.unavailable ? [] : (platform.methods ?? []);
  return (
    <section aria-labelledby={id} className="frost h-full rounded-[20px] p-5 sm:p-6">
      <h2
        id={id}
        className="flex items-center gap-2 text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-ink"
      >
        <Icon size={18} className="text-ink-3" aria-hidden />
        {heading}
      </h2>

      {platform.unavailable ? (
        <div className="mt-4 flex gap-3 rounded-[14px] border border-line bg-surface-2 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-primary-text" aria-hidden />
          <p className="text-[15px] leading-[24px] text-ink-2">{platform.unavailable}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {methods.map((m, mi) => (
            <div key={mi} className="flex flex-col gap-3">
              {m.label && <h3 className="text-[15px] font-semibold leading-[22px] text-ink">{m.label}</h3>}
              <ol className="flex flex-col gap-3">
                {m.steps.map((step, si) => (
                  <li key={si} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold tabular-nums text-primary-text"
                    >
                      {si + 1}
                    </span>
                    <span className="text-[15px] leading-[24px] text-ink-2">
                      <GuideText text={step} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {platform.notes && platform.notes.length > 0 && (
        <ul className="mt-5 flex flex-col gap-1.5 border-t border-line pt-4">
          {platform.notes.map((n, i) => (
            <li key={i} className="text-[13px] leading-[20px] text-ink-3">
              <GuideText text={n} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function GuidePage({ guide, basePath }: { guide: Guide; basePath: string }) {
  const related = guide.related
    .map((s) => GUIDES_BY_SLUG[s])
    .filter(Boolean)
    .slice(0, 3);
  const category = CATEGORY_LABELS[guide.category];
  const helpSubject = encodeURIComponent(`Help with: ${guide.title}`);

  return (
    <article className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
      <div className="flex flex-col gap-5">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] leading-[18px] text-ink-3">
            <li>
              <Link href={basePath} className="hover:text-ink">
                How to use
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight size={14} />
            </li>
            <li>
              <Link href={`${basePath}#${guide.category}`} className="hover:text-ink">
                {category}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight size={14} />
            </li>
            <li aria-current="page" className="text-ink-2">
              {guide.title}
            </li>
          </ol>
        </nav>

        <h1 className="font-display text-[32px] font-normal leading-[38px] text-ink sm:text-[40px] sm:leading-[46px]">
          {guide.question}
        </h1>

        <div className="frost rounded-[20px] p-5" style={{ borderLeft: `3px solid ${guide.color}` }}>
          <p className="text-[16px] leading-[26px] text-ink">{guide.answer}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] leading-[18px] text-ink-3">
          <PlatformChips a={availability(guide)} />
          <span>Updated {formatUpdated(guide.updated)}</span>
          <span aria-hidden>·</span>
          <span>{readMinutes(guide)} min read</span>
        </div>
      </div>

      <PlatformTabs
        web={<PlatformSection id="on-the-web" heading="On the web" icon={Monitor} platform={guide.web} />}
        phone={
          <PlatformSection
            id="on-your-phone"
            heading="On your phone"
            icon={Smartphone}
            platform={guide.phone}
          />
        }
      />

      <div className="flex flex-col gap-8">
        {guide.goodToKnow && guide.goodToKnow.length > 0 && (
          <section aria-labelledby="good-to-know">
            <h2
              id="good-to-know"
              className="mb-3 text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-ink"
            >
              Good to know
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-ink-3">
              {guide.goodToKnow.map((n, i) => (
                <li key={i} className="text-[15px] leading-[24px] text-ink-2">
                  <GuideText text={n} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-guides">
            <h2
              id="related-guides"
              className="mb-3 text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-ink"
            >
              Related guides
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {related.map((r, i) => (
                <RelatedGuideCard key={r.slug} guide={r} basePath={basePath} index={i} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="still-stuck" className="frost flex items-start gap-3 rounded-[20px] p-5">
          <Mail size={18} className="mt-0.5 shrink-0 text-primary-text" aria-hidden />
          <div>
            <h2 id="still-stuck" className="text-[15px] font-semibold leading-[22px] text-ink">
              Still stuck?
            </h2>
            <p className="mt-1 text-[14px] leading-[22px] text-ink-2">
              Email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${helpSubject}`}
                className="font-medium text-primary-text underline-offset-2 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}

export default GuidePage;
