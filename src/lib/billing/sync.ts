import 'server-only';
import { supabaseAdmin } from '@/lib/server/supabaseAdmin';
import { planForProduct, PLAN_VALUE, FREE_VALUE } from '@/lib/billing/plans';

type Ev =
  | 'order.paid' | 'order.refunded'
  | 'subscription.active' | 'subscription.updated' | 'subscription.uncanceled'
  | 'subscription.canceled' | 'subscription.revoked';

async function resolveUserId(d: any): Promise<string | null> {
  const direct =
    d?.customer?.externalId ??
    d?.customer?.external_id ??
    d?.metadata?.user_id ??
    d?.metadata?.userId ??
    d?.customer?.metadata?.user_id ??
    d?.customer?.metadata?.userId;
  if (direct) return String(direct);

  const cid = d?.customerId ?? d?.customer_id ?? d?.customer?.id;
  if (cid) {
    const { data } = await supabaseAdmin.from('users').select('id').eq('polar_customer_id', cid).maybeSingle();
    if (data?.id) return data.id;
  }
  const email = d?.customer?.email ?? d?.customer_email ?? d?.customerEmail;
  if (email) {
    const { data } = await supabaseAdmin.rpc('user_id_by_email', { p_email: email });
    if (data) return data as string;
  }
  return null;
}

export async function applyPolarEvent(type: Ev, d: any) {
  const plan = planForProduct(
    d?.productId ??
    d?.product_id ??
    d?.product?.id ??
    d?.items?.[0]?.productId ??
    d?.items?.[0]?.product_id
  );
  if (!plan) { console.warn('[polar] ignoring event for unknown product', type); return; }

  const userId = await resolveUserId(d);
  if (!userId) { console.error('[polar] no matching user', type, d?.id); return; } // 200, no retry loop

  const { data: row, error: readErr } = await supabaseAdmin
    .from('users').select('plan, plan_expires_at, billing_provider').eq('id', userId).maybeSingle();
  if (readErr) throw readErr; // 500, Polar retries

  const isLifetime = row?.plan === PLAN_VALUE.lifetime;

  // Never downgrade store buyers (Apple or Google)
  const { data: storeSub } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .in('provider', ['apple', 'google'])
    .in('status', ['active'])
    .maybeSingle();

  const fromStore = row?.billing_provider === 'apple' || row?.billing_provider === 'google' || Boolean(storeSub?.id);
  const cid = d?.customerId ?? d?.customer_id ?? d?.customer?.id ?? null;

  let update: Record<string, unknown> | null = null;
  const rawPeriodEnd = d?.currentPeriodEnd ?? d?.current_period_end ?? null;
  const periodEnd = rawPeriodEnd
    ? (rawPeriodEnd instanceof Date ? rawPeriodEnd.toISOString() : new Date(rawPeriodEnd).toISOString())
    : null;

  switch (type) {
    case 'order.paid':
      // Subscriptions are handled by subscription events. Only Lifetime is granted here.
      if (plan === 'lifetime') update = { plan: PLAN_VALUE.lifetime, plan_expires_at: null };
      break;

    case 'order.refunded':
      if (plan === 'lifetime' && isLifetime && !fromStore && d?.status === 'refunded') {
        update = { plan: FREE_VALUE, plan_expires_at: null };
      }
      break;

    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.uncanceled':
    case 'subscription.canceled': // cancel at period end: keep Pro until current_period_end
      if (isLifetime) break;
      if (d?.status === 'active' || d?.status === 'trialing') {
        update = { plan: PLAN_VALUE[plan], plan_expires_at: periodEnd };
      } else if (!fromStore) {
        update = { plan: FREE_VALUE, plan_expires_at: null };
      }
      break;

    case 'subscription.revoked':
      if (!isLifetime && !fromStore) update = { plan: FREE_VALUE, plan_expires_at: null };
      break;
  }

  // Update users table
  if (update) {
    const grants = update.plan !== FREE_VALUE;
    const { error } = await supabaseAdmin
      .from('users')
      .update({ ...update, ...(grants ? { billing_provider: 'polar' } : {}), ...(cid ? { polar_customer_id: cid } : {}) })
      .eq('id', userId);
    if (error) throw error;
    console.info('[polar] applied user update', type, plan, grants ? 'grant' : 'revoke');
  }

  // Maintain subscriptions table matching old webhook behavior
  try {
    if (type === 'order.paid' && plan === 'lifetime') {
      const orderId = d?.id ?? null;
      const startedAt = d?.createdAt instanceof Date ? d.createdAt.toISOString() : (d?.createdAt ?? new Date().toISOString());
      await supabaseAdmin.from('subscriptions').insert({
        user_id: userId,
        plan: PLAN_VALUE.lifetime,
        status: 'active',
        provider: 'polar',
        polar_order_id: orderId,
        amount_paise: d?.amount ?? 0,
        currency: (d?.currency ?? 'USD').toUpperCase(),
        started_at: startedAt,
        expires_at: null,
      });
    } else if (type === 'order.refunded' && plan === 'lifetime') {
      const orderId = d?.id ?? '';
      await supabaseAdmin.from('subscriptions').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      }).eq('user_id', userId).eq('polar_order_id', orderId);
    } else if (
      type === 'subscription.active' ||
      type === 'subscription.updated' ||
      type === 'subscription.uncanceled' ||
      type === 'subscription.canceled' ||
      type === 'subscription.revoked'
    ) {
      const subId = d?.id ?? null;
      if (subId) {
        const isCancelled = type === 'subscription.canceled';
        const isRevoked = type === 'subscription.revoked';
        const status = isRevoked ? 'cancelled' : isCancelled ? 'cancelled' : (d?.status === 'active' || d?.status === 'trialing' ? 'active' : 'expired');
        const startedAt = d?.startedAt instanceof Date ? d.startedAt.toISOString() : (d?.startedAt ?? new Date().toISOString());

        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('polar_subscription_id', subId)
          .maybeSingle();

        if (existingSub) {
          await supabaseAdmin.from('subscriptions').update({
            plan: PLAN_VALUE[plan],
            status,
            expires_at: periodEnd,
            ...(isCancelled || isRevoked ? { cancelled_at: new Date().toISOString() } : {}),
          }).eq('id', existingSub.id);
        } else {
          await supabaseAdmin.from('subscriptions').insert({
            user_id: userId,
            plan: PLAN_VALUE[plan],
            status,
            provider: 'polar',
            polar_subscription_id: subId,
            amount_paise: d?.amount ?? 0,
            currency: (d?.currency ?? 'USD').toUpperCase(),
            started_at: startedAt,
            expires_at: periodEnd,
            ...(isCancelled || isRevoked ? { cancelled_at: new Date().toISOString() } : {}),
          });
        }
      }
    }
  } catch (subErr) {
    console.error('[polar] error updating subscriptions table:', subErr);
  }
}
