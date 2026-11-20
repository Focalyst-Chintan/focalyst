import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getCountdownsByUser,
  upsertCountdown,
  deleteCountdown,
} from '@/lib/server/azure-db';

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
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get('active') === 'true';
    const countdowns = await getCountdownsByUser(auth.user.id, activeOnly);
    return NextResponse.json({ countdowns }, { headers: cors });
  } catch (err: any) {
    console.error('[countdowns:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch countdowns' }, { status: 500, headers: cors });
  }
}

export async function POST(req: NextRequest) {
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
    if (!body.event_name || !body.target_date) {
      return NextResponse.json({ error: 'Event name and target date are required' }, { status: 400, headers: cors });
    }

    const countdown = await upsertCountdown(auth.user.id, body);
    return NextResponse.json({ countdown }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[countdowns:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save countdown' }, { status: 500, headers: cors });
  }
}

export async function DELETE(req: NextRequest) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Countdown ID is required' }, { status: 400, headers: cors });
    }

    const deleted = await deleteCountdown(auth.user.id, id);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[countdowns:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete countdown' }, { status: 500, headers: cors });
  }
}
