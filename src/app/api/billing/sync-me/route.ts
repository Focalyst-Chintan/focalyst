import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireUser, originAllowed } from '@/lib/server/auth';
import { reconcileUser } from '@/lib/billing/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = originAllowed(req);
  return {
    ...(allowed && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const cors = getCorsHeaders(req);

  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const result = await reconcileUser(auth.user);
    return NextResponse.json(result, { headers: cors });
  } catch (err) {
    console.error('[sync-me] reconcile error:', err);
    return NextResponse.json(
      { error: 'Could not check your purchase. Please try again.' },
      { status: 502, headers: cors }
    );
  }
}
