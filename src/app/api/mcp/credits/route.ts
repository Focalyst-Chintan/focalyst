import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import {
  getMcpCreditSummary,
  getMcpActivity,
  claimDailyMcpBonus,
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
    const { data: profile } = await auth.supabase
      .from('users')
      .select('plan')
      .eq('id', auth.user.id)
      .single();

    const isPro = profile?.plan && profile.plan !== 'free';

    const [summary, activity] = await Promise.all([
      getMcpCreditSummary(auth.user.id, isPro),
      getMcpActivity(auth.user.id, 50),
    ]);

    return NextResponse.json(
      {
        ...summary,
        recentActivity: activity,
      },
      { headers: cors }
    );
  } catch (err: any) {
    console.error('[mcp:credits:get]', err?.message || err);
    return NextResponse.json({ error: 'Failed to fetch MCP credits' }, { status: 500, headers: cors });
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
    const { data: profile } = await auth.supabase
      .from('users')
      .select('plan')
      .eq('id', auth.user.id)
      .single();

    const isPro = profile?.plan && profile.plan !== 'free';
    const result = await claimDailyMcpBonus(auth.user.id, isPro);

    return NextResponse.json(result, { headers: cors });
  } catch (err: any) {
    console.error('[mcp:credits:post]', err?.message || err);
    return NextResponse.json({ error: 'Failed to claim daily bonus' }, { status: 500, headers: cors });
  }
}
