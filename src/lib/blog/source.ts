import { getAzurePool } from '@/lib/server/azure-db';
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

export const PAGE_SIZE = 12;

export const BLOG_TAG = 'blog-posts';

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

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  try {
    return new Date(val as any).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function toPost(row: Partial<BlogPostRow>): BlogPost {
  const publishedIso = toIsoString(row.published_at ?? row.created_at);
  const updatedIso = toIsoString(row.updated_at ?? row.published_at ?? row.created_at);
  return {
    slug: row.slug!,
    title: row.title!,
    description: row.description ?? '',
    coverImageUrl: row.cover_image_url ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    publishedAt: formatDate(publishedIso),
    publishedIso,
    updatedIso,
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
    secondaryKeywords: Array.isArray(row.secondary_keywords) ? row.secondary_keywords : [],
    author: row.author ?? 'Focalyst',
    aiAssisted: row.ai_assisted ?? true,
  };
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
  const pool = getAzurePool();
  if (!pool) return { posts: [], total: 0 };

  try {
    const params: unknown[] = [];
    const whereConditions = ["status = 'published'", "published_at <= now()"];

    if (tag) {
      params.push(tag);
      whereConditions.push(`$${params.length} = ANY(tags)`);
    }

    if (pillar) {
      params.push(pillar);
      whereConditions.push(`pillar = $${params.length}`);
    }

    const whereClause = whereConditions.join(' and ');

    const countQuery = `select count(*)::int as total from public.blog_posts where ${whereClause}`;
    const countRes = await pool.query(countQuery, params);
    const total = countRes.rows[0]?.total ?? 0;

    const from = (Math.max(1, page) - 1) * limit;
    params.push(limit);
    const limitIdx = params.length;
    params.push(from);
    const offsetIdx = params.length;

    const selectQuery = `
      select slug, title, description, cover_image_url, tags, reading_minutes, published_at, updated_at, pillar, kind, author, ai_assisted
      from public.blog_posts
      where ${whereClause}
      order by published_at desc
      limit $${limitIdx} offset $${offsetIdx}
    `;

    const selectRes = await pool.query(selectQuery, params);
    return {
      posts: (selectRes.rows as Partial<BlogPostRow>[]).map(toPost),
      total,
    };
  } catch (err) {
    console.error('getPosts error:', err);
    return { posts: [], total: 0 };
  }
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const pool = getAzurePool();
  if (!pool) return null;

  try {
    const query = `
      select *
      from public.blog_posts
      where status = 'published'
        and published_at <= now()
        and slug = $1
      limit 1
    `;
    const res = await pool.query(query, [slug]);
    if (!res.rows.length) return null;
    return toPost(res.rows[0] as BlogPostRow);
  } catch (err) {
    console.error('getPost error:', err);
    return null;
  }
}

export async function getRelated(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const pool = getAzurePool();
  if (!pool) return [];

  try {
    const seen = new Set<string>([post.slug]);
    const out: BlogPost[] = [];

    if (post.pillar) {
      const pillarQuery = `
        select slug, title, description, cover_image_url, tags, reading_minutes, published_at, updated_at, pillar, kind, author, ai_assisted
        from public.blog_posts
        where status = 'published'
          and published_at <= now()
          and pillar = $1
          and slug != $2
        order by published_at desc
        limit $3
      `;
      const res = await pool.query(pillarQuery, [post.pillar, post.slug, limit]);
      for (const row of res.rows as Partial<BlogPostRow>[]) {
        seen.add(row.slug!);
        out.push(toPost(row));
      }
    }

    if (out.length < limit) {
      const remainingLimit = limit + seen.size;
      const fallbackQuery = `
        select slug, title, description, cover_image_url, tags, reading_minutes, published_at, updated_at, pillar, kind, author, ai_assisted
        from public.blog_posts
        where status = 'published'
          and published_at <= now()
        order by published_at desc
        limit $1
      `;
      const res = await pool.query(fallbackQuery, [remainingLimit]);
      for (const row of res.rows as Partial<BlogPostRow>[]) {
        if (out.length >= limit) break;
        if (seen.has(row.slug!)) continue;
        seen.add(row.slug!);
        out.push(toPost(row));
      }
    }

    return out;
  } catch (err) {
    console.error('getRelated error:', err);
    return [];
  }
}

export async function getAllSlugs(): Promise<{ slug: string; updatedIso: string; pillar: Pillar | null }[]> {
  const pool = getAzurePool();
  if (!pool) return [];

  try {
    const query = `
      select slug, updated_at, published_at, pillar
      from public.blog_posts
      where status = 'published'
        and published_at <= now()
      order by published_at desc
      limit 5000
    `;
    const res = await pool.query(query);
    return (res.rows as Partial<BlogPostRow>[]).map((r) => ({
      slug: r.slug!,
      updatedIso: r.updated_at ?? r.published_at ?? new Date().toISOString(),
      pillar: isPillar(r.pillar) ? r.pillar : null,
    }));
  } catch (err) {
    console.error('getAllSlugs error:', err);
    return [];
  }
}

// Full rows for /llms-full.txt, newest first
export async function getFullPosts(limit = 20): Promise<BlogPost[]> {
  const pool = getAzurePool();
  if (!pool) return [];

  try {
    const query = `
      select *
      from public.blog_posts
      where status = 'published'
        and published_at <= now()
      order by published_at desc
      limit $1
    `;
    const res = await pool.query(query, [limit]);
    return (res.rows as BlogPostRow[]).map(toPost);
  } catch (err) {
    console.error('getFullPosts error:', err);
    return [];
  }
}
