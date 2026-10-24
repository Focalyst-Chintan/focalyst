import 'server-only';

const BASE = process.env.POLAR_SERVER === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';

export class PolarError extends Error {
  constructor(public status: number, public detail: unknown) { super(`polar ${status}`); }
}

export async function polar<T>(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) throw new PolarError(500, 'POLAR_ACCESS_TOKEN missing');

  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    if (!res.ok) {
      console.error('[polar]', opts.method ?? 'GET', path, res.status, JSON.stringify(json?.detail ?? json).slice(0, 800));
      throw new PolarError(res.status, json?.detail ?? json);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
