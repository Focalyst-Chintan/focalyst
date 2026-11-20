import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { insertBlockingSession, getBlockingSessions } from '@/lib/server/azure-db';

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
  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 200) : 100;

  try {
    const sessions = await getBlockingSessions(auth.user.id, limit);
    return NextResponse.json({ sessions }, { headers: cors });
  } catch (err: any) {
    console.error('[blocking:sessions:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch blocking sessions' }, { status: 500, headers: cors });
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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400, headers: cors });
    }

    const session = await insertBlockingSession({
      id: body.id,
      user_id: auth.user.id,
      local_session_id: body.local_session_id || null,
      pomodoro_session_id: body.pomodoro_session_id || null,
      kind: body.kind || 'pomodoro',
      level: body.level || 'strict',
      started_at: body.started_at || new Date().toISOString(),
      ended_at: body.ended_at || null,
      planned_sets: body.planned_sets ?? null,
      completed_sets: body.completed_sets ?? null,
      ended_early: body.ended_early ?? false,
      attempts_count: body.attempts_count ?? 0,
      unlocks_count: body.unlocks_count ?? 0,
      emergency_used: body.emergency_used ?? false,
      interrupted: body.interrupted ?? false,
      platform: body.platform || null,
    });

    return NextResponse.json({ session }, { headers: cors });
  } catch (err: any) {
    console.error('[blocking:sessions:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save blocking session' }, { status: 500, headers: cors });
  }
}
