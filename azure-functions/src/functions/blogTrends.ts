import { app, InvocationContext, Timer } from '@azure/functions';
import {
  getActiveFeeds,
  getConfig,
  blogSimilarTitles,
  createTopic,
  logEvent,
  updateFeedChecked,
} from '../shared/db';
import { callGemini } from '../shared/gemini';
import { getTrendPrompt } from '../shared/prompts';
import { checkHtmlUrl, isDomainBlocked } from '../shared/verify';

export async function blogTrendsHandler(myTimer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  context.log('[blogTrends] Triggered at:', new Date().toISOString());

  try {
    const config = await getConfig();
    if (!config.enabled) {
      context.log('[blogTrends] Blog automation disabled.');
      return;
    }

    const feeds = await getActiveFeeds('trend');
    for (const feed of feeds) {
      await updateFeedChecked(feed.id, null, null);
    }

    const icpList = ['High school students (NEET, JEE, SAT, GCSE, A-levels)', 'University undergraduates', 'Ambitious self-studiers and young professionals'];
    const pillarList = Object.values(config.weekday_pillars || {
      '1': 'focus',
      '2': 'study',
      '3': 'compare',
      '4': 'habits',
      '5': 'ai',
      '6': 'attention',
      '7': 'planning',
    });

    const prompt = getTrendPrompt({ icpList, pillarList });
    const res = await callGemini({
      model: config.model_research,
      prompt,
      grounded: true,
    });

    const rawTopics = Array.isArray(res.json) ? res.json : res.json?.topics || [];
    context.log(`[blogTrends] Gemini returned ${rawTopics.length} candidate trend topics.`);

    let insertedCount = 0;
    const maxInsert = 6;

    for (const item of rawTopics) {
      if (insertedCount >= maxInsert) break;
      if (!item.title || !item.primary_keyword) continue;

      // Verify at least one source URL works
      const urls = Array.isArray(item.source_urls) ? item.source_urls : [];
      let hasValidUrl = false;
      for (const u of urls) {
        if (!isDomainBlocked(u)) {
          const chk = await checkHtmlUrl(u);
          if (chk.ok) {
            hasValidUrl = true;
            break;
          }
        }
      }

      if (!hasValidUrl && urls.length > 0) {
        context.log(`[blogTrends] Skipping topic "${item.title}": no valid source URLs.`);
        continue;
      }

      // Check similarity against existing posts and topics
      const sim = await blogSimilarTitles(item.title);
      const isTooSimilar = sim.some((s) => s.score >= 0.35);
      if (isTooSimilar) {
        context.log(`[blogTrends] Skipping topic "${item.title}": similarity score >= 0.35 with existing content.`);
        continue;
      }

      // Calculate priority: 90 if why_now names a date within 14 days, else 75
      let priority = 75;
      const whyNow = item.why_now || '';
      const dateMatch = whyNow.match(/\b(202[4-9]|203[0-9])-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
      if (dateMatch) {
        const targetDate = new Date(dateMatch[0]).getTime();
        const diffDays = Math.abs(targetDate - Date.now()) / (24 * 3600 * 1000);
        if (diffDays <= 14) {
          priority = 90;
        }
      }

      await createTopic({
        title: item.title.slice(0, 58),
        primary_keyword: item.primary_keyword,
        pillar: item.pillar || 'focus',
        intent: item.intent || 'informational',
        icp: item.icp || 'Students',
        pain_point: item.pain_point || item.title,
        my_term: item.my_term || null,
        why_now: whyNow,
        source: 'trend',
        priority,
        status: 'idea',
      });

      insertedCount++;
      context.log(`[blogTrends] Inserted trend topic #${insertedCount}: "${item.title}" (priority ${priority})`);
    }

    await logEvent('trends_cycle_completed', null, 'trends', Date.now() - startTime, { insertedCount });
  } catch (err: any) {
    context.error('[blogTrends] Error in trends handler:', err.message);
  }
}

app.timer('blogTrends', {
  schedule: '0 40 2 * * 1,4',
  handler: blogTrendsHandler,
});
