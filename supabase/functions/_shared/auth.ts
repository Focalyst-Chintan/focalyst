// Accepts the scheduler's x-cron-secret, or the service role key as a bearer token
// (for manual runs by the owner). Constant-time compares.
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export function authorized(req: Request): boolean {
  const cron = Deno.env.get("CRON_SECRET");
  const given = req.headers.get("x-cron-secret");
  if (cron && given && safeEqual(given, cron)) return true;

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return !!(service && bearer && safeEqual(bearer, service));
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
