import { createClient } from '@supabase/supabase-js';
import { isPillar, type Pillar } from './constants';

// Columns of public.blog_posts (BLOG_01_schema.sql)
export type BlogStatus = 'draft' | 'needs_review' | 'published' | 'archived';
export type BlogKind = 'article' | 'comparison' | 'news' | 'guide';

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogSource {
  title: string;
  url: string;
  publisher?: string;
  checked?: string;
}

export interface BlogComparison {
  columns: string[];
  rows: string[][];
}

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  content_md: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[];
  author: string;
  status: BlogStatus;
  reading_minutes: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  meta_title: string | null;
  quick_answer: string | null;
  faq: BlogFaq[];
  sources: BlogSource[];
  comparison: BlogComparison | null;
  pillar: string | null;
  kind: BlogKind;
  primary_keyword: string | null;
  secondary_keywords: string[];
  my_term: string | null;
  word_count: number | null;
  topic_id: string | null;
  job_id: string | null;
  ai_assisted: boolean;
  checks: unknown;
}

// Shape the cards and pages use
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  tags: string[];
  /** Display date, e.g. "1 Nov 2026" */
  publishedAt: string;
  publishedIso: string;
  updatedIso: string;
  readingMinutes: number;
  pillar: Pillar | null;
  kind: BlogKind;
  contentMd?: string;
  metaTitle?: string;
  quickAnswer?: string;
  faq: BlogFaq[];
  sources: BlogSource[];
  comparison: BlogComparison | null;
  primaryKeyword?: string;
  secondaryKeywords: string[];
  author: string;
  aiAssisted: boolean;
}

const LIST_COLUMNS =
  'slug,title,description,cover_image_url,tags,reading_minutes,published_at,updated_at,pillar,kind,author,ai_assisted';

export const PAGE_SIZE = 12;

export const BLOG_TAG = 'blog-posts';

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Tagged so /api/revalidate can expire every blog read (pages, sitemap, rss, llms) at once
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 3600, tags: [BLOG_TAG] } }),
    },
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Internal fact ids from the writer, e.g. "(f7)", "(f2, f5)", "[f3]"
export function stripFactLabels(text: string): string {
  return text.replace(/\s*[\(\[]f\d+(?:\s*,\s*f\d+)*[\)\]]/g, '');
}

function toPost(row: Partial<BlogPostRow>): BlogPost {
  const publishedIso = row.published_at ?? row.created_at ?? new Date().toISOString();
  return {
    slug: row.slug!,
    title: row.title!,
    description: row.description ?? '',
    coverImageUrl: row.cover_image_url ?? undefined,
    tags: row.tags ?? [],
    publishedAt: formatDate(publishedIso),
    publishedIso,
    updatedIso: row.updated_at ?? publishedIso,
    readingMinutes: row.reading_minutes ?? Math.max(1, Math.ceil((row.word_count ?? 0) / 230)),
    pillar: isPillar(row.pillar) ? row.pillar : null,
    kind: row.kind ?? 'article',
    contentMd: row.content_md ? stripFactLabels(row.content_md) : row.content_md,
    metaTitle: row.meta_title ?? undefined,
    quickAnswer: row.quick_answer ? stripFactLabels(row.quick_answer) : undefined,
    faq: Array.isArray(row.faq)
      ? row.faq.map((f) => ({ ...f, q: stripFactLabels(f.q ?? ''), a: stripFactLabels(f.a ?? '') }))
      : [],
    sources: Array.isArray(row.sources) ? row.sources : [],
    comparison: row.comparison ?? null,
    primaryKeyword: row.primary_keyword ?? undefined,
    secondaryKeywords: row.secondary_keywords ?? [],
    author: row.author ?? 'Focalyst',
    aiAssisted: row.ai_assisted ?? true,
  };
}

// RLS already limits anon reads to published posts; the filter keeps queries explicit
function published() {
  const sb = client();
  if (!sb) return null;
  return sb.from('blog_posts');
}

export async function getPosts({
  page = 1,
  tag,
  pillar,
  limit = PAGE_SIZE,
}: { page?: number; tag?: string; pillar?: Pillar; limit?: number } = {}): Promise<{
  posts: BlogPost[];
  total: number;
}> {
  const table = published();
  if (!table) return { posts: [], total: 0 };
  const from = (Math.max(1, page) - 1) * limit;
  let q = table
    .select(LIST_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, from + limit - 1);
  if (tag) q = q.contains('tags', [tag]);
  if (pillar) q = q.eq('pillar', pillar);
  const { data, count, error } = await q;
  if (error || !data) return { posts: [], total: 0 };
  return { posts: (data as Partial<BlogPostRow>[]).map(toPost), total: count ?? data.length };
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const table = published();
  if (!table) return null;
  const { data, error } = await table
    .select('*')
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return toPost(data as BlogPostRow);
}

export async function getRelated(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const table = published();
  if (!table) return [];
  const seen = new Set([post.slug]);
  const out: BlogPost[] = [];
  if (post.pillar) {
    const { data } = await table
      .select(LIST_COLUMNS)
      .eq('status', 'published')
      .eq('pillar', post.pillar)
      .neq('slug', post.slug)
      .order('published_at', { ascending: false })
      .limit(limit);
    for (const row of (data ?? []) as Partial<BlogPostRow>[]) {
      seen.add(row.slug!);
      out.push(toPost(row));
    }
  }
  if (out.length < limit) {
    const { data } = await table
      .select(LIST_COLUMNS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit + seen.size);
    for (const row of (data ?? []) as Partial<BlogPostRow>[]) {
      if (out.length >= limit) break;
      if (seen.has(row.slug!)) continue;
      seen.add(row.slug!);
      out.push(toPost(row));
    }
  }
  return out;
}

export async function getAllSlugs(): Promise<{ slug: string; updatedIso: string; pillar: Pillar | null }[]> {
  const table = published();
  if (!table) return [];
  const { data } = await table
    .select('slug,updated_at,published_at,pillar')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5000);
  return ((data ?? []) as Partial<BlogPostRow>[]).map((r) => ({
    slug: r.slug!,
    updatedIso: r.updated_at ?? r.published_at ?? new Date().toISOString(),
    pillar: isPillar(r.pillar) ? r.pillar : null,
  }));
}

// Full rows for /llms-full.txt, newest first
export async function getFullPosts(limit = 20): Promise<BlogPost[]> {
  const table = published();
  if (!table) return [];
  const { data, error } = await table
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as BlogPostRow[]).map(toPost);
}
