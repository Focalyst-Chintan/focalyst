import { BlogConfig, BlogJob, BlogTopic, createPost, updateJob, updateTopic, logEvent } from './db';

export interface PublishParams {
  job: BlogJob;
  topic: BlogTopic;
  config: BlogConfig;
  statusOverride?: 'published' | 'needs_review';
}

export async function publishPost(params: PublishParams): Promise<{ postId: string; status: string; slug: string }> {
  const { job, topic, config, statusOverride } = params;
  const outline = job.outline || {};
  const draft = job.draft || {};
  const research = job.research || {};

  const title = outline.title || topic.title;
  const slug = (outline.slug || topic.primary_keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 60);
  const description = (outline.description || topic.pain_point || '').slice(0, 160);
  const quickAnswer = outline.quick_answer || '';
  const contentMd = draft.content_md || '';

  const words = contentMd.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 230));

  // Build sources array from verified facts' unique pages
  const verifiedFacts: any[] = research.facts || [];
  const sourceMap = new Map<string, { title: string; url: string; publisher: string; checked: string }>();
  for (const f of verifiedFacts) {
    if (f.source_url && !sourceMap.has(f.source_url)) {
      sourceMap.set(f.source_url, {
        title: f.source_title || f.publisher || f.source_url,
        url: f.source_url,
        publisher: f.publisher || new URL(f.source_url).hostname.replace(/^www\./, ''),
        checked: f.verified_at || new Date().toISOString(),
      });
    }
  }
  const sources = Array.from(sourceMap.values());

  const targetStatus = statusOverride || (config.auto_publish ? 'published' : 'needs_review');
  const publishedAt = targetStatus === 'published' ? new Date().toISOString() : null;

  const postId = await createPost({
    slug,
    title,
    meta_title: title,
    description,
    quick_answer: quickAnswer,
    content_md: contentMd,
    faq: outline.faq || [],
    sources,
    comparison: outline.comparison || null,
    tags: outline.tags || ['Focus'],
    pillar: topic.pillar || 'focus',
    kind: job.kind === 'model_launch' ? 'news' : topic.pillar === 'compare' ? 'comparison' : 'article',
    primary_keyword: topic.primary_keyword,
    secondary_keywords: research.secondary_keywords || [],
    my_term: topic.my_term || null,
    word_count: words,
    reading_minutes: readingMinutes,
    author: config.author || 'Focalyst',
    status: targetStatus,
    published_at: publishedAt,
    ai_assisted: true,
    checks: job.checks || {},
    topic_id: topic.id,
    job_id: job.id,
  });

  // If published, trigger revalidate and IndexNow
  if (targetStatus === 'published') {
    const siteUrl = config.site_url || 'https://focalyst.online';
    const revalidateSecret = process.env.REVALIDATE_SECRET;

    if (revalidateSecret) {
      try {
        await fetch(`${siteUrl.replace(/\/+$/, '')}/api/revalidate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': revalidateSecret,
          },
          body: JSON.stringify({ slug }),
        });
      } catch (err: any) {
        console.warn(`[publish] Revalidate ping failed for ${slug}:`, err.message);
      }
    }

    const indexNowKey = process.env.INDEXNOW_KEY;
    if (indexNowKey) {
      try {
        const postUrl = `${siteUrl.replace(/\/+$/, '')}/blog/${slug}`;
        const pingUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(postUrl)}&key=${encodeURIComponent(indexNowKey)}`;
        await fetch(pingUrl, { method: 'GET' });
      } catch (err: any) {
        console.warn(`[publish] IndexNow ping failed for ${slug}:`, err.message);
      }
    }
  }

  // Update topic and job
  await updateTopic(topic.id, {
    status: 'used',
    used_at: new Date().toISOString(),
  });

  await updateJob(job.id, {
    stage: 'done',
    locked_until: null,
  });

  await logEvent(
    targetStatus === 'published' ? 'post_published' : 'post_needs_review',
    job.id,
    'publish',
    null,
    { postId, slug, title, status: targetStatus }
  );

  return { postId, status: targetStatus, slug };
}
