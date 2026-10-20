'use client';
import React, { useId } from 'react';

export interface FolderPocketCardProps {
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
  const gradId = useId();
  return (
    <button
      type="button"
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      className="fx-folder group relative flex aspect-[1.15/1] min-h-[176px] w-full flex-col justify-end overflow-hidden rounded-[22px] p-2 text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)]"
    >
      {/* Back Folder Shape with Top-Left Tab */}
      <svg
        viewBox="0 0 300 260"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--f-back-top)" />
            <stop offset="100%" stopColor="var(--f-back-bot)" />
          </linearGradient>
        </defs>
        <path
          d="M 0,22 C 0,9.85 9.85,0 22,0 L 104,0 C 115,0 122,5 128,13 L 135,22 C 140,28 147,32 157,32 L 278,32 C 290.15,32 300,41.85 300,54 L 300,238 C 300,250.15 290.15,260 278,260 L 22,260 C 9.85,260 0,250.15 0,238 Z"
          fill={`url(#${gradId})`}
        />
      </svg>

      {/* Back Peeking Paper Sheet (offset 6px right) */}
      <div
        style={{ backgroundColor: 'var(--f-paper-2)' }}
        className={`pointer-events-none absolute left-5 right-3 top-6 h-24 rounded-t-[14px] shadow-sm transition-transform duration-200 ${
          active ? '-translate-y-1.5' : 'group-hover:-translate-y-1.5'
        }`}
      />

      {/* Front Peeking Paper Sheet with 3 lines of 10.5px preview text */}
      <div
        style={{ backgroundColor: 'var(--f-paper)' }}
        className={`pointer-events-none absolute left-3.5 right-4 top-8 h-28 rounded-t-[14px] px-3.5 pt-2.5 shadow-sm transition-transform duration-200 ${
          active ? '-translate-y-2' : 'group-hover:-translate-y-2'
        }`}
      >
        <p className="line-clamp-3 text-[10.5px] leading-[15px] text-[#8A93AB]">
          {previewText || 'Notes saved inside this folder appear here as a preview.'}
        </p>
      </div>

      {/* Front Glossy Pocket covering bottom 60% */}
      <div className="fx-folder-front relative z-10 flex h-[60%] w-full flex-col justify-between rounded-[18px] px-4 py-3.5">
        <div>
          <div
            style={{ color: 'var(--f-ink)' }}
            className="truncate text-[15px] font-semibold tracking-[-0.01em]"
          >
            {name}
          </div>
          <div
            style={{ color: 'var(--f-ink-2)' }}
            className="mt-0.5 text-[12px] tabular-nums"
          >
            {noteCount} {noteCount === 1 ? 'note' : 'notes'}
          </div>
        </div>
        <div
          style={{ color: 'var(--f-ink-3)' }}
          className="text-[11px] tabular-nums"
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

export function FolderCard({
  name,
  count,
  updated,
  preview,
  active,
  onClick,
}: {
  name: string;
  count: number;
  updated?: string;
  preview?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <FolderPocketCard
      name={name}
      noteCount={count}
      subtitle={updated || 'Updated recently'}
      previewText={preview}
      active={active}
      onClick={onClick}
    />
  );
}
