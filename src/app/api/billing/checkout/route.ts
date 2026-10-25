import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser, originAllowed } from '@/lib/server/auth';
import { polar, PolarError } from '@/lib/billing/polar';
import { PLAN_KEYS, productIdFor, PLAN_VALUE, FREE_VALUE } from '@/lib/billing/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  plan: z.enum(PLAN_KEYS),
  returnPath: z.enum(['/paywall', '/pricing', '/onboarding/plans']).optional().default('/paywall'),
});
const FRIENDLY = 'Could not open checkout. Please try again, or email contactfocalyst@gmail.com.';

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in again.', code: 'auth' }, { status: 401 });
  const { user, supabase } = auth;

  let plan: (typeof PLAN_KEYS)[number];
  let returnPath: '/paywall' | '/pricing' | '/onboarding/plans';
  try {
    const parsed = Body.parse(await req.json());
    plan = parsed.plan;
    returnPath = parsed.returnPath;
  }
  catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }

  // Do not sell a second plan to someone who already has Pro.
  // Allowed: a monthly or yearly subscriber buying Lifetime.
  const { data: row } = await supabase.from('users').select('plan, plan_expires_at').eq('id', user.id).maybeSingle();
  const active = !!row?.plan && row.plan !== (FREE_VALUE ?? 'free') && (!row.plan_expires_at || new Date(row.plan_expires_at) > new Date());
  if (active && (row!.plan === PLAN_VALUE.lifetime || plan !== 'lifetime')) {
    return NextResponse.json({ code: 'already_pro' }, { status: 409 });
  }

  const origin = req.nextUrl.origin; // always the domain the visitor is on, so no cross-domain surprises

  // Polar picks USD or INR from the location of the IP that creates the checkout.
  // This route runs on a Vercel server, so we MUST pass the visitor's IP, otherwise
  // every Indian visitor is charged in USD.
  const visitorIp =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined;

  const body = {
    products: [productIdFor(plan)],
    customer_ip_address: visitorIp,
    success_url: `${origin}/billing/success?checkout_id={CHECKOUT_ID}`,
    return_url: `${origin}${returnPath}`,
    customer_email: user.email ?? undefined,
    metadata: { user_id: user.id, plan, source: 'web' },
    allow_discount_codes: true,
  };

  try {
    let checkout: { url: string };
    try {
      checkout = await polar('/v1/checkouts/', { method: 'POST', body: { ...body, external_customer_id: user.id } });
    } catch (e) {
      // Some older Polar customers exist with this email but no external id. Retry once without it;
      // metadata.user_id still lets the webhook find the user.
      if (e instanceof PolarError && e.status === 422) {
        checkout = await polar('/v1/checkouts/', { method: 'POST', body });
      } else {
        throw e;
      }
    }
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    const status = e instanceof PolarError ? e.status : 500;
    const code = status === 401 || status === 403 ? 'polar_auth' : 'polar_error';
    console.error('[billing/checkout]', code, status);
    return NextResponse.json({ error: FRIENDLY, code }, { status: 502 });
  }
}
