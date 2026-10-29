'use client';
// "Your starting report" renderer (WEB_ONBOARDING_REPORT.md R3), used by screen 28 and /insights/starting-report.
import { Fragment, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarRange, Gauge, Hourglass, Lock, Plug, Repeat, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/desktop/ui/Button';
import type { OnboardingAnswers } from '@/lib/onboarding/draft';
import type { OnboardingPlan } from '@/lib/onboarding/plan';
import {
  lockedSectionNames, type Block, type Section, type SectionId, type StartingReport as Report,
} from '@/lib/onboarding/startingReport';
import { ChatPreview } from './ChatPreview';

const ICONS: Record<SectionId, LucideIcon> = {
  time: Smartphone,
  focus: Gauge,
  distractions: ShieldCheck,
  twelve: CalendarRange,
  habits: Repeat,
  countdown: Hourglass,
  ai: Plug,
};

/**
 * locked: free web users (free sections, locked sections blurred, the lock card).
 * full: Pro users, everything readable.
 * free-only: the native app, free sections only and nothing to buy.
 */
export type ReportMode = 'locked' | 'full' | 'free-only';

function ProChip() {
  return (
    <span className="inline-flex h-[18px] items-center rounded-full bg-primary-soft px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary-text">
      Pro
    </span>
  );
}

function BlockView({ block, answers, plan }: { block: Block; answers: OnboardingAnswers; plan: OnboardingPlan | null }) {
  switch (block.kind) {
    case 'paragraph':
      return block.footnote
        ? <p className="text-[12px] leading-[18px] text-ink-3">{block.text}</p>
        : <p className="text-[14px] leading-[22px] text-ink-2">{block.text}</p>;
    case 'rows':
      return (
        <ul className="flex flex-col gap-3">
          {block.rows.map((r) => (
            <li key={r.label} className="text-[14px] leading-[22px]">
              <span className="block font-semibold text-ink">{r.label}</span>
              <span className="block text-ink-2">{r.text}</span>
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <table className="w-full border-collapse text-left text-[14px] tabular-nums">
          <caption className="mb-2 text-left text-[13px] font-semibold text-ink">{block.caption}</caption>
          <thead>
            <tr className="border-b border-line text-[12px] text-ink-3">
              {block.head.map((h) => <th key={h} scope="col" className="py-1.5 pr-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]} className="border-b border-line last:border-0">
                {row.map((cell, i) => <td key={i} className="py-1.5 pr-3 text-ink">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'chat':
      return <ChatPreview answers={answers} plan={plan} animate={false} onTyped={() => {}} />;
  }
}

function SectionCard({
  section, locked, index, answers, plan,
}: {
  section: Section;
  locked: boolean;
  index: number;
  answers: OnboardingAnswers;
  plan: OnboardingPlan | null;
}) {
  const Icon = ICONS[section.id];
  const [first, ...rest] = section.blocks;
  const view = (b: Block, i: number) => <BlockView key={i} block={b} answers={answers} plan={plan} />;
  return (
    <section className="frost ob-stagger relative rounded-[20px] p-6" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft text-primary-text">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="min-w-0 flex-1 text-[17px] font-semibold leading-[24px] text-ink">{section.title}</h2>
        {locked && (
          <span className="flex shrink-0 items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-ink-3" aria-hidden />
            <ProChip />
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {locked ? (
          <>
            {first && view(first, 0)}
            {rest.length > 0 && (
              <>
                <div aria-hidden="true" className="pointer-events-none flex select-none flex-col gap-4 blur-[6px]">
                  {rest.map((b, i) => view(b, i + 1))}
                </div>
                <p className="sr-only">Locked. Included with Pro.</p>
              </>
            )}
          </>
        ) : (
          section.blocks.map(view)
        )}
      </div>
    </section>
  );
}

function LockCard({ names, onUnlock, index }: { names: string; onUnlock?: () => void; index: number }) {
  return (
    <div className="glass-strong liquid ob-stagger rounded-[20px] p-6 text-center" style={{ animationDelay: `${index * 40}ms` }}>
      <span
        aria-hidden
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] bg-primary-soft text-primary-text shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
      >
        <Lock className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-[17px] font-semibold leading-[24px] text-ink">Your full report is ready.</h2>
      <p className="mt-1.5 text-[14px] leading-[22px] text-ink-2">{names}, all built from your answers.</p>
      {onUnlock && (
        <Button variant="primary" size="lg" onClick={onUnlock} className="mt-5 w-full sm:w-auto">
          Unlock my full report
        </Button>
      )}
    </div>
  );
}

export function StartingReport({
  report, mode, answers, plan, onUnlock, header = true, before,
}: {
  report: Report;
  mode: ReportMode;
  /** For the chat preview in section 7. */
  answers: OnboardingAnswers;
  plan: OnboardingPlan | null;
  onUnlock?: () => void;
  /** Overline, title and line. Screen 28 shows these in its own frame and passes false (chips still show). */
  header?: boolean;
  /** Above the header (the back link on the in-app page). */
  before?: ReactNode;
}) {
  const sections = mode === 'free-only' ? report.sections.filter((s) => s.free) : report.sections;
  const names = lockedSectionNames(report);
  const lockAfter = mode === 'locked' && names ? sections.findIndex((s) => s.id === 'focus') : -1;

  return (
    <div className="flex flex-col gap-4">
      {before}
      {header && (
        <header>
          <p className="text-[11px] font-medium uppercase leading-[14px] tracking-[0.08em] text-ink-3">{report.overline}</p>
          <h1 className="mt-2 font-display text-[28px] leading-[34px] text-ink lg:text-[32px] lg:leading-[38px]">{report.title}</h1>
          <p className="mt-2 text-[13px] text-ink-3">{report.subtitle}</p>
        </header>
      )}
      {report.chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="About you">
          {report.chips.map((c) => (
            <li key={c} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[13px] font-medium text-ink">{c}</li>
          ))}
        </ul>
      )}
      {sections.map((s, i) => (
        <Fragment key={s.id}>
          <SectionCard section={s} locked={mode === 'locked' && !s.free} index={i} answers={answers} plan={plan} />
          {i === lockAfter && <LockCard names={names} onUnlock={onUnlock} index={i + 1} />}
        </Fragment>
      ))}
    </div>
  );
}

export default StartingReport;
