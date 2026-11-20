import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getHabitGroupsByUser,
  createHabitGroup,
  joinHabitGroup,
  leaveHabitGroup,
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
    const groups = await getHabitGroupsByUser(auth.user.id);
    return NextResponse.json({ groups }, { headers: cors });
  } catch (err: any) {
    console.error('[habit-groups:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch habit groups' }, { status: 500, headers: cors });
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
    const { action, name, invite_code, max_members, habit_id } = body;

    if (action === 'join') {
      if (!invite_code) {
        return NextResponse.json({ error: 'Invite code is required to join a group' }, { status: 400, headers: cors });
      }
      const membership = await joinHabitGroup(auth.user.id, invite_code, habit_id);
      return NextResponse.json({ membership }, { status: 200, headers: cors });
    }

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400, headers: cors });
    }

    const group = await createHabitGroup(auth.user.id, name, max_members || 5);
    return NextResponse.json({ group }, { status: 201, headers: cors });
  } catch (err: any) {
    console.error('[habit-groups:post]', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Failed to process habit group' }, { status: 500, headers: cors });
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
    const groupId = url.searchParams.get('id');
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400, headers: cors });
    }

    const left = await leaveHabitGroup(auth.user.id, groupId);
    return NextResponse.json({ success: left }, { headers: cors });
  } catch (err: any) {
    console.error('[habit-groups:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to leave habit group' }, { status: 500, headers: cors });
  }
}
