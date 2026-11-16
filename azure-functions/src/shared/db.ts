import { Pool, PoolConfig } from 'pg';

export interface BlogConfig {
  id: boolean;
  enabled: boolean;
  auto_publish: boolean;
  daily_hour_utc: number;
  model_research: string;
  model_writer: string;
  min_words: number;
  max_words: number;
  max_launch_posts_per_day: number;
  site_url: string;
  app_cta_url: string;
  web_cta_url: string;
  author: string;
  ai_disclosure: boolean;
  weekday_pillars: Record<string, string>;
  updated_at: string;
}

export interface BlogFeature {
  key: string;
  name: string;
  platforms: string[];
  plan: 'free' | 'free_limited' | 'pro';
  facts: string;
  guide_slug: string | null;
  active: boolean;
  updated_at: string;
}

export interface BlogTopic {
  id: string;
  title: string;
  primary_keyword: string;
  pillar: string;
  intent: string;
  icp: string;
  pain_point: string;
  competitor: string | null;
  my_term: string | null;
  why_now: string | null;
  source: string;
  priority: number;
  status: 'idea' | 'in_progress' | 'used' | 'dropped';
  used_at: string | null;
  created_at: string;
}

export interface BlogJob {
  id: string;
  topic_id: string | null;
  kind: 'daily' | 'trend' | 'model_launch' | 'manual';
  stage: 'research' | 'outline' | 'draft' | 'review' | 'publish' | 'done' | 'needs_review' | 'failed';
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  for_date?: string;
  research: any;
  outline: any;
  draft: any;
  checks: any;
  last_error: string | null;
  run_after: string;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogFeed {
  id: string;
  name: string;
  url: string;
  kind: 'trend' | 'model_news';
  site_url: string | null;
  active: boolean;
  last_checked_at: string | null;
  last_item_at: string | null;
  last_error: string | null;
}

export function parseAzureConnectionString(connStr: string): PoolConfig {
  const regex = /^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/;
  const match = connStr.match(regex);
  if (match) {
    const [, user, password, host, port, database] = match;
    return {
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
    };
  }
  return { connectionString: connStr };
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connStr = process.env.AZURE_POSTGRES_URL;
    if (!connStr) {
      throw new Error('AZURE_POSTGRES_URL environment variable is missing');
    }
    const config = parseAzureConnectionString(connStr);
    pool = new Pool({
      ...config,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
    });
  }
  return pool;
}

export async function blogEnqueueDaily(targetDate?: string): Promise<string | null> {
  const p = getPool();
  const query = targetDate
    ? 'SELECT public.blog_enqueue_daily($1::date) AS job_id'
    : 'SELECT public.blog_enqueue_daily() AS job_id';
  const values = targetDate ? [targetDate] : [];
  const res = await p.query(query, values);
  return res.rows[0]?.job_id || null;
}

export async function blogClaimJob(): Promise<BlogJob | null> {
  const p = getPool();
  const res = await p.query('SELECT * FROM public.blog_claim_job()');
  return res.rows[0] || null;
}

export async function blogSimilarTitles(title: string): Promise<{ source: string; ref: string; title: string; score: number }[]> {
  const p = getPool();
  const res = await p.query('SELECT * FROM public.blog_similar_titles($1)', [title]);
  return res.rows.map((r) => ({
    source: r.source,
    ref: r.ref,
    title: r.title,
    score: parseFloat(r.score),
  }));
}

export async function getConfig(): Promise<BlogConfig> {
  const p = getPool();
  const res = await p.query('SELECT * FROM public.blog_config WHERE id = true LIMIT 1');
  if (!res.rows[0]) {
    throw new Error('No blog_config row found in database');
  }
  return res.rows[0];
}

export async function getActiveFeatures(): Promise<BlogFeature[]> {
  const p = getPool();
  const res = await p.query('SELECT key, name, platforms, plan, facts, guide_slug, active, updated_at FROM public.blog_features WHERE active = true ORDER BY key ASC');
  return res.rows;
}

export async function getRecentPosts(limit = 30): Promise<{ slug: string; title: string }[]> {
  const p = getPool();
  const res = await p.query(
    "SELECT slug, title FROM public.blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT $1",
    [limit]
  );
  return res.rows;
}

export async function getJob(jobId: string): Promise<BlogJob | null> {
  const p = getPool();
  const res = await p.query('SELECT * FROM public.blog_jobs WHERE id = $1', [jobId]);
  return res.rows[0] || null;
}

export async function updateJob(jobId: string, updates: Partial<BlogJob>): Promise<void> {
  const p = getPool();
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const k of keys) {
    setClauses.push(`${k} = $${idx}`);
    values.push((updates as any)[k]);
    idx++;
  }

  setClauses.push('updated_at = now()');
  values.push(jobId);

  const query = `UPDATE public.blog_jobs SET ${setClauses.join(', ')} WHERE id = $${idx}`;
  await p.query(query, values);
}

export async function unlockJob(jobId: string): Promise<void> {
  const p = getPool();
  await p.query('UPDATE public.blog_jobs SET locked_until = NULL, updated_at = now() WHERE id = $1', [jobId]);
}

export async function getTopic(topicId: string): Promise<BlogTopic | null> {
  const p = getPool();
  const res = await p.query('SELECT * FROM public.blog_topics WHERE id = $1', [topicId]);
  return res.rows[0] || null;
}

export async function updateTopic(topicId: string, updates: Partial<BlogTopic>): Promise<void> {
  const p = getPool();
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const k of keys) {
    setClauses.push(`${k} = $${idx}`);
    values.push((updates as any)[k]);
    idx++;
  }

  values.push(topicId);
  const query = `UPDATE public.blog_topics SET ${setClauses.join(', ')} WHERE id = $${idx}`;
  await p.query(query, values);
}

export async function createTopic(topic: Partial<BlogTopic>): Promise<string> {
  const p = getPool();
  const res = await p.query(
    `INSERT INTO public.blog_topics (title, primary_keyword, pillar, intent, icp, pain_point, competitor, my_term, why_now, source, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      topic.title,
      topic.primary_keyword,
      topic.pillar,
      topic.intent || 'informational',
      topic.icp || 'Students & young professionals',
      topic.pain_point || '',
      topic.competitor || null,
      topic.my_term || null,
      topic.why_now || null,
      topic.source || 'idea',
      topic.priority || 50,
      topic.status || 'idea',
    ]
  );
  return res.rows[0].id;
}

export async function createJob(job: Partial<BlogJob>): Promise<string> {
  const p = getPool();
  const res = await p.query(
    `INSERT INTO public.blog_jobs (topic_id, kind, stage, run_after)
     VALUES ($1, $2, $3, coalesce($4::timestamptz, now()))
     RETURNING id`,
    [job.topic_id || null, job.kind || 'manual', job.stage || 'research', job.run_after || null]
  );
  return res.rows[0].id;
}

export async function createPost(post: Record<string, any>): Promise<string> {
  const p = getPool();
  const res = await p.query(
    `INSERT INTO public.blog_posts (
      slug, title, meta_title, description, quick_answer, content_md, faq, sources, comparison,
      tags, pillar, kind, primary_keyword, secondary_keywords, my_term, word_count, reading_minutes,
      author, status, published_at, ai_assisted, checks, topic_id, job_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      meta_title = EXCLUDED.meta_title,
      description = EXCLUDED.description,
      quick_answer = EXCLUDED.quick_answer,
      content_md = EXCLUDED.content_md,
      faq = EXCLUDED.faq,
      sources = EXCLUDED.sources,
      comparison = EXCLUDED.comparison,
      tags = EXCLUDED.tags,
      pillar = EXCLUDED.pillar,
      kind = EXCLUDED.kind,
      primary_keyword = EXCLUDED.primary_keyword,
      secondary_keywords = EXCLUDED.secondary_keywords,
      my_term = EXCLUDED.my_term,
      word_count = EXCLUDED.word_count,
      reading_minutes = EXCLUDED.reading_minutes,
      author = EXCLUDED.author,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at,
      ai_assisted = EXCLUDED.ai_assisted,
      checks = EXCLUDED.checks,
      updated_at = now()
    RETURNING id`,
    [
      post.slug,
      post.title,
      post.meta_title || post.title,
      post.description,
      post.quick_answer,
      post.content_md,
      JSON.stringify(post.faq || []),
      JSON.stringify(post.sources || []),
      post.comparison ? JSON.stringify(post.comparison) : null,
      post.tags || [],
      post.pillar || 'focus',
      post.kind || 'article',
      post.primary_keyword || '',
      post.secondary_keywords || [],
      post.my_term || null,
      post.word_count || 0,
      post.reading_minutes || 1,
      post.author || 'Focalyst',
      post.status || 'needs_review',
      post.published_at || null,
      post.ai_assisted ?? true,
      JSON.stringify(post.checks || {}),
      post.topic_id || null,
      post.job_id || null,
    ]
  );
  return res.rows[0].id;
}

export async function isModelEventRecorded(vendor: string, modelName: string): Promise<boolean> {
  const p = getPool();
  const res = await p.query(
    'SELECT 1 FROM public.blog_model_events WHERE lower(vendor) = lower($1) AND lower(model_name) = lower($2) LIMIT 1',
    [vendor, modelName]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function recordModelEvent(
  vendor: string,
  modelName: string,
  officialUrl: string,
  topicId: string,
  postId?: string | null
): Promise<string> {
  const p = getPool();
  const res = await p.query(
    `INSERT INTO public.blog_model_events (vendor, model_name, official_url, topic_id, post_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [vendor, modelName, officialUrl, topicId, postId || null]
  );
  return res.rows[0].id;
}

export async function getActiveFeeds(kind?: string): Promise<BlogFeed[]> {
  const p = getPool();
  const query = kind
    ? 'SELECT * FROM public.blog_feeds WHERE active = true AND kind = $1 ORDER BY name ASC'
    : 'SELECT * FROM public.blog_feeds WHERE active = true ORDER BY name ASC';
  const values = kind ? [kind] : [];
  const res = await p.query(query, values);
  return res.rows;
}

export async function updateFeedChecked(id: string, lastItemAt?: Date | null, lastError?: string | null): Promise<void> {
  const p = getPool();
  await p.query(
    `UPDATE public.blog_feeds
     SET last_checked_at = now(),
         last_item_at = coalesce($2, last_item_at),
         last_error = $3
     WHERE id = $1`,
    [id, lastItemAt ? lastItemAt.toISOString() : null, lastError || null]
  );
}

export async function logEvent(
  fn: string,
  jobId?: string | null,
  stage?: string | null,
  durationMs?: number | null,
  details?: any,
  level: 'info' | 'warn' | 'error' = 'info'
): Promise<void> {
  try {
    const p = getPool();
    const data = {
      ...(details || {}),
      jobId: jobId || undefined,
      stage: stage || undefined,
      durationMs: durationMs || undefined,
    };
    await p.query(
      `INSERT INTO public.blog_log (fn, level, message, data)
       VALUES ($1, $2, $3, $4)`,
      [fn, level, `${fn}${stage ? ':' + stage : ''}`, JSON.stringify(data)]
    );
  } catch (err: any) {
    console.error('Failed to log event to blog_log:', err.message);
  }
}

export async function cleanupOldLogs(days = 30): Promise<number> {
  const p = getPool();
  const res = await p.query(`DELETE FROM public.blog_log WHERE at < now() - interval '${days} days'`);
  return res.rowCount || 0;
}
