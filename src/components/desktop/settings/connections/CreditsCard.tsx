'use client';
import React from 'react';
import { Info } from 'lucide-react';
import { Chip } from '@/components/desktop/ui/Chip';
import { Popover } from '@/components/desktop/ui/Popover';
import type { McpCredits, McpPrice } from '@/hooks/mcp/useMcp';
import { fmtNum, shortDate } from './format';

function PriceList({ prices }: { prices: McpPrice[] }) {
  const groups = [
    { title: 'Reading your data', items: prices.filter((p) => !p.is_write) },
    { title: 'Making changes', items: prices.filter((p) => p.is_write) },
  ];
  return (
    <div className="w-[280px] p-4">
      <p className="text-[14px] font-semibold text-ink">What uses credits</p>
      {groups.map((g) => (
        <div key={g.title} className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{g.title}</p>
          <ul className="mt-1.5 space-y-1">
            {g.items.map((p) => (
              <li key={p.tool} className="flex items-center justify-between text-[13px] text-ink-2">
                <span>{p.label}</span>
                <span className="tabular-nums text-ink">{p.cost}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-3 space-y-1 border-t border-line pt-3 text-[12px] leading-snug text-ink-3">
        <p>Failed requests are refunded.</p>
        <p>Unused credits don&apos;t carry over to the next month.</p>
      </div>
    </div>
  );
}

export function CreditsCard({ credits, prices }: { credits: McpCredits; prices: McpPrice[] }) {
  const monthly = credits.monthly_credits;

  const pricesButton = (
    <Popover
      align="right"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-primary-text transition-colors hover:bg-primary-soft"
        >
          <Info className="h-3.5 w-3.5" />
          What uses credits
        </button>
      }
    >
      <PriceList prices={prices} />
    </Popover>
  );

  if (!credits.has_account) {
    return (
      <div className="frost rounded-[24px] p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">MCP credits</p>
          {pricesButton}
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          You have {fmtNum(monthly)} credits waiting. They start the first time you connect an app.
        </p>
      </div>
    );
  }

  const balance = credits.balance ?? 0;
  const pct = monthly > 0 ? Math.min(100, Math.round((balance / monthly) * 100)) : 0;

  return (
    <div className="frost rounded-[24px] p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">MCP credits</p>
        {pricesButton}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-[40px] leading-none text-ink tabular-nums">{fmtNum(balance)}</span>
        <span className="text-[15px] text-ink-3 tabular-nums">/ {fmtNum(monthly)}</span>
      </div>
      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={monthly}
        aria-valuenow={balance}
        aria-label="MCP credits left"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1951FC] to-[#3781FC] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
        <span>
          Refills to {fmtNum(monthly)} on {shortDate(credits.period_end)}
        </span>
        <Chip variant={credits.bonus_claimed_today ? 'success' : 'neutral'}>
          {credits.bonus_claimed_today
            ? `Today's +${credits.daily_bonus} collected`
            : `+${credits.daily_bonus} when you open Focalyst tomorrow`}
        </Chip>
      </div>
      {credits.plan_renews_at && (
        <p className="mt-2 text-[12px] leading-snug text-ink-3">
          AI connections stay active while Pro is active. Pro renews on {shortDate(credits.plan_renews_at)}.
        </p>
      )}
    </div>
  );
}
