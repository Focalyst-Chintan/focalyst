type Profile = { full_name?: string | null; name?: string | null } | null | undefined;
type AuthUser = { email?: string | null; user_metadata?: Record<string, any> } | null | undefined;

export function getDisplayName(profile: Profile, user: AuthUser): string {
  const raw =
    profile?.full_name || profile?.name ||
    user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  if (raw.trim()) return raw.trim();
  const local = (user?.email ?? '').split('@')[0];
  const first = local.split(/[._\-+0-9]+/).filter(Boolean)[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : 'there';
}

export const getFirstName = (displayName: string) => displayName.trim().split(/\s+/)[0] || 'there';

export function getInitials(displayName: string) {
  const p = displayName.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'F';
}
