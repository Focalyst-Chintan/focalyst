import fs from 'node:fs';
const md = fs.readFileSync('ai-persona.md', 'utf8');
fs.mkdirSync('src/lib/ai', { recursive: true });
fs.writeFileSync(
  'src/lib/ai/persona.ts',
  `// Generated from ai-persona.md by scripts/build-persona.mjs.\n// Edit ai-persona.md, then run: npm run persona\nexport const AI_PERSONA = ${JSON.stringify(md)};\n`,
);
console.log('persona.ts written:', md.length, 'characters');
