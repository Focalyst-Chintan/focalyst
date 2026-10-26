'use client';
import { useId, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Timer, CheckCircle2, Flame, Sparkles, Activity, Target, ListChecks, Copy, Check, X, Lock } from 'lucide-react';

export type WeeklyReportView = {
  rangeLabel: string;          // for example "19 Oct to 25 Oct"
  score: number;               // 0 to 100
  focusMinutes: number;
  tasksDone: number;
  taskCompletionPct: number;   // 0 to 100
  habitPct: number;            // 0 to 100
  insight: string;
  strengths?: string[];        // only when the report data has a real strengths list
  catalyst?: { pattern: string; weakness: string; prescription: string } | null;
  generatedAt?: string;        // ISO date
};

type Icon = ComponentType<{ className?: string }>;

const fmtMinutes = (m: number) => { const h = Math.floor(m / 60); const r = Math.round(m % 60); return h ? `${h}h ${r}m` : `${r}m`; };
const verdict = (s: number) => (s >= 80 ? 'Outstanding week' : s >= 60 ? 'Strong week' : s >= 40 ? 'Building momentum' : 'A slower week');
const splitSteps = (t: string) => {
  const parts = t.split(/\s*(?=\b\d+\.\s)/).map((p) => p.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  return parts.length > 1 ? parts : [t.trim()];
};

function ScoreRing({ score }: { score: number }) {
  const id = useId();
  const r = 52; const c = 2 * Math.PI * r; const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative size-44">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0B2CB1" /><stop offset="55%" stopColor="#1951FC" /><stop offset="100%" stopColor="#3781FC" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700 ease-out" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-6xl leading-none text-[var(--ink)]">{Math.round(score)}</div>
          <div className="mt-1 text-xs text-[var(--ink-3)]">out of 100</div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon: I, label, value }: { icon: Icon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3">
      <span className="flex items-center gap-2.5 text-sm text-[var(--ink-2)]"><I className="size-4 text-[var(--primary)]" />{label}</span>
      <span className="text-lg font-semibold tabular-nums text-[var(--ink)]">{value}</span>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-[var(--ink-2)]">{label}</span>
        <span className="font-medium tabular-nums text-[var(--ink)]">{v}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0B2CB1,#1951FC,#3781FC)] transition-[width] duration-700" style={{ width: `${Math.max(2, v)}%` }} />
      </div>
    </div>
  );
}

function CatalystCard({ icon: I, title, children }: { icon: Icon; title: string; children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 pl-6">
      <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-[linear-gradient(180deg,#1951FC,#3781FC)]" />
      <h4 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]"><I className="size-4" />{title}</h4>
      <div className="text-[15px] leading-7 text-[var(--ink-2)]">{children}</div>
    </section>
  );
}

export function DesktopWeeklyReport({ report, isPro, onClose, onUpgrade }: {
  report: WeeklyReportView; isPro: boolean; onClose: () => void; onUpgrade: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const steps = useMemo(() => (report.catalyst ? splitSteps(report.catalyst.prescription) : []), [report]);

  const copy = async () => {
    const lines = [
      `Focalyst weekly report, ${report.rangeLabel}`,
      `Productivity score: ${Math.round(report.score)}/100 (${verdict(report.score)})`,
      `Focus: ${fmtMinutes(report.focusMinutes)} | Tasks done: ${report.tasksDone} | Habit consistency: ${Math.round(report.habitPct)}%`,
      '', report.insight,
      ...(isPro && report.catalyst ? ['', 'Pattern intelligence', report.catalyst.pattern, '', 'Weakness diagnosis', report.catalyst.weakness, '', 'Priority prescription', ...steps.map((s, i) => `${i + 1}. ${s}`)] : []),
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fx-report-title"
      className="glass-strong flex h-[min(88vh,920px)] w-[min(1080px,92vw)] flex-col overflow-hidden rounded-3xl border border-[var(--line)] shadow-2xl">
      <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-8 py-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--ink-3)]">Weekly report</p>
          <h2 id="fx-report-title" className="mt-1 font-display text-3xl text-[var(--ink)]">{report.rangeLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copy}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--surface-3)]">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy report'}
          </button>
          <button type="button" onClick={onClose} aria-label="Close report"
            className="grid size-9 place-items-center rounded-xl text-[var(--ink-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]">
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6 overflow-y-auto border-r border-[var(--line)] p-8">
          <div className="flex flex-col items-center text-center">
            <ScoreRing score={report.score} />
            <p className="mt-4 font-display text-2xl text-[var(--ink)]">{verdict(report.score)}</p>
            <p className="text-sm text-[var(--ink-3)]">Productivity score</p>
          </div>
          <div className="space-y-2">
            <StatRow icon={Timer} label="Focus time" value={fmtMinutes(report.focusMinutes)} />
            <StatRow icon={CheckCircle2} label="Tasks done" value={String(report.tasksDone)} />
            <StatRow icon={Flame} label="Habit consistency" value={`${Math.round(report.habitPct)}%`} />
          </div>
          <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-3)]">Breakdown</p>
            <Bar label="Tasks completed" value={report.taskCompletionPct} />
            <Bar label="Habit consistency" value={report.habitPct} />
          </div>
        </aside>

        <main className="space-y-8 overflow-y-auto p-8">
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
            <h3 className="mb-3 flex items-center gap-2 font-display text-2xl text-[var(--ink)]"><Sparkles className="size-5 text-[var(--primary)]" />This week</h3>
            <p className="text-[15px] leading-7 text-[var(--ink-2)]">{report.insight}</p>
          </section>

          {report.strengths && report.strengths.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-2xl text-[var(--ink)]">Strengths</h3>
              <ul className="space-y-2">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-7 text-[var(--ink-2)]">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />{s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center gap-3">
              <h3 className="font-display text-2xl text-[var(--ink)]">Catalyst Report</h3>
              <span className="rounded-full bg-[linear-gradient(90deg,#0B2CB1,#1951FC)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-snow">Pro</span>
            </div>
            {isPro && report.catalyst ? (
              <div className="space-y-4">
                <CatalystCard icon={Activity} title="Pattern intelligence"><p>{report.catalyst.pattern}</p></CatalystCard>
                <CatalystCard icon={Target} title="Weakness diagnosis"><p>{report.catalyst.weakness}</p></CatalystCard>
                <CatalystCard icon={ListChecks} title="Priority prescription">
                  <ol className="space-y-3">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#1951FC,#3781FC)] text-xs font-semibold text-snow">{i + 1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </CatalystCard>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-6">
                <div aria-hidden className="select-none space-y-3 blur-[6px]">
                  <div className="h-4 w-2/3 rounded bg-[var(--surface-3)]" /><div className="h-4 w-full rounded bg-[var(--surface-3)]" />
                  <div className="h-4 w-5/6 rounded bg-[var(--surface-3)]" /><div className="h-4 w-3/4 rounded bg-[var(--surface-3)]" />
                  <div className="h-4 w-full rounded bg-[var(--surface-3)]" /><div className="h-4 w-1/2 rounded bg-[var(--surface-3)]" />
                </div>
                <div className="absolute inset-0 grid place-items-center bg-[var(--surface)]/70 p-6 text-center">
                  <div className="max-w-sm">
                    <Lock className="mx-auto size-5 text-[var(--primary)]" />
                    <p className="mt-3 font-display text-2xl text-[var(--ink)]">Unlock your Catalyst Report</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">See the patterns behind your week, the root cause of what slowed you down and three clear steps to improve.</p>
                    <button type="button" onClick={onUpgrade}
                      className="mt-4 inline-flex h-10 items-center rounded-xl bg-[linear-gradient(90deg,#0B2CB1,#1951FC)] px-4 text-sm font-medium text-snow shadow-sm transition hover:brightness-110">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {report.generatedAt && (
            <p className="text-xs text-[var(--ink-3)]">
              Created {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(report.generatedAt))}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
