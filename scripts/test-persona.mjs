import fs from 'node:fs';
const persona = fs.readFileSync('ai-persona.md', 'utf8');
const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: process.argv[2], max_tokens: 4096, reasoning: { effort: 'low', exclude: true },
    messages: [{ role: 'system', content: persona }, { role: 'user', content: 'How productive was I this week? I finished 6 tasks, focused 73 minutes and kept my habits 43 percent of days.' }],
  }),
});
const j = await r.json();
const text = j.choices?.[0]?.message?.content ?? '';
console.log('HTTP', r.status, '| finish', j.choices?.[0]?.finish_reason, '| chars', text.length);
console.log(text.slice(0, 600));
