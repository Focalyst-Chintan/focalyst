import 'server-only';
import { NextRequest } from 'next/server';
import { POST as billingCheckoutPOST } from '@/app/api/billing/checkout/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.clone().json().catch(() => ({}));
    if (raw && !raw.plan && raw.planType) {
      const newReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify({ ...raw, plan: raw.planType }),
      });
      return billingCheckoutPOST(newReq);
    }
  } catch {
    // fall through to normal POST
  }
  return billingCheckoutPOST(req);
}
