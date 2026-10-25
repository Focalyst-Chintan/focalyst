// scripts/backfill-revenuecat.mjs
// Usage: node --env-file=.env.local scripts/backfill-revenuecat.mjs [--apply]

import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rcKey = process.env.REVENUECAT_SECRET_KEY;
const rcEnt = process.env.REVENUECAT_ENTITLEMENT_ID;

if (!url || !serviceKey) {
  console.error('Supabase URL or Service Role Key missing in environment.');
  process.exit(1);
}

if (apply && (!rcKey || !rcEnt)) {
  console.error('REVENUECAT_SECRET_KEY or REVENUECAT_ENTITLEMENT_ID missing in environment for --apply.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, plan, plan_expires_at, billing_provider')
    .in('plan', ['pro_monthly', 'pro_yearly', 'lifetime']);

  if (usersErr) {
    console.error('Error fetching users:', usersErr);
    process.exit(1);
  }

  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('user_id, provider, status')
    .in('status', ['active']);

  if (subsErr) {
    console.error('Error fetching subscriptions:', subsErr);
    process.exit(1);
  }

  const polarSubUserIds = new Set(
    (subs || [])
      .filter((s) => s.provider === 'polar' || s.provider == null)
      .map((s) => s.user_id)
  );

  const now = new Date();
  const eligible = [];

  for (const u of users || []) {
    const isPolarUser = u.billing_provider === 'polar' || polarSubUserIds.has(u.id);
    if (!isPolarUser) continue;

    // Skip expired monthly / yearly plans
    if (u.plan !== 'lifetime') {
      if (u.plan_expires_at && new Date(u.plan_expires_at) < now) {
        continue;
      }
    }

    eligible.push(u);
  }

  console.log(`Found ${eligible.length} eligible Polar Pro/Lifetime user(s).`);

  if (!apply) {
    console.log('Dry run (use --apply to grant RevenueCat promotional entitlements):');
    for (const u of eligible) {
      const prefix = u.id.slice(0, 8);
      console.log(`- User ID prefix: ${prefix}... | Plan: ${u.plan} | Expires: ${u.plan_expires_at ?? 'Never'}`);
    }
    return;
  }

  console.log('Applying RevenueCat promotional entitlement grants...');
  const RC = 'https://api.revenuecat.com/v1';

  let grantedCount = 0;
  for (const u of eligible) {
    const prefix = u.id.slice(0, 8);
    const body = u.plan === 'lifetime' || !u.plan_expires_at
      ? { duration: 'lifetime' }
      : { end_time_ms: new Date(u.plan_expires_at).getTime() };

    try {
      const r = await fetch(`${RC}/subscribers/${encodeURIComponent(u.id)}/entitlements/${encodeURIComponent(rcEnt)}/promotional`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${rcKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        console.error(`[revenuecat] grant failed for ${prefix}... status: ${r.status}`);
      } else {
        grantedCount++;
        console.log(`[revenuecat] granted ${u.plan} for ${prefix}...`);
      }
    } catch (e) {
      console.error(`[revenuecat] error for ${prefix}...`, String(e).slice(0, 100));
    }
  }

  console.log(`Finished. Successfully granted: ${grantedCount}/${eligible.length}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
