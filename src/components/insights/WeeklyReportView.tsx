"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Lock,
  Copy,
  Check,
  BarChart2,
  Zap,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  Flame,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ─── Types ──────────────────────────────────────────────────── */

interface CatalystInsights {
  pattern: string;
  weakness: string;
  prescription: string;
}

interface ReportData {
  score: number;
  focusTime: string;
  tasksCompleted: number;
  habitConsistency: string;
  weekSummaryText: string;
  catalystInsights: CatalystInsights;
}

interface WeeklyReportViewProps {
  /** If provided, skip the API fetch and render this data directly */
  reportData?: ReportData | null;
  userPlan: 'free' | 'pro';
}

/* ─── Helpers ────────────────────────────────────────────────── */

/** Get ISO week string for cache key */
function getISOWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

/** Get human-readable date range for this ISO week */
function getWeekDateRange(): string {
  const now = new Date();
  const day = now.getDay();
  
  // Calculate endDate (Most recent Saturday)
  // If Sun (0): subtract 1 day.
  // If Mon (1): subtract 2 days.
  // If Tue (2): subtract 3 days.
  // If Wed (3): subtract 4 days.
  // If Thu (4): subtract 5 days.
  // If Fri (5): subtract 6 days.
  // If Sat (6): subtract 7 days.
  const daysToSubtract = day === 6 ? 7 : (day + 1);
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - daysToSubtract);
  
  // Calculate startDate (The Sunday exactly 6 days before that endDate)
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);
  
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

/** Parse consistency percentage string (e.g. "78%") to number */
function parsePercentage(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

/** Extract strengths and weaknesses from the weekSummaryText (heuristic split on keywords) */
function extractBullets(text: string): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Simple sentence tokenizer
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  // Keywords for classification
  const weaknessKeywords = /dip|drop|miss|low|weak|behind|skip|broke|less|decrease|struggle|challenge|fail|neglect|lack|absent/i;

  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 10) return; // too short

    if (weaknessKeywords.test(trimmed)) {
      weaknesses.push(trimmed);
    } else {
      strengths.push(trimmed);
    }
  });

  return {
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
  };
}

/* ─── Score Ring Component ───────────────────────────────────── */

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [score]);

  // Color based on score tier
  let strokeColor = '#10B981'; // green 75-100
  let bgGlow = 'rgba(16, 185, 129, 0.1)';
  if (score < 50) {
    strokeColor = '#EF4444'; // red
    bgGlow = 'rgba(239, 68, 68, 0.1)';
  } else if (score < 75) {
    strokeColor = '#F59E0B'; // warning (orange retired as an accent)
    bgGlow = 'rgba(245, 158, 11, 0.1)';
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-[var(--m-surface-strong)]"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
        />
      </svg>
      {/* Score number overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: bgGlow, borderRadius: '50%' }}>
        <span className="text-[28px] font-semibold text-ink leading-none">{animatedScore}</span>
        <span className="text-[10px] font-semibold text-ink-2 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

/* ─── Progress Bar Component ─────────────────────────────────── */

function MetricBar({ label, value, max, color, icon: Icon }: {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ElementType;
}) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-[12px] font-semibold text-ink">{label}</span>
        </div>
        <span className="text-[12px] font-bold" style={{ color }}>{value}{typeof max === 'number' && max !== 100 ? `/${max}` : '%'}</span>
      </div>
      <div className="h-2 bg-[var(--m-surface-strong)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ─── Bullet List Component ──────────────────────────────────── */

function BulletList({ items, variant }: { items: string[]; variant: 'strength' | 'weakness' }) {
  const { t } = useTranslation();
  const isStrength = variant === 'strength';
  const Icon = isStrength ? TrendingUp : TrendingDown;
  const iconColor = isStrength ? 'var(--m-success-text)' : 'var(--m-warning-text)';
  const bgColor = 'bg-[var(--m-surface-strong)] border border-line';
  const dotColor = isStrength ? 'bg-[var(--m-success)]' : 'bg-[var(--m-warning)]';

  if (items.length === 0) return null;

  return (
    <div className={`rounded-[16px] p-4 ${bgColor}`}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h5 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: iconColor }}>
          {isStrength ? t('insights.strengths') : t('insights.improvements')}
        </h5>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
            <span className="text-[12.5px] text-ink leading-relaxed font-medium">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Toast Component ────────────────────────────────────────── */

function CopyToast({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <div className="fixed top-6 left-1/2 z-[110] -translate-x-1/2" style={{ animation: 'fadeInDown 0.3s ease-out forwards' }}>
      <div className="flex items-center gap-2 m-blur border border-line text-ink px-5 py-2.5 rounded-full shadow-[var(--shadow-glass)] m-subhead">
        <Check className="w-4 h-4 text-[#10B981]" />
        {t('insights.toastCopied')}
      </div>
    </div>
  );
}

/* ─── Empty State Component ──────────────────────────────────── */

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-[20px] bg-[var(--m-surface-strong)] border border-line flex items-center justify-center mb-5 text-primary-text">
        <Sparkles className="w-8 h-8 text-navy/30 dark:text-slate-500" />
      </div>
      <h4 className="text-[16px] font-bold text-ink mb-2">
        {t('insights.generatingInsights')}
      </h4>
      <p className="text-[13px] text-ink-2 leading-relaxed max-w-[280px] font-medium">
        {t('insights.generatingInsightsDesc')}
      </p>
      <div className="mt-6 flex items-center gap-2 text-[11px] text-ink-2 font-medium">
        <Clock className="w-3.5 h-3.5" />
        {t('insights.checkBackSunday')}
      </div>
    </div>
  );
}

/* ─── Loading State ──────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Loader2 className="w-8 h-8 text-navy/40 dark:text-slate-500 animate-spin mb-4" />
      <p className="text-[15px] font-semibold text-ink mb-1">
        Creating your report
      </p>
      <p className="text-[12px] text-ink-2 font-medium">
        Analyzing your tasks, habits, and focus hours
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-[14px] text-ink font-medium max-w-[280px] mb-4">
        Your report could not be created right now. Please try again in a few minutes.
      </p>
      <button
        onClick={onRetry}
        className="m-btn m-btn-secondary m-btn-sm m-press"
      >
        Try again
      </button>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */

export default function WeeklyReportView({ reportData: initialData, userPlan }: WeeklyReportViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [reportData, setReportData] = useState<ReportData | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [fetchError, setFetchError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const weekKey = getISOWeekKey(new Date());
  const weekRange = getWeekDateRange();

  // Fetch report data from API if not provided via props
  const fetchReport = useCallback(async () => {
    // Check localStorage cache first
    const cacheKey = `focalyst_report_data_${weekKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ReportData;
        setReportData(parsed);
        setIsLoading(false);
        return;
      } catch { /* fall through to API */ }
    }

    try {
      setIsLoading(true);
      setFetchError(false);
      const res = await fetch('/api/ai/weekly-report', { method: 'POST' });

      if (!res.ok) {
        setFetchError(true);
        setIsLoading(false);
        return;
      }

      const data = await res.json() as ReportData;
      setReportData(data);

      // Cache for this week
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err) {
      console.error('[WeeklyReportView] Failed to fetch report:', err);
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    if (!initialData) {
      fetchReport();
    }
  }, [initialData, fetchReport]);

  // Copy to clipboard handler
  const handleCopyReport = async () => {
    if (!reportData) return;

    let text = `📊 Weekly Productivity Report\n`;
    text += `${weekRange}\n\n`;

    text += `📈 Metrics\n`;
    text += `• Productivity Score: ${reportData.score}/100\n`;
    text += `• Total Focus Time: ${reportData.focusTime}\n`;
    text += `• Tasks Completed: ${reportData.tasksCompleted}\n`;
    text += `• Habit Consistency: ${reportData.habitConsistency}\n\n`;

    text += `📝 Week Summary\n`;
    text += `${reportData.weekSummaryText}\n`;

    if (userPlan === 'pro' && reportData.catalystInsights) {
      text += `\n⚡ Catalyst Insights\n`;
      if (reportData.catalystInsights.pattern) {
        text += `\n🔍 Pattern Intelligence\n${reportData.catalystInsights.pattern}\n`;
      }
      if (reportData.catalystInsights.weakness) {
        text += `\n⚠️ Weakness Diagnosis\n${reportData.catalystInsights.weakness}\n`;
      }
      if (reportData.catalystInsights.prescription) {
        text += `\n💡 Priority Prescription\n${reportData.catalystInsights.prescription}\n`;
      }
    }

    text += `\n—\nGenerated by Focalyst`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2200);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Determine what to render
  const hasData = reportData !== null;

  return (
    <>
      <CopyToast visible={showToast} />

      <div id="weekly-report" className="m-glass w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="m-tile !w-9 !h-9 text-primary-text">
              <Calendar className="w-5 h-5 text-ink" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-ink leading-none">{t('insights.report')}</h3>
              <p className="text-[11px] text-ink-2 mt-1 font-medium">{weekRange}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-6">
          {isLoading ? (
            <LoadingState />
          ) : fetchError ? (
            <ErrorState onRetry={fetchReport} />
          ) : !hasData ? (
            <EmptyState />
          ) : (
            <>
              {/* ═══ Section A: Week Summary (Free) ═══ */}
              <div className="mt-5 space-y-5">
                {/* Score Ring + Key Metrics */}
                <div className="flex items-center gap-5">
                  <ScoreRing score={reportData.score} size={110} />
                  <div className="flex-1 space-y-3">
                    {/* Focus Time */}
                    <div className="flex items-center justify-between bg-[var(--m-surface-strong)] rounded-xl px-3.5 py-2.5 shadow-sm border border-line">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-text" />
                        <span className="m-overline text-ink-2">{t('nav.focus')}</span>
                      </div>
                      <span className="text-[15px] font-semibold text-ink">{reportData.focusTime}</span>
                    </div>

                    {/* Tasks Completed */}
                    <div className="flex items-center justify-between bg-[var(--m-surface-strong)] rounded-xl px-3.5 py-2.5 shadow-sm border border-line">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span className="m-overline text-ink-2">{t('nav.plan')}</span>
                      </div>
                      <span className="text-[15px] font-semibold text-ink">{reportData.tasksCompleted}</span>
                    </div>

                    {/* Habit Consistency */}
                    <div className="flex items-center justify-between bg-[var(--m-surface-strong)] rounded-xl px-3.5 py-2.5 shadow-sm border border-line">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-primary-text" />
                        <span className="m-overline text-ink-2">{t('plan.habits').split(' ').pop()}</span>
                      </div>
                      <span className="text-[15px] font-semibold text-primary-text">{reportData.habitConsistency}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Bars */}
                <div className="bg-[var(--m-surface-strong)] rounded-2xl p-4 shadow-sm border border-line space-y-3">
                  <h4 className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-2">{t('insights.performance')}</h4>
                  <MetricBar
                    label={t('insights.tasksCompleted')}
                    value={Math.min(Math.round((reportData.tasksCompleted / Math.max(reportData.tasksCompleted, 1)) * 100), 100)}
                    max={100}
                    color="#10B981"
                    icon={Target}
                  />
                  <MetricBar
                    label={t('plan.habits')}
                    value={parsePercentage(reportData.habitConsistency)}
                    max={100}
                    color="#3781FC"
                    icon={Flame}
                  />
                  <MetricBar
                    label={t('insights.productivityScore')}
                    value={reportData.score}
                    max={100}
                    color="#4A6C8C"
                    icon={BarChart2}
                  />
                </div>

                {/* Strengths & Weaknesses */}
                {(() => {
                  const { strengths, weaknesses } = extractBullets(reportData.weekSummaryText);
                  return (
                    <div className="space-y-3">
                      <BulletList items={strengths} variant="strength" />
                      <BulletList items={weaknesses} variant="weakness" />
                    </div>
                  );
                })()}

                {/* Week Summary */}
                <div className="bg-[var(--m-surface-strong)] rounded-2xl p-5 shadow-sm border border-line">
                  <h4 className="text-[13px] font-bold text-ink mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-navy/50 dark:text-slate-400" />
                    {t('insights.generatingInsights').replace('Generating your', '').replace('...', '').trim()}
                  </h4>
                  <p className="text-[13px] text-ink-2 leading-relaxed font-medium">
                    {reportData.weekSummaryText}
                  </p>
                </div>
              </div>

              {/* ═══ Section B: Catalyst Insights (Pro) ═══ */}
              <div className="mt-8 border-t border-line pt-6 relative">
                <h4 className="text-[15px] font-bold text-ink mb-4 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary-text fill-[var(--primary-text)]" />
                  Catalyst Report
                  {userPlan === 'pro' && (
                    <span className="ml-1.5 m-chip m-chip-info !h-6 !text-[12px]">Pro</span>
                  )}
                </h4>

                {userPlan === 'free' ? (
                  /* ── Free Tier Paywall Gate ── */
                  <div className="relative rounded-2xl overflow-hidden border border-line bg-white/50 dark:bg-slate-900/50 min-h-[240px]">
                    {/* Blurred placeholder simulating Catalyst cards */}
                    <div className="blur-[4px] opacity-20 select-none pointer-events-none p-5 space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="h-28 bg-[var(--m-surface-strong)] rounded-[16px]" />
                        <div className="h-28 bg-[var(--m-surface-strong)] rounded-[16px]" />
                        <div className="h-28 bg-[var(--m-surface-strong)] rounded-[16px]" />
                      </div>
                    </div>

                    {/* Gradient overlay + paywall CTA */}
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--canvas),color-mix(in_srgb,var(--canvas)_92%,transparent),color-mix(in_srgb,var(--canvas)_40%,transparent))] flex flex-col items-center justify-end pb-8 px-5 text-center">
                      <div className="w-12 h-12 rounded-full bg-[var(--m-surface-strong)] flex items-center justify-center mb-3 border border-line text-primary-text">
                        <Lock className="w-5 h-5 text-ink" />
                      </div>
                      <p className="text-[13px] font-bold text-ink mb-1.5 max-w-[280px]">
                        {t('insights.unlockProInsights')}
                      </p>
                      <p className="text-[11px] text-ink-2 mb-4 max-w-[260px]">
                        Go beyond the basics with AI-powered coaching tailored to your workflow.
                      </p>
                      <button
                        onClick={() => router.push('/paywall')}
                        className="m-btn m-btn-primary m-btn-sm m-press"
                        id="weekly-report-upgrade-btn"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        Unlock Catalyst Report
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Pro Tier View ── */
                  <div className="space-y-4">
                    {/* Pattern Intelligence Card */}
                    {reportData.catalystInsights.pattern && (
                      <div className="bg-[var(--m-surface-strong)] rounded-2xl p-5 border-l-4 border-l-[#3781FC] shadow-sm border border-line">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <BarChart2 className="w-4 h-4 text-primary-text" />
                          <h5 className="text-[12px] font-semibold text-primary-text uppercase tracking-wider">{t('insights.patternIntelligence')}</h5>
                        </div>
                        <p className="text-[12.5px] text-ink-2 leading-relaxed font-medium">
                          {reportData.catalystInsights.pattern}
                        </p>
                      </div>
                    )}

                    {/* Weakness Diagnosis Card */}
                    {reportData.catalystInsights.weakness && (
                      <div className="bg-[var(--m-surface-strong)] rounded-2xl p-5 border-l-4 border-l-[var(--m-warning)] shadow-sm border border-line">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <AlertTriangle className="w-4 h-4 text-primary-text" />
                          <h5 className="text-[12px] font-semibold text-primary-text uppercase tracking-wider">{t('insights.weaknessDiagnosis')}</h5>
                        </div>
                        <p className="text-[12.5px] text-ink-2 leading-relaxed font-medium">
                          {reportData.catalystInsights.weakness}
                        </p>
                      </div>
                    )}

                    {/* Priority Prescription Card */}
                    {reportData.catalystInsights.prescription && (
                      <div className="bg-[var(--m-surface-strong)] rounded-2xl p-5 border-l-4 border-l-[#10B981] shadow-sm border border-line">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <Lightbulb className="w-4 h-4 text-[#10B981]" />
                          <h5 className="text-[12px] font-semibold text-[#10B981] uppercase tracking-wider">{t('insights.priorityPrescription')}</h5>
                        </div>
                        <p className="text-[12.5px] text-ink-2 leading-relaxed font-medium">
                          {reportData.catalystInsights.prescription}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ Copy Report Button ═══ */}
              <div className="flex justify-center mt-6 border-t border-line pt-4">
                <button
                  onClick={handleCopyReport}
                  className="m-btn m-btn-ghost m-press !text-[14px]"
                  id="weekly-report-copy-btn"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#10B981]" />
                      <span className="text-[#10B981]">{t('insights.toastCopied').split('!')[0]}!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{t('insights.copyReportText')}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
