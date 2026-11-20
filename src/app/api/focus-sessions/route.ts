import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getPomodoroSessionsByUser,
  insertPomodoroSession,
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
    const gte = url.searchParams.get('gte') || undefined;
    const lt = url.searchParams.get('lt') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;

    const sessions = await getPomodoroSessionsByUser(auth.user.id, { gte, lt, limit });
    return NextResponse.json({ sessions }, { headers: cors });
  } catch (err: any) {
    console.error('[focus-sessions:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch focus sessions' }, { status: 500, headers: cors });
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
    const session = await insertPomodoroSession(auth.user.id, body);
    return NextResponse.json({ session }, { status: 201, headers: cors });
  } catch (err: any) {
    console.error('[focus-sessions:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to record focus session' }, { status: 500, headers: cors });
  }
}
