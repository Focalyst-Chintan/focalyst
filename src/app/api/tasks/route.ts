import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getTasksByUser,
  upsertTask,
  deleteTask,
  updateTaskCompletion,
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
    const status = url.searchParams.get('status');
    const dueFrom = url.searchParams.get('due_from') || undefined;
    const dueTo = url.searchParams.get('due_to') || undefined;
    const priority = url.searchParams.get('priority') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;

    const isCompleted = status === 'completed' ? true : status === 'open' ? false : undefined;

    const tasks = await getTasksByUser(auth.user.id, {
      isCompleted,
      dueFrom,
      dueTo,
      priority,
      limit,
    });

    return NextResponse.json({ tasks }, { headers: cors });
  } catch (err: any) {
    console.error('[tasks:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500, headers: cors });
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
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400, headers: cors });
    }

    const task = await upsertTask(auth.user.id, body);
    return NextResponse.json({ task }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[tasks:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save task' }, { status: 500, headers: cors });
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
    const { id, is_completed, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400, headers: cors });
    }

    if (is_completed !== undefined && Object.keys(rest).length === 0) {
      const task = await updateTaskCompletion(auth.user.id, id, Boolean(is_completed));
      return NextResponse.json({ task }, { headers: cors });
    }

    const task = await upsertTask(auth.user.id, { id, is_completed, ...rest });
    return NextResponse.json({ task }, { headers: cors });
  } catch (err: any) {
    console.error('[tasks:patch]', err?.message || err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500, headers: cors });
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
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400, headers: cors });
    }

    const deleted = await deleteTask(auth.user.id, id);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[tasks:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500, headers: cors });
  }
}
