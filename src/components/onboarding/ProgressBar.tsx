'use client';
import { CHAPTERS, chapterOf, progressWithinChapter, type FlowState } from '@/lib/onboarding/steps';

/** 6 segments, one per chapter (3.3). */
export function ProgressBar({ step, flow, className = '' }: { step: number; flow: FlowState; className?: string }) {
  const chapter = chapterOf(step);
  const { index, total, fraction } = progressWithinChapter(step, flow);
  const overall = Math.round(((chapter + fraction) / CHAPTERS.length) * 100);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={overall}
      aria-valuetext={`${CHAPTERS[chapter].name}, step ${index + 1} of ${total}`}
      className={`flex w-full items-center gap-1.5 ${className}`}
    >
      {CHAPTERS.map((c, i) => {
        const fill = i < chapter ? 1 : i === chapter ? fraction : 0;
        return (
          <div key={c.name} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-[220ms] ease-[var(--ease)]"
              style={{ width: `${fill * 100}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default ProgressBar;
