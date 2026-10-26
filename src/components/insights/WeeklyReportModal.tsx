"use client";

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WeeklyReportModalProps {
  userId: string;
}

/**
 * Get the ISO week number for a given date.
 * Used to generate a unique localStorage key per calendar week.
 */
function getISOWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

/**
 * Determines if the report modal should auto-appear.
 * Window: Sunday (0) through Tuesday (2) — a 3-day grace period.
 */
function isReportWindowOpen(): boolean {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 0; // Strictly Sunday only
}

/**
 * Check if the user has already dismissed the modal for this ISO week.
 */
function isDismissedThisWeek(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  const key = `focalyst_report_dismissed_${userId}_${getISOWeekKey(new Date())}`;
  return localStorage.getItem(key) === 'true';
}

/**
 * Persist the dismissal for this ISO week so it won't reappear.
 */
function markDismissedThisWeek(userId: string): void {
  if (typeof window === 'undefined') return;
  const key = `focalyst_report_dismissed_${userId}_${getISOWeekKey(new Date())}`;
  localStorage.setItem(key, 'true');
}

export default function WeeklyReportModal({ userId }: WeeklyReportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only show during the Sunday–Tuesday window AND if not already dismissed
    if (isReportWindowOpen() && !isDismissedThisWeek(userId)) {
      // Small delay so the page settles before the modal appears
      const timer = setTimeout(() => setIsOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const handleClose = () => {
    markDismissedThisWeek(userId);
    setIsOpen(false);
    router.push('/plan');
  };

  const handleReadNow = () => {
    markDismissedThisWeek(userId);
    setIsOpen(false);
    router.push('/insights#weekly-report');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 backdrop-fade-in">
      <div className="relative w-full max-w-[340px] rounded-[32px] bg-[#B0BBC5] px-6 py-12 shadow-2xl flex flex-col items-center text-center modal-scale-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-6 top-6 text-black/70 hover:text-black transition-colors active:scale-90"
          aria-label="Close weekly report modal"
          id="weekly-report-modal-close"
        >
          <X className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Heading */}
        <h2 className="text-[32px] font-black text-black leading-tight tracking-tight px-2 mt-4">
          Your Weekly Productivity Report has arrived.
        </h2>
        
        {/* Subtitle */}
        <p className="text-black/75 text-sm font-medium mt-6 px-1 leading-relaxed max-w-[260px]">
          Ready? Discover your strengths and weaknesses. Know your patterns and get insights about how to improve further.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleReadNow}
          className="mt-8 rounded-full bg-[#F07A54] hover:bg-[#e06943] active:scale-95 text-snow px-8 py-3.5 font-bold text-sm tracking-wider transition-all shadow-lg hover:shadow-xl"
          id="weekly-report-modal-read-now"
        >
          READ NOW
        </button>
      </div>
    </div>
  );
}
