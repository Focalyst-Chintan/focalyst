// scripts/check-polar.mjs
const base = process.env.POLAR_SERVER === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
const token = process.env.POLAR_ACCESS_TOKEN;
if (!token) { console.log('POLAR_ACCESS_TOKEN is missing'); process.exit(1); }
const ids = {
  monthly: process.env.POLAR_PRODUCT_ID_MONTHLY,
  yearly: process.env.POLAR_PRODUCT_ID_YEARLY,
  lifetime: process.env.POLAR_PRODUCT_ID_LIFETIME,
};
for (const [plan, id] of Object.entries(ids)) {
  if (!id) { console.log(`${plan}: product id MISSING`); continue; }
  const r = await fetch(`${base}/v1/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log(`${plan}: ERROR ${r.status}`, r.status === 401 ? '(token invalid, expired or revoked)' : r.status === 404 ? '(product not in this Polar org/server)' : '', JSON.stringify(j.detail ?? '').slice(0, 200));
    continue;
  }
  const prices = (j.prices ?? []).map((p) => `${p.price_amount != null ? (p.price_amount / 100).toFixed(2) : p.amount_type} ${p.price_currency ?? ''}`.trim());
  console.log(`${plan}: "${j.name}" | archived: ${j.is_archived} | recurring: ${j.recurring_interval ?? 'one-time'} | prices: ${prices.join(', ')}`);
}
