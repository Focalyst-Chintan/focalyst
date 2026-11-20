import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { getHabitGroupById, leaveHabitGroup } from '@/lib/server/azure-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400, headers: cors });
  }

  try {
    const group = await getHabitGroupById(id);
    if (!group) {
      return NextResponse.json({ error: 'Habit group not found' }, { status: 404, headers: cors });
    }
    return NextResponse.json({ group }, { headers: cors });
  } catch (err: any) {
    console.error('[habit-groups:id:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch habit group' }, { status: 500, headers: cors });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400, headers: cors });
  }

  try {
    const left = await leaveHabitGroup(auth.user.id, id);
    return NextResponse.json({ success: left }, { headers: cors });
  } catch (err: any) {
    console.error('[habit-groups:id:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to leave habit group' }, { status: 500, headers: cors });
  }
}
