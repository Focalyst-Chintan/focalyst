import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  logHabit,
  deleteHabitLog,
  getHabitLogsByUser,
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
    const since = url.searchParams.get('since') || undefined;
    const habitIds = url.searchParams.getAll('habit_id');
    const logs = await getHabitLogsByUser(auth.user.id, since, habitIds.length > 0 ? habitIds : undefined);
    return NextResponse.json({ logs }, { headers: cors });
  } catch (err: any) {
    console.error('[habits:log:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch habit logs' }, { status: 500, headers: cors });
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
    const { habit_id, completed_date } = body;
    if (!habit_id) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400, headers: cors });
    }

    const log = await logHabit(auth.user.id, habit_id, completed_date);
    return NextResponse.json({ log }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[habits:log:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to log habit' }, { status: 500, headers: cors });
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
    const habitId = url.searchParams.get('habit_id');
    const date = url.searchParams.get('completed_date') || new Date().toISOString().slice(0, 10);

    if (!habitId) {
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400, headers: cors });
    }

    const deleted = await deleteHabitLog(auth.user.id, habitId, date);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[habits:log:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete habit log' }, { status: 500, headers: cors });
  }
}
