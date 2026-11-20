import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { getBlockingSettings, upsertBlockingSettings } from '@/lib/server/azure-db';

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
    const settings = await getBlockingSettings(auth.user.id);
    return NextResponse.json({ settings }, { headers: cors });
  } catch (err: any) {
    console.error('[blocking:settings:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch blocking settings' }, { status: 500, headers: cors });
  }
}

export async function POST(req: NextRequest) {
  return handleSave(req);
}

export async function PUT(req: NextRequest) {
  return handleSave(req);
}

async function handleSave(req: NextRequest) {
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
    const settings = await upsertBlockingSettings({
      user_id: auth.user.id,
      level: body.level || null,
      unblock_on_breaks: body.unblock_on_breaks ?? null,
      notify_lock_unlock: body.notify_lock_unlock ?? null,
      android_blocklist: Array.isArray(body.android_blocklist) ? body.android_blocklist : null,
      android_allowlist: Array.isArray(body.android_allowlist) ? body.android_allowlist : null,
    });

    return NextResponse.json({ settings }, { headers: cors });
  } catch (err: any) {
    console.error('[blocking:settings:save]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save blocking settings' }, { status: 500, headers: cors });
  }
}
