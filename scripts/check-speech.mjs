import fs from 'node:fs';
const key = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const model = process.argv[2] || 'openai/whisper-large-v3-turbo';
if (!key) { console.log('OPENROUTER key MISSING in .env.local'); process.exit(1); }
for (const [path, name, type] of [['/tmp/fx-test.m4a', 'test.m4a', 'audio/mp4'], ['/tmp/fx-test.wav', 'test.wav', 'audio/wav']]) {
  const fd = new FormData();
  fd.append('file', new File([fs.readFileSync(path)], name, { type }));
  fd.append('model', model);
  const r = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
  console.log(name, 'HTTP', r.status, (await r.text()).slice(0, 200));
}
