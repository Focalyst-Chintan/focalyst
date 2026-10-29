'use client';
// Screen 28 chat preview: a reply built only from the user's answers, typed in once.
import { useEffect, useMemo, useState } from 'react';
import { Plug } from 'lucide-react';
import type { OnboardingAnswers } from '@/lib/onboarding/draft';
import { rhythmFor, type OnboardingPlan } from '@/lib/onboarding/plan';
import { daysUntil, formatNumber, formatTime } from './copy';

const TYPE_MS = 1200;

function lowerFirst(s: string) {
  // "Read 20 minutes" → "read 20 minutes"; leaves "NEET prep" alone.
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function daysText(days: number) {
  return `${formatNumber(days, 0)} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * "You have {task 1}{ and {n} more} for tomorrow. Start with {task 1} in a {minutes}-minute session,
 * then tick off {habit}. {countdown name} is {days} days away." Skipped parts are dropped.
 */
export function chatReply(a: OnboardingAnswers, plan?: OnboardingPlan | null): string {
  const minutes = plan?.minutes ?? rhythmFor(a.focus_drift_minutes ?? 25, false).minutes;
  const tasks = (a.tasks ?? []).map((t) => t.trim()).filter(Boolean);
  const habit = a.habits?.[0]?.name?.trim();
  const cd = a.countdown;
  const days = cd ? daysUntil(cd.date) : null;
  const hasCountdown = Boolean(cd?.name && days !== null && days >= 0);

  if (!tasks.length && !habit && !hasCountdown) {
    const g = (a.daily_focus_goal_minutes ?? 120) / 60;
    const goal = `${formatNumber(g)} ${g === 1 ? 'hour' : 'hours'}`;
    const time = a.reminder_time ? ` at ${formatTime(a.reminder_time)}` : '';
    return `Your goal is ${goal} of focus a day. Start with one ${minutes}-minute session${time}.`;
  }

  const parts: string[] = [];
  const then = habit ? `, then tick off ${lowerFirst(habit)}` : '';
  if (tasks.length) {
    const more = tasks.length > 1 ? ` and ${tasks.length - 1} more` : '';
    parts.push(`You have ${tasks[0]}${more} for tomorrow.`);
    parts.push(`Start with ${tasks[0]} in a ${minutes}-minute session${then}.`);
  } else if (habit) {
    parts.push(`Start with a ${minutes}-minute session${then}.`);
  }
  if (hasCountdown && cd && days !== null) {
    parts.push(days === 0 ? `${cd.name} is today.` : `${cd.name} is ${daysText(days)} away.`);
  }
  return parts.join(' ');
}

function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export function ChatPreview({
  answers, plan, animate, onTyped,
}: {
  answers: OnboardingAnswers;
  plan?: OnboardingPlan | null;
  /** False once the reply has typed in, so it never replays. */
  animate: boolean;
  onTyped: () => void;
}) {
  const reply = useMemo(() => chatReply(answers, plan), [answers, plan]);
  const words = useMemo(() => reply.split(' '), [reply]);
  // Reduce motion: shown at once.
  const [shown, setShown] = useState(() => (animate && !reducedMotion() ? 0 : words.length));

  useEffect(() => {
    if (shown >= words.length) {
      if (animate) onTyped();
      return;
    }
    const step = TYPE_MS / words.length;
    const t = window.setInterval(() => {
      setShown((n) => {
        const next = n + 1;
        if (next >= words.length) {
          window.clearInterval(t);
          onTyped();
        }
        return Math.min(next, words.length);
      });
    }, step);
    return () => window.clearInterval(t);
    // Runs once: the reply types in a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="frost rounded-[20px] p-5">
      <div className="flex flex-col gap-4">
        <p className="ml-auto max-w-[85%] rounded-[18px] rounded-br-[6px] bg-primary px-4 py-2.5 text-[14px] leading-[20px] text-snow">
          What should I do first tomorrow?
        </p>
        <div className="max-w-[92%]">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-ink-2">Claude</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-text">
              <Plug className="h-3 w-3" aria-hidden />
              Focalyst connected
            </span>
          </div>
          <p className="rounded-[18px] rounded-bl-[6px] bg-surface-2 px-4 py-2.5 text-[14px] leading-[20px] text-ink">
            <span className="sr-only">{reply}</span>
            <span aria-hidden>
              {words.slice(0, shown).join(' ')}
              {shown < words.length && <span className="invisible"> {words.slice(shown).join(' ')}</span>}
            </span>
          </p>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-ink-3">An example built from your plan.</p>
    </div>
  );
}

export default ChatPreview;
