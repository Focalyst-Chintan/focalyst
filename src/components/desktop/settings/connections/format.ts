export const MCP_URL = 'https://focalyst.online/api/mcp';
export const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_BUILD_TARGET === 'mobile';

export const fmtNum = (n: number) => n.toLocaleString('en-US');

/** "27 Oct" */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
}

/** "just now", "5 minutes ago", "2 hours ago", "3 days ago", then a date */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return shortDate(iso);
}

/** Credits with a real minus sign (U+2212) for spending */
export function signed(n: number): string {
  if (n > 0) return `+${fmtNum(n)}`;
  if (n < 0) return `−${fmtNum(Math.abs(n))}`;
  return '0';
}
