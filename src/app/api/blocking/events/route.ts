import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { insertBlockingEvents, getBlockingEvents } from '@/lib/server/azure-db';

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

  const limitParam = req.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 500) : 200;

  try {
    const events = await getBlockingEvents(auth.user.id, limit);
    return NextResponse.json({ events }, { headers: cors });
  } catch (err: any) {
    console.error('[blocking:events:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch blocking events' }, { status: 500, headers: cors });
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
    const body = await req.json().catch(() => ({}));
    let rawEvents: any[] = [];
    if (Array.isArray(body)) {
      rawEvents = body;
    } else if (Array.isArray(body.events)) {
      rawEvents = body.events;
    } else if (body && typeof body === 'object' && body.type) {
      rawEvents = [body];
    }

    if (rawEvents.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400, headers: cors });
    }

    const eventsToInsert = rawEvents.map((e) => ({
      session_id: e.session_id || '00000000-0000-0000-0000-000000000000',
      user_id: auth.user.id,
      type: e.type, // 'attempt' | 'unlock'
      app_label: e.app_label || e.app_name || null,
      app_key: e.app_key || e.bundle_id || e.app_id || null,
      minute_into_block: e.minute_into_block != null ? Number(e.minute_into_block) : null,
      reason: e.reason || null,
      unlock_minutes: e.unlock_minutes != null ? Number(e.unlock_minutes) : null,
      at: e.at || e.timestamp || new Date().toISOString(),
    }));

    await insertBlockingEvents(eventsToInsert);

    // Also optionally forward to Supabase if table exists
    try {
      await auth.supabase
        .from('blocking_events')
        .insert(eventsToInsert);
    } catch {}

    return NextResponse.json({ success: true, count: eventsToInsert.length }, { headers: cors });
  } catch (err: any) {
    console.error('[blocking:events:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to log blocking events' }, { status: 500, headers: cors });
  }
}
