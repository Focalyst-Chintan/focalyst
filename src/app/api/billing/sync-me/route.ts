import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireUser, originAllowed } from '@/lib/server/auth';
import { reconcileUser } from '@/lib/billing/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await reconcileUser(auth.user);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[sync-me] reconcile error:', err);
    return NextResponse.json(
      { error: 'Could not check your purchase. Please try again.' },
      { status: 502 }
    );
  }
}
