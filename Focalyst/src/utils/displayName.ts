type NameSource = { full_name?: string | null } | null | undefined;
type AuthUserLike = { user_metadata?: Record<string, any> | null } | null | undefined;

const usableName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  // An email is never a name: some accounts had full_name overwritten with their address.
  if (!trimmed || trimmed.includes('@')) return null;
  return trimmed;
};

/** The user's name, or null when none is known. Never falls back to the email. */
export function getDisplayName(profile: NameSource, authUser?: AuthUserLike): string | null {
  const meta = authUser?.user_metadata ?? {};
  return usableName(profile?.full_name) ?? usableName(meta.full_name) ?? usableName(meta.name);
}

/** First word of the display name, for greetings. */
export function getFirstName(profile: NameSource, authUser?: AuthUserLike): string | null {
  const name = getDisplayName(profile, authUser);
  return name ? name.split(/\s+/)[0] : null;
}
