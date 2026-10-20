'use client';
import React from 'react';

const AVATAR_COLORS = ['#1951FC', '#3781FC', '#0B2CB1', '#4B5675', '#6FA4FF'] as const;

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MemberAvatar({
  userId,
  name,
  avatarUrl,
  size = 28,
  ring = false,
  className = '',
}: {
  userId: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: 28 | 32 | 44 | 56 | 72;
  ring?: boolean;
  className?: string;
}) {
  const bg = getAvatarColor(userId || name || 'user');
  const fontClass = size >= 44 ? 'text-[15px] font-semibold' : 'text-[11px] font-semibold';
  const ringClass = ring ? 'ring-2 ring-[var(--surface)]' : '';

  return (
    <div
      style={{ width: size, height: size, backgroundColor: bg }}
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-snow ${fontClass} ${ringClass} ${className}`}
      title={name || undefined}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || 'Avatar'} className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

export function AvatarStack({
  members,
}: {
  members: Array<{ user_id: string; name?: string | null; avatar_url?: string | null }>;
}) {
  const visible = members.slice(0, 3);
  const extra = Math.max(0, members.length - 3);
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m) => (
        <MemberAvatar key={m.user_id} userId={m.user_id} name={m.name} avatarUrl={m.avatar_url} size={28} ring />
      ))}
      {extra > 0 ? (
        <div className="relative inline-flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold tabular-nums text-ink-2 ring-2 ring-[var(--surface)]">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}
