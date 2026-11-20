import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getRemindersByUser,
  upsertReminder,
  deleteReminder,
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
    const fromDate = url.searchParams.get('from') || undefined;
    const toDate = url.searchParams.get('to') || undefined;
    const completedParam = url.searchParams.get('is_completed');
    const isCompleted = completedParam !== null ? completedParam === 'true' : undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;

    const reminders = await getRemindersByUser(auth.user.id, {
      fromDate,
      toDate,
      isCompleted,
      limit,
    });

    return NextResponse.json({ reminders }, { headers: cors });
  } catch (err: any) {
    console.error('[reminders:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500, headers: cors });
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
      return NextResponse.json({ error: 'Reminder title is required' }, { status: 400, headers: cors });
    }

    const reminder = await upsertReminder(auth.user.id, body);
    return NextResponse.json({ reminder }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[reminders:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save reminder' }, { status: 500, headers: cors });
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
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400, headers: cors });
    }

    const deleted = await deleteReminder(auth.user.id, id);
    return NextResponse.json({ success: deleted }, { headers: cors });
  } catch (err: any) {
    console.error('[reminders:delete]', err?.message || err);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500, headers: cors });
  }
}
