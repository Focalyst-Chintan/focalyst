'use client';
// Screen 26: a phone frame with widget mock-ups built only from the user's answers. Tap to try; nothing is saved.
// Loaded with next/dynamic.
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { OnboardingAnswers } from '@/lib/onboarding/draft';
import type { OnboardingPlan } from '@/lib/onboarding/plan';
import { daysUntil } from './copy';

const widget = 'rounded-[22px] border border-snow/10 bg-snow/10 p-3 text-snow backdrop-blur-md';

function CheckButton({ label, size = 22 }: { label: string; size?: number }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={`flex shrink-0 items-center justify-center rounded-full border transition-colors duration-[140ms] cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ring)] ${
        on ? 'border-transparent bg-primary text-snow' : 'border-snow/40 text-transparent'
      }`}
      style={{ width: size, height: size }}
    >
      <Check className="h-3/5 w-3/5" strokeWidth={3} aria-hidden />
    </button>
  );
}

function TimerWidget({ minutes }: { minutes: number }) {
  const [started, setStarted] = useState(false);
  return (
    <div className={`${widget} flex aspect-square flex-col justify-between`}>
      <p className="text-[11px] font-medium text-snow/70">Focus</p>
      <p className="text-[28px] font-semibold leading-none tabular-nums">{String(minutes).padStart(2, '0')}:00</p>
      <button
        type="button"
        onClick={() => setStarted(true)}
        className={`h-7 rounded-full bg-primary px-3 text-[12px] font-semibold text-snow cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ring)] ${started ? 'ob-pulse' : ''}`}
      >
        {started ? 'Started' : 'Start'}
      </button>
    </div>
  );
}

function HabitWidget({ icon, name }: { icon: string; name: string }) {
  return (
    <div className={`${widget} flex aspect-square flex-col justify-between`}>
      <span className="text-[22px] leading-none" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-semibold leading-[16px]">{name}</p>
        <p className="mt-0.5 text-[11px] leading-[14px] text-snow/70">Start your streak</p>
      </div>
      <div className="flex justify-end"><CheckButton label={`Log ${name}`} size={28} /></div>
    </div>
  );
}

function TodoWidget({ tasks }: { tasks: string[] }) {
  return (
    <div className={`${widget} col-span-2`}>
      <p className="text-[12px] font-semibold">Tomorrow</p>
      <ul className="mt-2 flex flex-col gap-2">
        {tasks.map((t, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckButton label={`Tick off ${t}`} size={18} />
            <span className="min-w-0 truncate text-[12px] leading-[16px]">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountdownWidget({ name, days, pending }: { name: string; days: number; pending: boolean }) {
  return (
    <div className={`${widget} flex aspect-square flex-col justify-between`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[14px]" aria-hidden>⏳</span>
        {pending && (
          <span className="rounded-full bg-snow/15 px-1.5 text-[9px] font-semibold uppercase leading-[16px] tracking-[0.06em]">Pro</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[26px] font-semibold leading-none tabular-nums">{days}</p>
        <p className="mt-1 text-[11px] text-snow/70">{days === 1 ? 'day' : 'days'}</p>
      </div>
      <p className="truncate text-[12px] font-medium">{name}</p>
    </div>
  );
}

function DateWidget() {
  const [now] = useState(() => new Date());
  const lang = typeof navigator !== 'undefined' ? navigator.language : undefined;
  const fmt = (o: Intl.DateTimeFormatOptions) => {
    try { return new Intl.DateTimeFormat(lang, o).format(now); } catch { return ''; }
  };
  return (
    <div className={`${widget} flex aspect-square flex-col justify-between`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-snow/70">{fmt({ weekday: 'long' })}</p>
      <p className="text-[40px] font-semibold leading-none tabular-nums">{now.getDate()}</p>
      <p className="text-[12px] font-medium">{fmt({ month: 'long' })}</p>
    </div>
  );
}

export default function WidgetPreview({
  answers, plan, isPro,
}: {
  answers: OnboardingAnswers;
  plan: OnboardingPlan | null;
  isPro: boolean;
}) {
  const habit = answers.habits?.[0];
  const tasks = (answers.tasks ?? []).slice(0, 3);
  const days = answers.countdown ? daysUntil(answers.countdown.date) : null;
  const countdown = answers.countdown && days !== null && days >= 0 ? { name: answers.countdown.name, days } : null;
  // The timer always has data (the plan's rhythm). Fewer than 3 widgets with data adds the date widget.
  const withData = 1 + (habit ? 1 : 0) + (tasks.length ? 1 : 0) + (countdown ? 1 : 0);

  return (
    <div
      className="ob-phone-screen relative h-[500px] w-[244px] shrink-0 overflow-hidden rounded-[44px] border border-line-strong p-3 shadow-[0_24px_60px_-20px_rgba(3,25,91,0.45)]"
      role="group"
      aria-label="Widget preview"
    >
      <div className="ob-phone-notch mx-auto mt-1 h-6 w-24 rounded-full" aria-hidden />
      <div className="mt-3 flex justify-center">
        <span className="rounded-full bg-snow/15 px-2.5 py-0.5 text-[11px] font-semibold text-snow">Preview</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 px-1">
        <TimerWidget minutes={plan?.preset.focusMinutes ?? 25} />
        {habit && <HabitWidget icon={habit.icon} name={habit.name} />}
        {tasks.length > 0 && <TodoWidget tasks={tasks} />}
        {countdown && (
          <CountdownWidget name={countdown.name} days={countdown.days} pending={countdown.days > 90 && !isPro} />
        )}
        {withData < 3 && <DateWidget />}
      </div>
    </div>
  );
}
