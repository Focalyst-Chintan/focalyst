import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getNotesByUser,
  upsertNote,
  deleteNote,
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
    const pinnedParam = url.searchParams.get('is_pinned');
    const isPinned = pinnedParam !== null ? pinnedParam === 'true' : undefined;
    const archivedParam = url.searchParams.get('is_archived');
    const isArchived = archivedParam !== null ? archivedParam === 'true' : undefined;
    const search = url.searchParams.get('search') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;

    const notes = await getNotesByUser(auth.user.id, {
      isPinned,
      isArchived,
      search,
      limit,
    });

    return NextResponse.json({ notes }, { headers: cors });
  } catch (err: any) {
    console.error('[notes:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500, headers: cors });
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
    if (!body.title && !body.content) {
      return NextResponse.json({ error: 'Title or content is required' }, { status: 400, headers: cors });
    }

    const note = await upsertNote(auth.user.id, {
      ...body,
      title: body.title || 'Untitled Note',
    });
    return NextResponse.json({ note }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[notes:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500, headers: cors });
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
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400, headers: cors });
    }

    const deleted = await deleteNote(auth.user.id, id);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[notes:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500, headers: cors });
  }
}
