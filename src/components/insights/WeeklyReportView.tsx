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
    strokeColor = '#FF751F'; // orange/accent
    bgGlow = 'rgba(255, 117, 31, 0.1)';
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
          className="text-[#E2E8F0] dark:text-slate-700"
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
        <span className="text-[28px] font-black text-navy dark:text-slate-100 leading-none">{animatedScore}</span>
        <span className="text-[10px] font-semibold text-blue-muted dark:text-slate-400 mt-0.5">/ 100</span>
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
          <span className="text-[12px] font-semibold text-navy dark:text-slate-200">{label}</span>
        </div>
        <span className="text-[12px] font-bold" style={{ color }}>{value}{typeof max === 'number' && max !== 100 ? `/${max}` : '%'}</span>
      </div>
      <div className="h-2 bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
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
  const iconColor = isStrength ? '#10B981' : '#FF751F';
  const bgColor = isStrength ? 'bg-[#10B981]/5' : 'bg-[#FF751F]/5';
  const dotColor = isStrength ? 'bg-[#10B981]' : 'bg-[#FF751F]';

  if (items.length === 0) return null;

  return (
    <div className={`rounded-2xl p-4 ${bgColor} dark:bg-slate-800 dark:border dark:border-slate-700`}>
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h5 className="text-[12px] font-black uppercase tracking-wider" style={{ color: iconColor }}>
          {isStrength ? t('insights.strengths') : t('insights.improvements')}
        </h5>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
            <span className="text-[12.5px] text-navy-darker dark:text-slate-200 leading-relaxed font-medium">{item}</span>
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
      <div className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-full shadow-xl text-[13px] font-semibold">
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
      <div className="w-16 h-16 rounded-2xl bg-navy/5 dark:bg-slate-800 flex items-center justify-center mb-5">
        <Sparkles className="w-8 h-8 text-navy/30 dark:text-slate-500" />
      </div>
      <h4 className="text-[16px] font-bold text-navy dark:text-slate-200 mb-2">
        {t('insights.generatingInsights')}
      </h4>
      <p className="text-[13px] text-blue-muted dark:text-slate-400 leading-relaxed max-w-[280px] font-medium">
        {t('insights.generatingInsightsDesc')}
      </p>
      <div className="mt-6 flex items-center gap-2 text-[11px] text-blue-muted dark:text-slate-400 font-medium">
        <Clock className="w-3.5 h-3.5" />
        {t('insights.checkBackSunday')}
      </div>
    </div>
  );
}

/* ─── Loading State ──────────────────────────────────────────── */

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Loader2 className="w-8 h-8 text-navy/40 dark:text-slate-500 animate-spin mb-4" />
      <p className="text-[13px] text-blue-muted dark:text-slate-400 font-medium">
        {t('insights.preparingReport')}
      </p>
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
      const res = await fetch('/api/generate-weekly-report', { method: 'POST' });

      if (!res.ok) {
        // If not Sunday-Tuesday, the API might 404 or the data isn't ready
        setReportData(null);
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

      <div id="weekly-report" className="mt-8 bg-gradient-to-br from-white to-[#F4F7FA] dark:from-slate-900 dark:to-slate-950 rounded-3xl shadow-sm border border-[#E2E8F0] dark:border-slate-800 w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-navy/10 dark:bg-slate-800 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-navy dark:text-slate-200" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-navy dark:text-slate-100 leading-none">{t('insights.report')}</h3>
              <p className="text-[11px] text-blue-muted dark:text-slate-400 mt-1 font-medium">{weekRange}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-6">
          {isLoading ? (
            <LoadingState />
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
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#4A6C8C]" />
                        <span className="text-[11px] font-semibold text-blue-muted dark:text-slate-400 uppercase tracking-wider">{t('nav.focus')}</span>
                      </div>
                      <span className="text-[15px] font-black text-navy dark:text-slate-200">{reportData.focusTime}</span>
                    </div>

                    {/* Tasks Completed */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span className="text-[11px] font-semibold text-blue-muted dark:text-slate-400 uppercase tracking-wider">{t('nav.plan')}</span>
                      </div>
                      <span className="text-[15px] font-black text-navy dark:text-slate-200">{reportData.tasksCompleted}</span>
                    </div>

                    {/* Habit Consistency */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#FF751F]" />
                        <span className="text-[11px] font-semibold text-blue-muted dark:text-slate-400 uppercase tracking-wider">{t('plan.habits').split(' ').pop()}</span>
                      </div>
                      <span className="text-[15px] font-black text-[#FF751F]">{reportData.habitConsistency}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Bars */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                  <h4 className="text-[12px] font-black text-navy dark:text-slate-200 uppercase tracking-wider mb-2">{t('insights.performance')}</h4>
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
                    color="#FF751F"
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
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                  <h4 className="text-[13px] font-bold text-navy dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-navy/50 dark:text-slate-400" />
                    {t('insights.generatingInsights').replace('Generating your', '').replace('...', '').trim()}
                  </h4>
                  <p className="text-[13px] text-blue-muted dark:text-slate-300 leading-relaxed font-medium">
                    {reportData.weekSummaryText}
                  </p>
                </div>
              </div>

              {/* ═══ Section B: Catalyst Insights (Pro) ═══ */}
              <div className="mt-8 border-t border-[#E2E8F0] dark:border-slate-800 pt-6 relative">
                <h4 className="text-[15px] font-bold text-navy dark:text-slate-100 mb-4 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#FF751F] fill-[#FF751F]" />
                  Catalyst Report
                  {userPlan === 'pro' && (
                    <span className="ml-1.5 bg-gradient-to-r from-[#FF751F] to-[#F07A54] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                  )}
                </h4>

                {userPlan === 'free' ? (
                  /* ── Free Tier Paywall Gate ── */
                  <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 min-h-[240px]">
                    {/* Blurred placeholder simulating Catalyst cards */}
                    <div className="blur-[4px] opacity-20 select-none pointer-events-none p-5 space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="h-28 bg-gradient-to-r from-[#E2E8F0] to-[#D1D9E2] dark:from-slate-800 dark:to-slate-700 rounded-xl" />
                        <div className="h-28 bg-gradient-to-r from-[#E2E8F0] to-[#D1D9E2] dark:from-slate-800 dark:to-slate-700 rounded-xl" />
                        <div className="h-28 bg-gradient-to-r from-[#E2E8F0] to-[#D1D9E2] dark:from-slate-800 dark:to-slate-700 rounded-xl" />
                      </div>
                    </div>

                    {/* Gradient overlay + paywall CTA */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-white/40 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/40 flex flex-col items-center justify-end pb-8 px-5 text-center">
                      <div className="w-12 h-12 rounded-full bg-navy/5 dark:bg-slate-800 flex items-center justify-center mb-3 shadow-sm border dark:border-slate-700">
                        <Lock className="w-5 h-5 text-navy dark:text-slate-200" />
                      </div>
                      <p className="text-[13px] font-bold text-navy dark:text-slate-100 mb-1.5 max-w-[280px]">
                        {t('insights.unlockProInsights')}
                      </p>
                      <p className="text-[11px] text-blue-muted dark:text-slate-400 mb-4 max-w-[260px]">
                        Go beyond the basics with AI-powered coaching tailored to your workflow.
                      </p>
                      <button
                        onClick={() => router.push('/paywall')}
                        className="bg-navy hover:bg-navy-dark dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white font-bold text-[12px] px-6 py-2.5 rounded-full transition-all shadow-md active:scale-95 flex items-center gap-1.5"
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
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-l-4 border-l-[#4A6C8C] shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <BarChart2 className="w-4 h-4 text-[#4A6C8C]" />
                          <h5 className="text-[12px] font-black text-[#4A6C8C] uppercase tracking-wider">{t('insights.patternIntelligence')}</h5>
                        </div>
                        <p className="text-[12.5px] text-blue-muted dark:text-slate-300 leading-relaxed font-medium">
                          {reportData.catalystInsights.pattern}
                        </p>
                      </div>
                    )}

                    {/* Weakness Diagnosis Card */}
                    {reportData.catalystInsights.weakness && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-l-4 border-l-[#FF751F] shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <AlertTriangle className="w-4 h-4 text-[#FF751F]" />
                          <h5 className="text-[12px] font-black text-[#FF751F] uppercase tracking-wider">{t('insights.weaknessDiagnosis')}</h5>
                        </div>
                        <p className="text-[12.5px] text-blue-muted dark:text-slate-300 leading-relaxed font-medium">
                          {reportData.catalystInsights.weakness}
                        </p>
                      </div>
                    )}

                    {/* Priority Prescription Card */}
                    {reportData.catalystInsights.prescription && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-l-4 border-l-[#10B981] shadow-sm border border-[#E2E8F0] dark:border-slate-700">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <Lightbulb className="w-4 h-4 text-[#10B981]" />
                          <h5 className="text-[12px] font-black text-[#10B981] uppercase tracking-wider">{t('insights.priorityPrescription')}</h5>
                        </div>
                        <p className="text-[12.5px] text-blue-muted dark:text-slate-300 leading-relaxed font-medium">
                          {reportData.catalystInsights.prescription}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ═══ Copy Report Button ═══ */}
              <div className="flex justify-center mt-6 border-t border-[#E2E8F0] dark:border-slate-800 pt-4">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-2 text-[12px] font-bold text-blue-muted dark:text-slate-400 hover:text-navy dark:hover:text-slate-200 transition-colors py-2.5 px-5 rounded-xl hover:bg-navy/5 dark:hover:bg-slate-800 active:scale-95"
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
