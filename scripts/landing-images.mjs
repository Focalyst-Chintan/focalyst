import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dl = path.join(os.homedir(), 'Downloads');
const map = [
  ['chat-ui.png', 'ai-chat.webp'],
  ['pomodoro.png', 'pomodoro.webp'],
  ['plan.png', 'plan.webp'],
  ['voice-ui.png', 'voice-ui.webp'],
];
fs.mkdirSync('public/landing/app', { recursive: true });
for (const [src, out] of map) {
  const from = path.join(dl, src);
  if (!fs.existsSync(from)) { console.log('MISSING', from); process.exitCode = 1; continue; }
  const dest = path.join('public/landing/app', out);
  const meta = await sharp(from).metadata();
  const info = await sharp(from)
    .resize({ height: 1600, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100 })
    .toFile(dest);
  console.log(`${src} -> ${dest} | ${info.width}x${info.height} | ${Math.round(info.size / 1024)} KB | transparent: ${meta.hasAlpha}`);
}
