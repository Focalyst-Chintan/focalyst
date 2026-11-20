import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { getUserProfile, updateUserProfile } from '@/lib/server/azure-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function GET(req: NextRequest) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const profile = await getUserProfile(auth.user.id);
    return NextResponse.json({ profile }, { headers: cors });
  } catch (err: any) {
    console.error('[profile:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500, headers: cors });
  }
}

export async function PATCH(req: NextRequest) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json();
    const profile = await updateUserProfile(auth.user.id, body);
    return NextResponse.json({ profile }, { headers: cors });
  } catch (err: any) {
    console.error('[profile:patch]', err?.message || err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500, headers: cors });
  }
}
