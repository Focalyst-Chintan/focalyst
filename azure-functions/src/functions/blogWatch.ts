import { app, InvocationContext, Timer } from '@azure/functions';
import { XMLParser } from 'fast-xml-parser';
import {
  getActiveFeeds,
  getConfig,
  isModelEventRecorded,
  recordModelEvent,
  createTopic,
  createJob,
  logEvent,
  updateFeedChecked,
  getPool,
} from '../shared/db';
import { callGemini } from '../shared/gemini';
import { getModelWatchPrompt, MODEL_WATCH_SCHEMA } from '../shared/prompts';
import { extractHostname } from '../shared/verify';

const MODEL_KEYWORDS = [
  'gpt',
  'o1',
  'o3',
  'claude',
  'opus',
  'sonnet',
  'haiku',
  'gemini',
  'new model',
  'introducing',
  'launch',
  'release',
];

const ALLOWED_OFFICIAL_DOMAINS = [
  'openai.com',
  'anthropic.com',
  'blog.google',
  'deepmind.google',
  'ai.google.dev',
];

export async function blogWatchHandler(myTimer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  context.log('[blogWatch] Triggered at:', new Date().toISOString());

  try {
    const config = await getConfig();
    if (!config.enabled) {
      context.log('[blogWatch] Blog automation is disabled.');
      return;
    }

    const feeds = await getActiveFeeds('model_news');
    const parser = new XMLParser({ ignoreAttributes: false });
    const now = Date.now();
    const cutoff72Hours = now - 72 * 3600 * 1000;

    let detectedCount = 0;

    for (const feed of feeds) {
      try {
        const resp = await fetch(feed.url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FocalystBlogBot/1.0)' },
          signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
          await updateFeedChecked(feed.id, null, `HTTP ${resp.status}`);
          continue;
        }

        const xml = await resp.text();
        const parsed = parser.parse(xml);
        const rawItems = parsed.rss?.channel?.item || parsed.feed?.entry || [];
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

        let latestItemDate: Date | null = null;

        for (const item of items) {
          const title = item.title || '';
          const link = item.link?.['@_href'] || item.link || '';
          const snippet = item.description || item.summary || item.content || '';
          const pubDateStr = item.pubDate || item.published || item.updated;
          const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : now;

          if (pubDate > (latestItemDate?.getTime() || 0)) {
            latestItemDate = new Date(pubDate);
          }

          if (pubDate < cutoff72Hours) {
            continue;
          }

          const lowerTitle = title.toLowerCase();
          const matchesKeyword = MODEL_KEYWORDS.some((kw) => lowerTitle.includes(kw));
          if (!matchesKeyword) {
            continue;
          }

          // Classify item with Gemini
          const prompt = getModelWatchPrompt({
            feedTitle: title,
            feedSnippet: typeof snippet === 'string' ? snippet.slice(0, 500) : '',
            feedLink: typeof link === 'string' ? link : '',
          });

          const res = await callGemini({
            model: config.model_research,
            prompt,
            responseSchema: MODEL_WATCH_SCHEMA,
          });

          const cls = res.json;
          if (!cls || !cls.is_major_model_release || (cls.confidence || 0) < 0.8) {
            continue;
          }

          const vendor = (cls.vendor || '').toLowerCase();
          if (!['openai', 'anthropic', 'google'].includes(vendor)) {
            continue;
          }

          const officialUrl = cls.official_url || link;
          const host = extractHostname(officialUrl);
          const isAllowedDomain = ALLOWED_OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
          if (!isAllowedDomain) {
            context.log(`[blogWatch] Discarding model event: official_url host "${host}" is not on approved vendor domains.`);
            continue;
          }

          const modelName = cls.model_name || 'New Model';
          const alreadyRecorded = await isModelEventRecorded(vendor, modelName);
          if (alreadyRecorded) {
            continue;
          }

          // Check daily launch limit
          const p = getPool();
          const todayEvents = await p.query(
            "SELECT count(*) from public.blog_model_events WHERE created_at >= (now() at time zone 'utc')::date"
          );
          const launchCount = parseInt(todayEvents.rows[0]?.count || '0', 10);
          if (launchCount >= config.max_launch_posts_per_day) {
            context.warn(`[blogWatch] Daily launch post limit reached (${launchCount}/${config.max_launch_posts_per_day}).`);
            continue;
          }

          // Create topic
          const postTitle = `${modelName} is out: using it with your Focalyst plan`.slice(0, 58);
          const topicId = await createTopic({
            title: postTitle,
            primary_keyword: `${modelName.toLowerCase()} with focalyst`,
            pillar: 'ai',
            intent: 'news',
            icp: 'Students & ambitious knowledge workers',
            pain_point: `How to take advantage of ${modelName} with daily personal tasks and focus sessions`,
            competitor: null,
            my_term: 'AI Leverage',
            why_now: `Official launch of ${modelName} by ${vendor}`,
            source: 'model_event',
            priority: 100,
            status: 'in_progress',
          });

          // Create priority job
          const jobId = await createJob({
            topic_id: topicId,
            kind: 'model_launch',
            stage: 'research',
          });

          // Record event
          await recordModelEvent(vendor, modelName, officialUrl, topicId);
          detectedCount++;

          await logEvent('model_launch_detected', jobId, 'watch', Date.now() - startTime, {
            vendor,
            modelName,
            officialUrl,
            topicId,
          });

          context.log(`[blogWatch] Enqueued launch post for ${vendor} ${modelName}: topic ${topicId}`);
        }

        await updateFeedChecked(feed.id, latestItemDate, null);
      } catch (feedErr: any) {
        context.warn(`[blogWatch] Error parsing feed ${feed.name}:`, feedErr.message);
        await updateFeedChecked(feed.id, null, feedErr.message);
      }
    }

    await logEvent('watch_cycle_completed', null, 'watch', Date.now() - startTime, { detectedCount });
  } catch (err: any) {
    context.error('[blogWatch] Outer error:', err.message);
  }
}

app.timer('blogWatch', {
  schedule: '0 20 */3 * * *',
  handler: blogWatchHandler,
});
