import React from 'react';

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
  updated: string;
  preview?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active ? 'true' : 'false'}
      className="fx-folder group relative h-[188px] w-full text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] rounded-[18px] cursor-pointer"
    >
      <svg
        viewBox="0 0 240 188"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <path
          className="fx-folder-back transition-colors duration-200"
          style={{ fill: 'var(--folder-back)' }}
          d="M0 24a16 16 0 0 1 16-16h62c6 0 10 2 13 6l6 7c3 4 7 6 13 6h114a16 16 0 0 1 16 16v129a16 16 0 0 1-16 16H16A16 16 0 0 1 0 172Z"
        />
      </svg>
      <div
        className="absolute inset-x-[14px] top-[34px] h-[92px] rounded-[10px] px-3 pt-2.5 shadow-[0_1px_2px_rgba(3,25,91,0.10)] transition-transform duration-300 group-hover:-translate-y-2.5 group-data-[active=true]:-translate-y-2.5"
        style={{ background: 'var(--folder-paper)' }}
      >
        <p className="line-clamp-3 text-[10.5px] leading-[14px] text-ink-3">
          {preview || 'No notes yet'}
        </p>
      </div>
      <div className="fx-folder-front absolute inset-x-0 bottom-0 flex h-[112px] flex-col justify-end rounded-[16px] px-4 pb-3.5 transition-colors duration-200">
        <div className="truncate text-[15px] font-semibold text-ink group-hover:text-snow group-data-[active=true]:text-snow">
          {name}
        </div>
        <div className="text-[12px] tabular-nums text-ink-2 group-hover:text-snow/85 group-data-[active=true]:text-snow/85">
          {count} {count === 1 ? 'note' : 'notes'}
        </div>
        <div className="mt-2 text-[11px] tabular-nums text-ink-3 group-hover:text-snow/70 group-data-[active=true]:text-snow/70">
          {updated}
        </div>
      </div>
    </button>
  );
}

export default FolderCard;
