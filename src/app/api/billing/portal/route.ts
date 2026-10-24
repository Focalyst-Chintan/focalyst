import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { requireUser, originAllowed } from '@/lib/server/auth';
import { polar } from '@/lib/billing/polar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const auth = await requireUser(req);
  if (!auth) return NextResponse.json({ error: 'Please sign in again.', code: 'auth' }, { status: 401 });
  const { user, supabase } = auth;
  const return_url = `${req.nextUrl.origin}/settings`;

  const attempts: Array<() => Promise<{ customer_portal_url: string }>> = [
    () => polar('/v1/customer-sessions/', { method: 'POST', body: { external_customer_id: user.id, return_url } }),
    async () => {
      const { data } = await supabase.from('users').select('polar_customer_id').eq('id', user.id).maybeSingle();
      if (!data?.polar_customer_id) throw new Error('no polar id');
      return polar('/v1/customer-sessions/', { method: 'POST', body: { customer_id: data.polar_customer_id, return_url } });
    },
    async () => {
      if (!user.email) throw new Error('no email');
      const list = await polar<{ items: { id: string }[] }>('/v1/customers/', { query: { email: user.email } });
      if (!list.items?.[0]) throw new Error('no customer');
      return polar('/v1/customer-sessions/', { method: 'POST', body: { customer_id: list.items[0].id, return_url } });
    },
  ];

  for (const attempt of attempts) {
    try { const s = await attempt(); return NextResponse.json({ url: s.customer_portal_url }); } catch { /* try next */ }
  }
  return NextResponse.json({ error: 'We could not find your billing account. Email contactfocalyst@gmail.com and we will sort it out.', code: 'no_customer' }, { status: 404 });
}
