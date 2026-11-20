import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { getNoteById, deleteNote, upsertNote } from '@/lib/server/azure-db';

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
    return NextResponse.json({ error: 'Note ID is required' }, { status: 400, headers: cors });
  }

  try {
    const note = await getNoteById(auth.user.id, id);
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404, headers: cors });
    }
    return NextResponse.json({ note }, { headers: cors });
  } catch (err: any) {
    console.error('[notes:id:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500, headers: cors });
  }
}

export async function PATCH(
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
    return NextResponse.json({ error: 'Note ID is required' }, { status: 400, headers: cors });
  }

  try {
    const body = await req.json();
    const existing = await getNoteById(auth.user.id, id);
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404, headers: cors });
    }

    const note = await upsertNote(auth.user.id, {
      ...existing,
      ...body,
      id,
    });
    return NextResponse.json({ note }, { headers: cors });
  } catch (err: any) {
    console.error('[notes:id:patch]', err?.message || err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500, headers: cors });
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
    return NextResponse.json({ error: 'Note ID is required' }, { status: 400, headers: cors });
  }

  try {
    const deleted = await deleteNote(auth.user.id, id);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[notes:id:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500, headers: cors });
  }
}
