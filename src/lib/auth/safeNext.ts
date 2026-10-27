export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v.startsWith('/') || v.startsWith('//')) return null;
  if (/[\\\u0000-\u001f]/.test(v)) return null;
  if (/^\/(api|auth)(\/|$)/.test(v)) return null;
  return v;
}

export const isOAuthReturn = (p: string | null) => !!p && p.startsWith('/oauth/');
