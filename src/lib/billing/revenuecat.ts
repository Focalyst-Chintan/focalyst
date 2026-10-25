import 'server-only';

const RC = 'https://api.revenuecat.com/v1';

function cfg() {
  const key = process.env.REVENUECAT_SECRET_KEY;
  const ent = process.env.REVENUECAT_ENTITLEMENT_ID;
  return key && ent ? { key, ent } : null;
}

export async function rcGrant(userId: string, plan: 'pro_monthly' | 'pro_yearly' | 'lifetime', expiresAt: string | null) {
  const c = cfg();
  if (!c) return;
  const body = plan === 'lifetime' || !expiresAt ? { duration: 'lifetime' } : { end_time_ms: new Date(expiresAt).getTime() };
  try {
    const r = await fetch(`${RC}/subscribers/${encodeURIComponent(userId)}/entitlements/${encodeURIComponent(c.ent)}/promotional`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error('[revenuecat] grant failed', r.status, (await r.text()).slice(0, 200));
    else console.info('[revenuecat] granted', plan);
  } catch (e) {
    console.error('[revenuecat] grant error', String(e).slice(0, 200));
  }
}

export async function rcRevoke(userId: string) {
  const c = cfg();
  if (!c) return;
  try {
    const r = await fetch(`${RC}/subscribers/${encodeURIComponent(userId)}/entitlements/${encodeURIComponent(c.ent)}/revoke_promotionals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.key}` },
    });
    if (!r.ok) console.error('[revenuecat] revoke failed', r.status);
  } catch (e) {
    console.error('[revenuecat] revoke error', String(e).slice(0, 200));
  }
}
