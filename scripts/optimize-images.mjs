import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
const dir = 'public/landing';
for (const f of await readdir(dir)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  const src = path.join(dir, f);
  const base = src.replace(/\.(png|jpe?g)$/i, '');
  await sharp(src).resize({ width: 2400, withoutEnlargement: true }).avif({ quality: 55 }).toFile(`${base}.avif`);
  await sharp(src).resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${base}.webp`);
}
