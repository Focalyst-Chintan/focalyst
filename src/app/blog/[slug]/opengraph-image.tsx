import { ImageResponse } from 'next/og';
import { getPost } from '@/lib/blog/source';
import { PILLARS } from '@/lib/blog/constants';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Focalyst Journal';

let fontCache: Promise<ArrayBuffer | null> | null = null;

// Instrument Serif, fetched once per instance
function serif() {
  if (!fontCache) {
    fontCache = (async () => {
      try {
        const css = await fetch('https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534' },
        }).then((r) => r.text());
        const src = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
        if (!src) return null;
        return await fetch(src).then((r) => r.arrayBuffer());
      } catch {
        return null;
      }
    })();
  }
  return fontCache;
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.08'/></svg>\")";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, font] = await Promise.all([getPost(slug), serif()]);
  const title = post?.title ?? 'The Focalyst Journal';
  const pillar = post?.pillar ? PILLARS[post.pillar].name : 'The Focalyst Journal';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          color: 'white',
          backgroundColor: '#03195B',
          backgroundImage: `${GRAIN}, radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 45%, #03195B 100%)`,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8 }}>{pillar}</div>
        <div
          style={{
            fontFamily: font ? 'Instrument Serif' : 'serif',
            fontSize: title.length > 48 ? 64 : 76,
            lineHeight: 1.08,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 24, opacity: 0.85 }}>focalyst.online</div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Instrument Serif', data: font, style: 'normal', weight: 400 }] : undefined,
    }
  );
}
