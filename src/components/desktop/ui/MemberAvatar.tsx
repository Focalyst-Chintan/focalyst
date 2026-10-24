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

export interface MemberAvatarProps {
  member?: {
    userId?: string;
    user_id?: string;
    name?: string | null;
    display_name?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  };
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
  size?: 28 | 32 | 44 | 56 | 72;
  ring?: boolean;
  className?: string;
}

export function MemberAvatar({
  member,
  userId: directUserId,
  name: directName,
  avatarUrl: directAvatarUrl,
  size,
  ring = false,
  className = '',
}: MemberAvatarProps) {
  const effectiveUserId = member?.userId || member?.user_id || directUserId || '';
  const effectiveName = member?.name ?? member?.display_name ?? directName;
  const effectiveAvatarUrl = member?.avatarUrl ?? member?.avatar_url ?? directAvatarUrl;

  const bg = getAvatarColor(effectiveUserId || effectiveName || 'user');
  const sizeClasses: Record<number, string> = {
    28: 'size-7 text-[11px] font-semibold',
    32: 'size-8 text-[11px] font-semibold',
    44: 'size-11 text-sm font-semibold',
    56: 'size-14 text-base font-semibold',
    72: 'size-[72px] text-lg font-semibold',
  };
  const sizeClass = size ? sizeClasses[size] || '' : '';
  const fontClass = size && size >= 44 ? 'text-[15px] font-semibold' : 'font-semibold';
  const ringClass = ring ? 'ring-2 ring-[var(--surface)]' : '';

  return (
    <div
      style={{
        ...(size ? { width: size, height: size } : {}),
        backgroundColor: bg,
      }}
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-snow ${sizeClass} ${fontClass} ${ringClass} ${className}`}
      title={effectiveName || undefined}
    >
      {effectiveAvatarUrl ? (
        <img src={effectiveAvatarUrl} alt={effectiveName || 'Avatar'} className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(effectiveName)}</span>
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
