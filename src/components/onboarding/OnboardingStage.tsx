'use client';
// Desktop split stage, wide mode and phone layout (WEB_ONBOARDING_DESIGN.md 3.1, 3.2), switched with lg: classes.
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, Check, ChevronLeft } from 'lucide-react';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { Button, Kbd } from '@/components/desktop/ui';
import { CHAPTERS, chapterOf, type FlowState } from '@/lib/onboarding/steps';
import { ProgressBar } from './ProgressBar';
import './onboarding.css';

function ChapterList({ step }: { step: number }) {
  const current = chapterOf(step);
  return (
    <ol className="flex flex-col gap-2" aria-label="Chapters">
      {CHAPTERS.map((c, i) => (
        <li
          key={c.name}
          aria-current={i === current ? 'step' : undefined}
          className={`flex items-center gap-2 text-[13px] leading-[18px] ${
            i < current ? 'text-snow/70' : i === current ? 'font-semibold text-snow' : 'text-snow/40'
          }`}
        >
          {i < current ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="h-3.5 w-3.5" aria-hidden />}
          {c.name}
        </li>
      ))}
    </ol>
  );
}

export function OnboardingStage({
  step, flow, wide = false, showBack, onBack, planPanel, children,
}: {
  step: number;
  flow: FlowState;
  wide?: boolean;
  showBack: boolean;
  onBack: () => void;
  /** Desktop plan panel middle: a visual on chapter 1, <PlanPreview/> afterwards. */
  planPanel: ReactNode;
  children: ReactNode;
}) {
  const chapter = CHAPTERS[chapterOf(step)];
  return (
    <div className="relative min-h-dvh font-ui text-ink">
      <AmbientBackground />
      <div className="relative z-10 flex min-h-dvh flex-col lg:items-center lg:justify-center lg:p-8">
        <div
          className={`flex w-full flex-1 flex-col lg:max-w-[1120px] lg:flex-none lg:h-[min(760px,calc(100dvh-64px))] lg:overflow-hidden lg:rounded-[28px] lg:glass-strong lg:liquid ${
            wide ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:max-[1179px]:grid-cols-[380px_minmax(0,1fr)]'
          }`}
        >
          {!wide && (
            <aside className="ob-brand relative hidden min-h-0 flex-col overflow-hidden p-12 text-snow lg:flex" aria-label="Your plan">
              <div className="ambient-grain pointer-events-none" aria-hidden />
              <p className="relative shrink-0 text-[13px] font-semibold tracking-[0.32em] text-snow">FOCALYST</p>
              <div className="relative my-6 flex min-h-0 flex-1 flex-col">{planPanel}</div>
              <div className="relative shrink-0"><ChapterList step={step} /></div>
            </aside>
          )}

          <section className={`relative flex min-h-0 flex-1 flex-col ${wide ? 'ob-wide' : 'lg:bg-surface'}`}>
            {/* Phone top bar */}
            <header className="glass sticky top-0 z-20 flex h-14 items-center gap-3 rounded-none border-x-0 border-t-0 px-5 lg:hidden">
              {showBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back"
                  className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-2 cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
              <ProgressBar step={step} flow={flow} />
            </header>

            {/* Desktop top: chapter label and progress */}
            <div className="hidden px-14 pt-14 lg:block">
              <p className="mb-3 text-[11px] font-medium uppercase leading-[14px] tracking-[0.08em] text-ink-3">{chapter.label}</p>
              <ProgressBar step={step} flow={flow} className="max-w-[440px]" />
            </div>

            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Plan panel middle for <PlanPreview/>: scrolls inside with a hidden scrollbar and a 24 px fade at the bottom edge. */
export function PlanPanelScroll({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
      <div className="flex min-h-full flex-col">
        <div className="my-auto">{children}</div>
      </div>
    </div>
  );
}

export interface FooterAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Secondary button only: ghost by default (screen 32 uses a secondary one). */
  variant?: 'ghost' | 'secondary';
}

function FooterButtons({
  primary, secondary, showBack, onBack, phoneInline, secondaryStart = false,
}: {
  primary: FooterAction | null;
  secondary?: FooterAction | null;
  showBack: boolean;
  onBack: () => void;
  phoneInline?: boolean;
  /** Desktop: the secondary sits on the left; phones: a text link above the primary (screen 28). */
  secondaryStart?: boolean;
}) {
  const start = secondaryStart && secondary ? secondary : null;
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-2 lg:mx-0 lg:max-w-none lg:flex-row lg:items-center">
      {!phoneInline && (
        <div className="hidden lg:mr-auto lg:block">
          {showBack && (
            <Button variant="ghost" size="lg" onClick={onBack} icon={<ArrowLeft className="h-4 w-4" aria-hidden />}>
              Back
            </Button>
          )}
          {start && (
            <Button variant={start.variant ?? 'ghost'} size="lg" onClick={start.onClick} disabled={start.disabled}>
              {start.label}
            </Button>
          )}
        </div>
      )}
      {start && (
        <button
          type="button"
          onClick={start.onClick}
          disabled={start.disabled}
          className="mx-auto rounded-[8px] px-2 py-1.5 text-[14px] font-medium text-ink-2 hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] lg:hidden"
        >
          {start.label}
        </button>
      )}
      {secondary && !start && (
        <Button variant={secondary.variant ?? 'ghost'} size="lg" onClick={secondary.onClick} disabled={secondary.disabled} className="order-2 w-full lg:order-none lg:w-auto">
          {secondary.label}
        </Button>
      )}
      {primary && (
        <Button
          variant="primary"
          size="lg"
          onClick={primary.onClick}
          disabled={primary.disabled}
          className="order-1 h-[52px] w-full rounded-full lg:order-none lg:h-12 lg:w-auto lg:min-w-[180px] lg:rounded-[14px]"
        >
          {primary.label}
          <span className="hidden opacity-70 lg:inline-flex" aria-hidden><Kbd className="border-snow/30 bg-transparent text-snow shadow-none">Enter</Kbd></span>
        </Button>
      )}
    </div>
  );
}

/**
 * One step's content: optional notice, title, subtitle, body and the footer row.
 * Focus moves to the title on mount (3.6), unless the screen focuses its own field.
 */
export function StepFrame({
  titleId, title, subtitle, statement = false, notice, body, primary, secondary, showBack, onBack,
  inlineFooterOnPhone = false, focusTitle = true, direction, desktopExtra, eyebrow, wide = false, overline, overlineTitle = false, centered = false, aside,
  readingWidth = false, scrollFade = false, secondaryStart = false, footerNote,
}: {
  /** Desktop reading width 560 instead of 440 (screen 28). */
  readingWidth?: boolean;
  /** Desktop: hidden scrollbar and a 24 px fade under the top bar (screen 28). */
  scrollFade?: boolean;
  secondaryStart?: boolean;
  /** A short line above the footer buttons (the paywall's "No payment today"). */
  footerNote?: ReactNode;
  titleId: string;
  title: string;
  subtitle?: ReactNode;
  statement?: boolean;
  notice?: string | null;
  body?: ReactNode;
  primary: FooterAction | null;
  secondary?: FooterAction | null;
  showBack: boolean;
  onBack: () => void;
  /** Text-input screens: on phones the button sits right under the field (3.2). */
  inlineFooterOnPhone?: boolean;
  focusTitle?: boolean;
  direction: 'fwd' | 'back';
  desktopExtra?: ReactNode;
  /** Shown above the title (the phone wordmark on screen 1). */
  eyebrow?: ReactNode;
  /** Wide mode (3.1): full panel width on desktop, a full-width card on phones. */
  wide?: boolean;
  /** Micro label above the title (screen 24). */
  overline?: string;
  /** The title itself is the micro overline (screen 23, where the hero number leads). */
  overlineTitle?: boolean;
  /** Wide mode only: a centred 520 px column (screen 25). */
  centered?: boolean;
  /** Wide mode only: a visual on the right on desktop, above the title on phones (screen 26). */
  aside?: ReactNode;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus({ preventScroll: true });
  }, [focusTitle]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Only the content slides; the footer stays put (a transform would break its fixed position on phones). */}
      <div
        className={`${direction === 'fwd' ? 'ob-step-fwd' : 'ob-step-back'} flex-1 px-5 pt-5 lg:overflow-y-auto lg:px-14 lg:pb-6 lg:pt-8 ${
          scrollFade ? 'lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden lg:[mask-image:linear-gradient(to_bottom,transparent,black_24px)] ' : ''
        }${
          inlineFooterOnPhone ? 'pb-10' : 'pb-[calc(140px+env(safe-area-inset-bottom))]'
        }`}
      >
        <div
          className={`${
            wide
              ? `mx-auto w-full max-lg:glass max-lg:rounded-[20px] max-lg:p-5 ${centered ? 'lg:max-w-[520px]' : 'lg:max-w-none'}`
              : `mx-auto w-full lg:mx-0 ${readingWidth ? 'max-w-[560px]' : 'max-w-[440px]'}`
          }${aside ? ' flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12' : ''}`}
        >
          {aside && <div className="order-first lg:order-none lg:col-start-2 lg:row-start-1">{aside}</div>}
          <div className={aside ? 'min-w-0 lg:col-start-1 lg:row-start-1' : 'contents'}>
          {eyebrow}
          {notice && <p className="ob-greet mb-3 text-[14px] font-medium text-primary-text" role="status">{notice}</p>}
          {overline && !overlineTitle && (
            <p className="mb-2 text-[11px] font-medium uppercase leading-[14px] tracking-[0.08em] text-ink-3">{overline}</p>
          )}
          {overlineTitle ? (
            <h1 ref={titleRef} id={titleId} tabIndex={-1} className="text-[11px] font-medium uppercase leading-[14px] tracking-[0.08em] text-ink-3 outline-none">
              {title}
            </h1>
          ) : statement ? (
            <div className="text-center lg:text-left">
              <h1 ref={titleRef} id={titleId} tabIndex={-1} className="font-display text-[44px] leading-[48px] tracking-[-0.015em] text-ink outline-none">
                {title}
              </h1>
              {subtitle && <p className="mt-3 text-[14px] leading-[22px] text-ink-2">{subtitle}</p>}
            </div>
          ) : (
            <>
              <h1 ref={titleRef} id={titleId} tabIndex={-1} className={`font-display text-[28px] leading-[34px] text-ink outline-none lg:text-[32px] lg:leading-[38px] ${centered ? 'text-center' : ''}`}>
                {title}
              </h1>
              {subtitle && <p className="mt-2 text-[14px] leading-[22px] text-ink-2">{subtitle}</p>}
            </>
          )}
          {desktopExtra && <div className="hidden lg:block">{desktopExtra}</div>}
          {body && <div className="mt-6">{body}</div>}
          {inlineFooterOnPhone && (
            <div className="mt-6 lg:hidden">
              <FooterButtons primary={primary} secondary={secondary} showBack={showBack} onBack={onBack} phoneInline />
            </div>
          )}
          </div>
        </div>
      </div>

      <div
        className={`${inlineFooterOnPhone ? 'hidden lg:block' : 'fixed inset-x-0 bottom-0 z-20'} bg-[linear-gradient(to_bottom,transparent,var(--canvas)_32px)] px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-8 lg:static lg:bg-none lg:px-14 lg:pb-10 lg:pt-4`}
      >
        {footerNote && (
          <p className="mx-auto mb-2 max-w-[440px] text-center text-[13px] leading-[18px] text-ink-2 lg:mx-0 lg:max-w-none lg:text-right">{footerNote}</p>
        )}
        <FooterButtons primary={primary} secondary={secondary} showBack={showBack} onBack={onBack} secondaryStart={secondaryStart} />
      </div>
    </div>
  );
}

export default OnboardingStage;
