'use client';
import React from 'react';

interface FolderPocketCardProps {
  name: string;
  noteCount: number;
  previewText?: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
}

export default function FolderPocketCard({
  name,
  noteCount,
  previewText,
  subtitle = 'Updated recently',
  active = false,
  onClick,
}: FolderPocketCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-[204px] w-full flex-col justify-end overflow-hidden rounded-[24px] p-1.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
        active
          ? 'bg-gradient-to-b from-[#3781FC] to-[#1951FC] shadow-[0_16px_36px_-12px_rgba(25,81,252,0.45)] -translate-y-0.5'
          : 'bg-surface-3/90 hover:bg-gradient-to-b hover:from-[#3781FC] hover:to-[#1951FC] hover:shadow-[0_16px_36px_-12px_rgba(25,81,252,0.38)] hover:-translate-y-0.5 border border-line'
      }`}
    >
      {/* Back inner paper sheets peeking out */}
      <div className="pointer-events-none absolute inset-x-4 top-3.5 h-24 rounded-t-[16px] bg-surface/60 transition-transform duration-200 group-hover:-translate-y-0.5" />
      <div className="pointer-events-none absolute inset-x-3 top-5 h-28 rounded-t-[16px] bg-surface px-4 pt-3 shadow-sm transition-transform duration-200 group-hover:-translate-y-1">
        <p className="line-clamp-3 text-[11px] leading-[15px] text-ink-2">
          {previewText || 'Create a note inside this folder to see a live preview here.'}
        </p>
      </div>

      {/* Front sculpted pocket flap with top-left folder tab curve */}
      <div className="relative z-10 flex h-[132px] w-full flex-col justify-between rounded-[20px] pt-5 px-5 pb-4">
        {/* SVG Pocket Background with top-left folder tab */}
        <svg
          viewBox="0 0 300 140"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d="M0,16 C0,7.16 7.16,0 16,0 L108,0 C118,0 124,5 130,13 L136,21 C141,27 148,30 157,30 L284,30 C292.84,30 300,37.16 300,46 L300,124 C300,132.84 292.84,140 284,140 L16,140 C7.16,140 0,132.84 0,124 Z"
            className={`transition-colors duration-200 ${
              active
                ? 'fill-[#5B9BFF]/85'
                : 'fill-surface-2/95 group-hover:fill-[#5B9BFF]/85'
            }`}
          />
        </svg>

        <div className="relative z-10 mt-3">
          <div
            className={`truncate text-[16px] font-semibold tracking-[-0.01em] transition-colors ${
              active ? 'text-snow' : 'text-ink group-hover:text-snow'
            }`}
          >
            {name}
          </div>
          <div
            className={`mt-0.5 text-[13px] tabular-nums transition-colors ${
              active ? 'text-snow/85' : 'text-ink-2 group-hover:text-snow/85'
            }`}
          >
            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
          </div>
        </div>

        <div
          className={`relative z-10 text-[11px] tabular-nums transition-colors ${
            active ? 'text-snow/75' : 'text-ink-3 group-hover:text-snow/75'
          }`}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}
