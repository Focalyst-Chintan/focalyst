/**
 * Utility functions for the Weekly Productivity Report
 * 
 * These are shared helpers used by various report-related components.
 * The WeeklyReportModal has its own internal localStorage logic for
 * dismissal tracking, but these remain available for other consumers.
 */

/**
 * Get the ISO week number for a given date.
 */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Get the ISO week key string (e.g. "2026-W21")
 */
export function getISOWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

/**
 * Check if the report is available to view.
 * STRICT SUNDAY-ONLY RULE:
 * Returns true ONLY if today is Sunday (day === 0).
 */
export function isReportAvailable(): boolean {
  const today = new Date().getDay();
  return today === 0; // Strictly Sunday only
}

/**
 * Check if the user has viewed/dismissed the report this week.
 */
export function hasViewedReportThisWeek(userId: string): boolean {
  if (typeof window === 'undefined') return true; // SSR guard
  
  const weekKey = getISOWeekKey(new Date());
  const key = `focalyst_report_viewed_${userId}_${weekKey}`;
  
  return localStorage.getItem(key) === 'true';
}

/**
 * Mark the report as viewed for the current week.
 */
export function markReportAsViewed(userId: string): void {
  if (typeof window === 'undefined') return;
  
  const weekKey = getISOWeekKey(new Date());
  const key = `focalyst_report_viewed_${userId}_${weekKey}`;
  
  localStorage.setItem(key, 'true');
}
