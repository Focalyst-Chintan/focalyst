'use client';
// Mini habit group leaderboard (screens 16 and 31): the user's row plus 4 invite rows. No invented people.
import { UserPlus } from 'lucide-react';

export function MiniLeaderboard({ name, emoji, className = '' }: { name: string; emoji?: string; className?: string }) {
  const display = name || 'You';
  return (
    <div className={`rounded-[16px] border border-line bg-surface-2 p-3 ${className}`} aria-label="Group preview">
      <ol className="flex flex-col gap-1.5">
        <li className="flex h-11 items-center gap-3 rounded-[12px] bg-surface px-3">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-snow"
          >
            {display.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{name ? `${name} (you)` : 'You'}</span>
          {emoji && <span aria-hidden className="text-[16px]">{emoji}</span>}
          <span className="text-[13px] font-medium tabular-nums text-ink-2">Day 1</span>
        </li>
        {[2, 3, 4, 5].map((n) => (
          <li key={n} className="flex h-11 items-center gap-3 rounded-[12px] border border-dashed border-line-strong px-3 text-ink-3">
            <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong">
              <UserPlus className="h-3.5 w-3.5" />
            </span>
            <span className="text-[14px]">Invite a friend</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default MiniLeaderboard;
