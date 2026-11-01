import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { rateLimit } from '@/lib/rate-limit';
import { BLOG_TAG, getPost } from '@/lib/blog/source';

// Called by the blog-worker Edge Function after it publishes a post.
// No user session (like the Polar webhook); the shared secret is the auth.
const SLUG = /^[a-z0-9-]{1,80}$/;

function secretMatches(given: string | null) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(`revalidate:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (!secretMatches(req.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let slug: unknown;
  try {
    ({ slug } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (typeof slug !== 'string' || !SLUG.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  // Expire the cached Supabase reads first so every route below rebuilds with fresh data
  revalidateTag(BLOG_TAG, { expire: 0 });
  const post = await getPost(slug);
  revalidatePath(`/blog/${slug}`);
  revalidatePath('/blog');
  if (post?.pillar) revalidatePath(`/blog/topics/${post.pillar}`);
  else revalidatePath('/blog/topics/[pillar]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/blog/rss.xml');
  revalidatePath('/llms.txt');
  revalidatePath('/llms-full.txt');

  return NextResponse.json({ revalidated: true, slug });
}
