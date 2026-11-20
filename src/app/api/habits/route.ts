import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getHabitsByUser,
  upsertHabit,
  deleteHabit,
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
    const habits = await getHabitsByUser(auth.user.id, activeOnly);
    return NextResponse.json({ habits }, { headers: cors });
  } catch (err: any) {
    console.error('[habits:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500, headers: cors });
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
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Habit name is required' }, { status: 400, headers: cors });
    }

    const habit = await upsertHabit(auth.user.id, body);
    return NextResponse.json({ habit }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[habits:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save habit' }, { status: 500, headers: cors });
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
      return NextResponse.json({ error: 'Habit ID is required' }, { status: 400, headers: cors });
    }

    const deleted = await deleteHabit(auth.user.id, id);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[habits:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500, headers: cors });
  }
}
