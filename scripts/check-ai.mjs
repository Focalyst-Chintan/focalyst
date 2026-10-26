// scripts/check-ai.mjs
const pick = (...n) => { for (const k of n) if (process.env[k]) return [k, process.env[k]]; return ['MISSING', null]; };
const [orName, orKey] = pick('OPENROUTER_API_KEY', 'NEXT_PUBLIC_OPENROUTER_API_KEY', 'EXPO_PUBLIC_OPENROUTER_API_KEY');
const [gName, gKey] = pick('GEMINI_API_KEY', 'NEXT_PUBLIC_GEMINI_API_KEY', 'EXPO_PUBLIC_GEMINI_API_KEY');
console.log('keys from:', 'openrouter', orName, '| gemini', gName);
async function t(name, fn) {
  const s = Date.now();
  try { const r = await fn(); const x = await r.text(); console.log(`${name}: HTTP ${r.status} ${Date.now() - s}ms ${r.ok ? 'OK' : x.slice(0, 250)}`); }
  catch (e) { console.log(`${name}: NETWORK ERROR ${e.message}`); }
}
if (orKey) {
  const k = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${orKey}` } });
  const j = await k.json().catch(() => ({}));
  console.log(`openrouter key: HTTP ${k.status} usage ${j.data?.usage ?? '-'} limit ${j.data?.limit ?? 'none'} remaining ${j.data?.limit_remaining ?? '-'}`);
  if (orModel) await t(`openrouter ${orModel}`, () => fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${orKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: orModel, max_tokens: 10, messages: [{ role: 'user', content: 'Say ok' }] }) }));
  if (speechModel && speechModel.includes('whisper')) {
    const m = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${orKey}` } });
    const mj = await m.json().catch(() => ({}));
    const found = (mj.data ?? []).some((mod) => mod.id === speechModel);
    console.log(`openrouter models: HTTP ${m.status} | speech model (${speechModel}) available: ${found}`);
  }
}
if (gKey && gModel && !gModel.includes('/')) await t(`gemini ${gModel}`, () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': gKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say ok' }] }], generationConfig: { maxOutputTokens: 10 } }) }));

