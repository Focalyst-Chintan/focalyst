'use client';
// Question panel patterns (WEB_ONBOARDING_DESIGN.md 3.5).
import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Kbd, ProgressRing } from '@/components/desktop/ui';
import { rovingKeyDown } from './useOnboardingKeys';

export interface ChoiceOption<T extends string | number = string> {
  value: T;
  label: string;
  line?: string;
  icon?: LucideIcon;
}

const focusRing = 'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]';

function OptionCard({
  label, line, icon: Icon, selected, number, square = false, onClick, tabIndex, role, children,
}: {
  label: string; line?: string; icon?: LucideIcon; selected: boolean; number: number;
  square?: boolean; onClick: () => void; tabIndex: number; role: 'radio' | 'checkbox'; children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-[14px] border transition-[background-color,border-color,transform] duration-[140ms] ${
        selected ? 'border-[1.5px] border-ring bg-primary-soft' : 'border-line bg-surface-2 hover:bg-surface-3 hover:-translate-y-px'
      }`}
    >
      <button
        type="button"
        role={role}
        aria-checked={selected}
        aria-label={`${label}${line ? `, ${line}` : ''}${selected ? ', selected' : ''}`}
        data-ob-option
        tabIndex={tabIndex}
        onClick={onClick}
        className={`flex w-full min-h-16 lg:min-h-14 items-center gap-3 rounded-[14px] px-4 py-3.5 text-left cursor-pointer ${focusRing}`}
      >
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-text">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-[20px] text-ink">{label}</span>
          {line && <span className="mt-0.5 block text-[13px] leading-[18px] text-ink-2">{line}</span>}
        </span>
        {selected ? (
          <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center bg-primary text-snow ${square ? 'rounded-[6px]' : 'rounded-full'}`}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
          </span>
        ) : square ? (
          <>
            <span className="h-[22px] w-[22px] shrink-0 rounded-[6px] border border-line-strong lg:hidden" aria-hidden />
            <span className="hidden lg:inline-flex" aria-hidden><Kbd>{number}</Kbd></span>
          </>
        ) : (
          <span className="hidden lg:inline-flex" aria-hidden><Kbd>{number}</Kbd></span>
        )}
      </button>
      {children}
    </div>
  );
}

/** Single choice: radiogroup, picking selects and (by default) advances after 250 ms. */
export function SingleChoice<T extends string | number>({
  options, value, onPick, labelledBy,
}: {
  options: ChoiceOption<T>[];
  value: T | undefined;
  onPick: (v: T) => void;
  labelledBy?: string;
}) {
  const sel = options.findIndex((o) => o.value === value);
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={rovingKeyDown} className="flex flex-col gap-2.5">
      {options.map((o, i) => (
        <OptionCard
          key={String(o.value)}
          role="radio"
          label={o.label}
          line={o.line}
          icon={o.icon}
          number={i + 1}
          selected={o.value === value}
          tabIndex={(sel === -1 ? i === 0 : i === sel) ? 0 : -1}
          onClick={() => onPick(o.value)}
        />
      ))}
    </div>
  );
}

/** Single choice cards that don't advance; the chosen card expands in place to show its follow-up. */
export function ChoiceWithFollowUp<T extends string>({
  options, value, onPick, followUp, labelledBy,
}: {
  options: ChoiceOption<T>[];
  value: T | undefined;
  onPick: (v: T) => void;
  followUp: (v: T) => ReactNode | null;
  labelledBy?: string;
}) {
  const sel = options.findIndex((o) => o.value === value);
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} onKeyDown={rovingKeyDown} className="flex flex-col gap-2.5">
      {options.map((o, i) => {
        const selected = o.value === value;
        const content = followUp(o.value);
        return (
          <OptionCard
            key={o.value}
            role="radio"
            label={o.label}
            line={o.line}
            icon={o.icon}
            number={i + 1}
            selected={selected}
            tabIndex={(sel === -1 ? i === 0 : i === sel) ? 0 : -1}
            onClick={() => onPick(o.value)}
          >
            {content && (
              <div
                className="grid transition-[grid-template-rows] duration-[220ms] ease-[var(--ease)]"
                style={{ gridTemplateRows: selected ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  {selected && <div className="px-4 pb-4">{content}</div>}
                </div>
              </div>
            )}
          </OptionCard>
        );
      })}
    </div>
  );
}

/** Multi choice chips: aria-pressed pills with a counter. */
export function Chips({
  options, value, onToggle, labelledBy,
}: {
  options: string[];
  value: string[];
  onToggle: (v: string) => void;
  labelledBy?: string;
}) {
  return (
    <div>
      <div role="group" aria-labelledby={labelledBy} onKeyDown={rovingKeyDown} className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              aria-label={`${o}${on ? ', selected' : ''}`}
              data-ob-option
              tabIndex={i === 0 ? 0 : -1}
              onClick={() => onToggle(o)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors duration-[140ms] cursor-pointer ${focusRing} ${
                on ? 'border-transparent bg-primary text-snow' : 'border-line bg-surface-2 text-ink hover:bg-surface-3'
              }`}
            >
              {on && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
              {o}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] text-ink-3" aria-live="polite">{value.length} selected</p>
    </div>
  );
}

/** Multi choice cards with a square check and an enforced maximum. */
export function MultiCards({
  options, value, onChange, max, labelledBy, followUp,
}: {
  options: ChoiceOption<string>[];
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
  labelledBy?: string;
  /** Shown inside a selected card (screen 15 "Something else" opens an inline field). */
  followUp?: (v: string) => ReactNode | null;
}) {
  const [shake, setShake] = useState(0);
  const toggle = (v: string) => {
    if (value.includes(v)) return onChange(value.filter((x) => x !== v));
    if (value.length >= max) return setShake((n) => n + 1);
    onChange([...value, v]);
  };
  return (
    <div>
      <div
        key={shake}
        role="group"
        aria-labelledby={labelledBy}
        onKeyDown={rovingKeyDown}
        className={`flex flex-col gap-2.5 ${shake ? 'ob-shake' : ''}`}
      >
        {options.map((o, i) => (
          <OptionCard
            key={o.value}
            role="checkbox"
            square
            label={o.label}
            line={o.line}
            icon={o.icon}
            number={i + 1}
            selected={value.includes(o.value)}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => toggle(o.value)}
          >
            {followUp && value.includes(o.value) ? <div className="px-4 pb-4">{followUp(o.value)}</div> : null}
          </OptionCard>
        ))}
      </div>
      {shake > 0 && <p className="mt-3 text-[13px] text-ink-2" role="status">You can pick up to {max}</p>}
    </div>
  );
}

const fieldClass =
  'w-full rounded-[14px] border border-line bg-surface-2 px-4 text-ink placeholder:text-ink-3 transition-shadow focus:outline-none focus:border-transparent focus:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]';

/** One large text input. Enter = Continue (handled by useOnboardingKeys). */
export const TextField = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { className = '', ...props }, ref
) {
  return <input ref={ref} type="text" className={`${fieldClass} h-[60px] lg:h-14 text-[18px] font-medium ${className}`} {...props} />;
});

function hoursLabel(v: number) {
  if (v >= 10) return '10+';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Screen 11 slider: 1 to 10 in 0.5 steps, unpicked until the first move. */
export function PhoneHoursSlider({
  value, onChange, labelledBy,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  labelledBy?: string;
}) {
  const picked = value !== undefined;
  const v = value ?? 4;
  const fill = ((v - 1) / 9) * 100;
  const unit = v === 1 ? 'hour' : 'hours';
  return (
    <div>
      <div className="flex items-baseline gap-2" aria-hidden>
        <span className={`font-ui text-[64px] leading-[68px] font-semibold tabular-nums tracking-[-0.02em] ${picked ? 'text-ink' : 'text-ink-3'}`}>
          {hoursLabel(v)}
        </span>
        <span className={`text-[20px] font-medium ${picked ? 'text-ink-2' : 'text-ink-3'}`}>{unit}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={0.5}
        value={v}
        aria-labelledby={labelledBy}
        aria-valuetext={`${hoursLabel(v)} ${unit}${picked ? '' : ', not set yet'}`}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => {
          // The first arrow press counts as a move, even at the starting value.
          if (!picked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !e.altKey) {
            e.preventDefault();
            const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.5 : 0.5;
            onChange(Math.min(10, Math.max(1, v + d)));
          }
        }}
        onPointerDown={() => { if (!picked) onChange(v); }}
        className="ob-range mt-6"
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      <div className="mt-2 flex justify-between text-[12px] text-ink-3 tabular-nums" aria-hidden>
        <span>1</span><span>4</span><span>7</span><span>10+</span>
      </div>
    </div>
  );
}

/** Time: suggestion chips, then a native time input. */
export function TimeField({
  suggestions, value, onChange, formatLabel, labelledBy,
}: {
  suggestions: string[];
  value: string | undefined;
  onChange: (v: string) => void;
  formatLabel: (hhmm: string) => string;
  labelledBy?: string;
}) {
  return (
    <div>
      <div role="group" aria-labelledby={labelledBy} onKeyDown={rovingKeyDown} className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => {
          const on = value === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              data-ob-option
              tabIndex={i === 0 ? 0 : -1}
              onClick={() => onChange(s)}
              className={`inline-flex h-10 items-center rounded-full border px-4 text-[14px] font-medium tabular-nums cursor-pointer ${focusRing} ${
                on ? 'border-transparent bg-primary text-snow' : 'border-line bg-surface-2 text-ink hover:bg-surface-3'
              }`}
            >
              {formatLabel(s)}
            </button>
          );
        })}
      </div>
      <input
        type="time"
        value={value ?? ''}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-labelledby={labelledBy}
        className={`${fieldClass} mt-4 h-14 text-[16px] tabular-nums`}
      />
    </div>
  );
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date: a native date input, min today, max 10 years ahead. */
export const DateField = forwardRef<
  HTMLInputElement,
  { value: string | undefined; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>
>(function DateField({ value, onChange, ...props }, ref) {
  // The flow renders only after mount, so reading the clock here is safe.
  const [bounds] = useState(() => {
    const now = new Date();
    const max = new Date(now);
    max.setFullYear(now.getFullYear() + 10);
    return { min: ymd(now), max: ymd(max) };
  });
  return (
    <input
      ref={ref}
      type="date"
      value={value ?? ''}
      min={bounds?.min}
      max={bounds?.max}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldClass} h-14 text-[16px] tabular-nums`}
      {...props}
    />
  );
});

/** Statement: display serif title, one body line, optional visual. Centred on phones, left on desktop. */
export const Statement = forwardRef<HTMLHeadingElement, { title: string; line?: ReactNode; id?: string; children?: ReactNode }>(
  function Statement({ title, line, id, children }, ref) {
    return (
      <div className="text-center lg:text-left">
        <h1
          ref={ref}
          id={id}
          tabIndex={-1}
          className="font-display text-[44px] leading-[48px] tracking-[-0.015em] text-ink outline-none"
        >
          {title}
        </h1>
        {line && <p className="mt-3 text-[14px] leading-[22px] text-ink-2">{line}</p>}
        {children}
      </div>
    );
  }
);

/** Loader: a checklist that ticks in sequence, with a ProgressRing (3.7: 4 × 700 ms, hard cap 3.5 s). */
export function Loader({
  lines, stepMs = 700, capMs = 3500, ready = true, onDone,
}: {
  lines: string[];
  stepMs?: number;
  capMs?: number;
  /** The real work behind the loader is finished. */
  ready?: boolean;
  onDone: () => void;
}) {
  const [done, setDone] = useState(0);
  const [capped, setCapped] = useState(false);
  const fired = useRef(false);
  const id = useId();

  useEffect(() => {
    const timers = lines.map((_, i) => window.setTimeout(() => setDone(i + 1), stepMs * (i + 1)));
    const cap = window.setTimeout(() => setCapped(true), capMs);
    return () => { timers.forEach(clearTimeout); clearTimeout(cap); };
  }, [lines, stepMs, capMs]);

  useEffect(() => {
    if (fired.current) return;
    if ((done >= lines.length && ready) || capped) { fired.current = true; onDone(); }
  }, [done, ready, capped, lines.length, onDone]);

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
      <ProgressRing progress={(done / lines.length) * 100} size={88} strokeWidth={6}>
        <span className="text-[15px] font-semibold tabular-nums text-ink">{Math.round((done / lines.length) * 100)}%</span>
      </ProgressRing>
      <ul className="flex flex-col gap-3" aria-labelledby={id}>
        {lines.map((l, i) => {
          const ok = i < done;
          return (
            <li key={l} className={`flex items-center gap-3 text-[15px] ${ok ? 'text-ink' : 'text-ink-3'}`}>
              <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${ok ? 'bg-primary text-snow' : 'border border-line-strong'}`}>
                {ok && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
              </span>
              {l}
            </li>
          );
        })}
      </ul>
      <span id={id} className="sr-only">Progress</span>
    </div>
  );
}
