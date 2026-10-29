'use client';
// Screen 30, the paywall (WEB_ONBOARDING_DESIGN.md 9, WEB_ONBOARDING_REPORT.md R6). Never rendered inside the native app.
import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { IconButton, Skeleton, useToast } from '@/components/desktop/ui';
import { isNativeApp, startCheckout, type PlanKey } from '@/lib/billing/checkout';
import { PRICES, useCurrency } from '@/lib/billing/useCurrency';
import type { OnboardingPostState } from '@/lib/onboarding/draft';
import { SHOW_NO_PAYMENT_TODAY } from '@/lib/onboarding/flags';
import { StepFrame } from './OnboardingStage';
import { rovingKeyDown, useOnboardingKeys } from './useOnboardingKeys';

type Prices = (typeof PRICES)[keyof typeof PRICES];

/** "₹2,999" → 2999, "$39.99" → 39.99. */
function amount(price: string): number {
  return Number(price.replace(/[^0-9.]/g, '')) || 0;
}

/** The currency symbol as PRICES writes it ("₹", "$"), never "INR". */
function symbol(price: string): string {
  return price.match(/^[^0-9]+/)?.[0] ?? '';
}

function perMonth(p: Prices): string {
  const v = amount(p.yearly) / 12;
  const whole = !p.yearly.includes('.');
  const lang = typeof navigator !== 'undefined' ? navigator.language : undefined;
  const n = new Intl.NumberFormat(lang, whole ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(whole ? Math.round(v) : Math.floor(v * 100) / 100);
  return `${symbol(p.yearly)}${n}`;
}

/** 1 − yearly ÷ (monthly × 12), as a whole percent. Shown only at 10% or more. */
export function yearlySavePercent(p: Prices): number {
  const m = amount(p.monthly) * 12;
  if (!m) return 0;
  return Math.round((1 - amount(p.yearly) / m) * 100);
}

const DESKTOP_ORDER: PlanKey[] = ['monthly', 'yearly', 'lifetime'];
const PHONE_ORDER: PlanKey[] = ['yearly', 'monthly', 'lifetime'];

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
}

function PriceText({ value, className = '' }: { value: string | null; className?: string }) {
  if (value === null) return <Skeleton className={`inline-block h-7 w-28 align-middle ${className}`} aria-label="Loading price" />;
  return <span className={className}>{value}</span>;
}

const SOLID_CHIP = 'rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-snow';
const SOFT_CHIP = 'rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary-text';

function PlanCard({
  plan, selected, onPick, tabIndex, prices, trialDays, number,
}: {
  plan: PlanKey;
  selected: boolean;
  onPick: () => void;
  tabIndex: number;
  prices: Prices | null;
  trialDays: number;
  number: number;
}) {
  const save = prices ? yearlySavePercent(prices) : 0;
  const title = plan === 'monthly' ? 'Monthly' : plan === 'yearly' ? 'Yearly' : 'Lifetime';
  const price = !prices
    ? null
    : plan === 'monthly' ? `${prices.monthly} a month` : plan === 'yearly' ? `${prices.yearly} a year` : `${prices.lifetime} once`;
  const line =
    plan === 'yearly'
      ? prices
        ? trialDays > 0
          ? `${trialDays} days free, then ${perMonth(prices)} a month, billed yearly`
          : `${perMonth(prices)} a month`
        : null
      : plan === 'lifetime' ? 'One payment. Yours for good.' : '';

  return (
    <button
      type="button"
      role="radio"
      data-ob-option
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onPick}
      className={`frost relative flex min-h-[132px] w-full flex-col items-start rounded-[20px] p-6 text-left transition-[transform,background-color] duration-[220ms] cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
        selected ? 'border-2 border-ring bg-primary-soft' : 'border-2 border-transparent hover:-translate-y-px'
      } ${plan === 'yearly' ? 'order-first lg:order-none' : ''}`}
    >
      <span className="flex w-full items-center gap-2">
        <span className="text-[15px] font-semibold text-ink">{title}</span>
        <span className="hidden text-[11px] text-ink-3 lg:inline" aria-hidden>{number}</span>
        {selected && (
          <span aria-hidden className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary text-snow">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
      {plan === 'yearly' && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {trialDays > 0 ? (
            <>
              <span className={SOLID_CHIP}>{trialDays} days free</span>
              <span className={SOFT_CHIP}>Best value</span>
            </>
          ) : (
            <span className={SOLID_CHIP}>Best value</span>
          )}
          {save >= 10 && <span className={SOFT_CHIP}>Save {save}%</span>}
        </span>
      )}
      <PriceText value={price} className="mt-3 text-[20px] font-semibold tabular-nums text-ink" />
      {line === null ? (
        <Skeleton className="mt-1.5 h-4 w-24" />
      ) : line ? (
        <span className="mt-1 text-[13px] text-ink-2">{line}</span>
      ) : null}
    </button>
  );
}

/** Yearly with a trial: 3 small steps, one row on desktop, stacked on phones (R6.2). */
function TrialTimeline({ days, yearly }: { days: number; yearly: string | null }) {
  const steps: { when: string; what: string | null }[] = [
    { when: 'Today', what: 'Full Pro access' },
    { when: `Before day ${days}`, what: 'Cancel anytime from Settings › Pro' },
    { when: `Day ${days}`, what: yearly ? `${yearly} a year starts` : null },
  ];
  return (
    <ol className="flex flex-col gap-3 lg:flex-row lg:gap-6" aria-label="Your free trial">
      {steps.map((s, i) => (
        <li key={s.when} className="flex flex-1 items-start gap-2.5">
          <span aria-hidden className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${i === 0 ? 'bg-primary' : 'border-2 border-line-strong bg-surface'}`} />
          <span className="text-[13px] leading-[18px]">
            <span className="block font-semibold text-ink">{s.when}</span>
            {s.what === null ? <Skeleton className="mt-1 h-3.5 w-24" /> : <span className="block text-ink-2">{s.what}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** "Also with Pro" (R6.1), with its conditions. */
function alsoWithPro(post: OnboardingPostState): string[] {
  const list: string[] = [];
  const ideal = post.plan?.idealMinutes ?? (post.plan && post.plan.minutes > 25 ? post.plan.minutes : null);
  if (ideal && ideal > 25) list.push(`${ideal}-minute sessions, matched to how you focus`);
  const cd = post.answers?.countdown;
  if (post.countdownPending && cd?.name) list.push(`Your ${cd.name} countdown on your plan now`);
  list.push('Claude and ChatGPT, connected to your plan');
  list.push('More habits, notes and countdowns');
  list.push('More Focalyst AI messages every day');
  list.push('The detailed Catalyst weekly report');
  return list;
}

export function PaywallScreen({
  post, trialDays, onLeave, onAlreadyPro, onClose,
}: {
  post: OnboardingPostState;
  trialDays: number;
  /** 9.3: step 30 and checkoutPending are saved before leaving for Polar. */
  onLeave: (plan: PlanKey) => void;
  onAlreadyPro: () => void;
  /** Close: on to 31 or 32 on the free plan. */
  onClose: () => void;
}) {
  const titleId = useId();
  const currency = useCurrency();
  const prices = currency ? PRICES[currency] : null;
  const toast = useToast();
  const desktop = useDesktop();
  const [plan, setPlan] = useState<PlanKey>(
    post.checkoutPending === 'monthly' || post.checkoutPending === 'lifetime' ? post.checkoutPending : 'yearly'
  );
  const [busy, setBusy] = useState(false);
  const order = desktop ? DESKTOP_ORDER : PHONE_ORDER;
  const trial = plan === 'yearly' && trialDays > 0;

  const buy = async () => {
    if (busy || isNativeApp()) return;
    setBusy(true);
    onLeave(plan);
    // The trial comes from the Polar product itself; checkout is the same call either way.
    const r = await startCheckout(plan);
    if (r.ok || r.code === 'auth') return; // leaving the site
    if (r.code === 'already_pro') {
      onAlreadyPro();
      return;
    }
    setBusy(false);
    toast.show(r.message || 'Could not open checkout. Please try again.', 'error');
  };

  const label = busy
    ? 'Opening checkout'
    : plan === 'lifetime'
      ? 'Get lifetime'
      : trial
        ? `Start my ${trialDays}-day free trial`
        : 'Continue';
  const primary = { label, onClick: buy, disabled: busy || !prices };

  useOnboardingKeys({
    canContinue: !primary.disabled,
    onEnter: buy,
    optionCount: 3,
    onPick: (i) => { if (order[i]) setPlan(order[i]); },
  });

  if (isNativeApp()) return null;

  const legal =
    plan === 'lifetime'
      ? 'One-time payment. No subscription.'
      : trial
        ? prices ? `${trialDays} days free, then ${prices.yearly} a year. Renews automatically. Cancel anytime from Settings › Pro before the trial ends.` : null
        : 'Renews automatically. Cancel any time from Settings › Pro.';

  return (
    <StepFrame
      wide
      titleId={titleId}
      title="Unlock your full report."
      subtitle="Your full plan, and everything else in Pro."
      primary={primary}
      showBack={false}
      onBack={() => {}}
      direction="fwd"
      footerNote={trial && SHOW_NO_PAYMENT_TODAY ? `No payment today. Cancel anytime before day ${trialDays}.` : undefined}
      eyebrow={
        <div className="-ml-2 mb-4">
          <IconButton label="Close" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>
      }
      body={
        <div className="flex flex-col gap-5">
          <div
            role="radiogroup"
            aria-labelledby={titleId}
            onKeyDown={rovingKeyDown}
            className="flex flex-col gap-3 lg:grid lg:grid-cols-3"
          >
            {DESKTOP_ORDER.map((p) => (
              <PlanCard
                key={p}
                plan={p}
                selected={plan === p}
                onPick={() => setPlan(p)}
                tabIndex={plan === p ? 0 : -1}
                prices={prices}
                trialDays={trialDays}
                number={order.indexOf(p) + 1}
              />
            ))}
          </div>
          {trial && <TrialTimeline days={trialDays} yearly={prices?.yearly ?? null} />}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">Also with Pro</p>
            <ul className="grid gap-1.5 lg:grid-cols-2">
              {alsoWithPro(post).map((t) => (
                <li key={t} className="flex gap-2 text-[14px] leading-[20px] text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1 text-[12px] leading-[18px] text-ink-2">
            <p>Final price and any taxes are shown at checkout.</p>
            {legal === null ? <Skeleton className="h-4 w-64" /> : <p>{legal}</p>}
            <p className="mt-2">
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <span aria-hidden> · </span>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            </p>
          </div>
        </div>
      }
    />
  );
}

export default PaywallScreen;
