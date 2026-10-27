const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

/** Plain text from note HTML: block tags become line breaks, everything else is dropped. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|blockquote|pre|tr)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      const key = e.toLowerCase();
      if (ENTITIES[key] !== undefined) return ENTITIES[key];
      if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16) || 32);
      if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10) || 32);
      return m;
    })
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncate(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  if (max <= 0) return { text: '', truncated: true };
  return { text: text.slice(0, max).trimEnd() + '…', truncated: true };
}

export function clip(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  return truncate(text, max).text;
}

/**
 * Keep letters, numbers, spaces and - _ ' . only, so the value is safe inside a
 * PostgREST or() filter. Returns null when nothing usable is left.
 */
export function sanitizeQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s\-_'.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}
