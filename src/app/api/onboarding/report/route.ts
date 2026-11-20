import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { getOnboardingProfile, upsertOnboardingProfile } from '@/lib/server/azure-db';

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
    let profile = await getOnboardingProfile(auth.user.id);
    if (!profile) {
      // Fallback check in Supabase
      const { data } = await auth.supabase
        .from('onboarding_profiles')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle();
      if (data) {
        profile = data as any;
      }
    }

    return NextResponse.json({ profile }, { headers: cors });
  } catch (err: any) {
    console.error('[onboarding:report:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch onboarding profile' }, { status: 500, headers: cors });
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
    const body = await req.json().catch(() => ({}));
    const profile = await upsertOnboardingProfile({
      user_id: auth.user.id,
      answers: body.answers || {},
      report: body.report || {},
      completed_at: body.completed_at || (body.completed ? new Date().toISOString() : null),
    });

    // Also mirror to Supabase if available
    try {
      await auth.supabase
        .from('onboarding_profiles')
        .upsert({
          user_id: auth.user.id,
          answers: body.answers || {},
          report: body.report || {},
          completed_at: body.completed_at || (body.completed ? new Date().toISOString() : null),
        }, { onConflict: 'user_id' });
    } catch {}

    return NextResponse.json({ profile }, { headers: cors });
  } catch (err: any) {
    console.error('[onboarding:report:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to save onboarding profile' }, { status: 500, headers: cors });
  }
}
