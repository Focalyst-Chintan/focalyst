import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import {
  blogClaimJob,
  getActiveFeatures,
  getConfig,
  getJob,
  getRecentPosts,
  getTopic,
  logEvent,
  unlockJob,
  updateJob,
  updateTopic,
  createTopic,
  createJob,
  BlogJob,
  BlogTopic,
  BlogConfig,
  getPool,
} from '../shared/db';
import { callGemini, GeminiRateLimitError } from '../shared/gemini';
import { resolveGroundingChunks, verifyResearchFacts } from '../shared/verify';
import {
  getResearchPrompt,
  getOutlinePrompt,
  OUTLINE_RESPONSE_SCHEMA,
  getDraftPrompt,
  DRAFT_RESPONSE_SCHEMA,
  getCriticPrompt,
  CRITIC_RESPONSE_SCHEMA,
  getRewritePrompt,
} from '../shared/prompts';
import { lintDraft, LintResult } from '../shared/lint';
import { publishPost } from '../shared/publish';
import { verifyCronSecret } from '../shared/auth';
import { GUIDE_LINKS } from '../shared/guides';

export async function processJobStage(job: BlogJob, config: BlogConfig, context: InvocationContext, isDryRun = false): Promise<any> {
  const startTime = Date.now();
  context.log(`[blogWorker] Processing job ${job.id} at stage: ${job.stage}`);

  if (!job.topic_id) {
    throw new Error(`Job ${job.id} has no topic_id`);
  }

  const topic = await getTopic(job.topic_id);
  if (!topic) {
    throw new Error(`Topic ${job.topic_id} not found for job ${job.id}`);
  }

  switch (job.stage) {
    case 'research': {
      let researchData = await executeResearchStage(topic, config, context);

      // Verify facts
      let verified = await verifyResearchFacts(researchData.facts || [], researchData.groundedUrlMap || new Map(), topic.competitor);

      if (verified.verifiedFacts.length < 3 || verified.uniqueDomains.length < 2 || (topic.competitor && !verified.competitorVerified)) {
        context.log('[blogWorker] Research facts below threshold, retrying once with primary sources prompt...');
        researchData = await executeResearchStage(topic, config, context, 'Please find primary sources and checkable official pages.');
        verified = await verifyResearchFacts(researchData.facts || [], researchData.groundedUrlMap || new Map(), topic.competitor);
      }

      const finalResearch = {
        questions: researchData.questions || [],
        facts: verified.verifiedFacts,
        gaps: researchData.gaps || [],
        angle: researchData.angle || '',
        secondary_keywords: researchData.secondary_keywords || [],
      };

      if (verified.verifiedFacts.length < 3) {
        context.warn('[blogWorker] Could not verify 3 facts after retry. Moving job to needs_review.');
        await updateJob(job.id, {
          research: finalResearch,
          stage: 'needs_review',
          last_error: 'Insufficient verified sources',
          locked_until: null,
        });
        await logEvent('stage_completed', job.id, 'research', Date.now() - startTime, { status: 'needs_review', factsCount: verified.verifiedFacts.length });
        return { stage: 'needs_review', facts: verified.verifiedFacts };
      }

      await updateJob(job.id, {
        research: finalResearch,
        stage: 'outline',
        run_after: new Date().toISOString(),
        locked_until: null,
      });

      await logEvent('stage_completed', job.id, 'research', Date.now() - startTime, { factsCount: verified.verifiedFacts.length, domains: verified.uniqueDomains.length });
      return { stage: 'outline', factsCount: verified.verifiedFacts.length };
    }

    case 'outline': {
      const productFeatures = await getActiveFeatures();
      const recentPosts = await getRecentPosts(30);
      const internalLinks = [
        ...GUIDE_LINKS.map((g) => ({ title: g.title, href: g.href })),
        ...recentPosts.map((p) => ({ title: p.title, href: `/blog/${p.slug}` })),
      ];

      const kind = job.kind === 'model_launch' ? 'news' : topic.pillar === 'compare' ? 'comparison' : 'article';
      const prompt = getOutlinePrompt({
        topic,
        research: job.research,
        productFeatures,
        internalLinks,
        kind,
      });

      const res = await callGemini({
        model: config.model_writer,
        prompt,
        responseSchema: OUTLINE_RESPONSE_SCHEMA,
      });

      if (!res.json) {
        throw new Error('Gemini failed to return valid JSON for outline');
      }

      const outline = res.json;

      // Ensure slug uniqueness
      let slug = (outline.slug || topic.primary_keyword).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      const p = getPool();
      const existing = await p.query('SELECT 1 FROM public.blog_posts WHERE slug = $1 LIMIT 1', [slug]);
      if ((existing.rowCount ?? 0) > 0) {
        slug = `${slug.slice(0, 57)}-2`;
      }
      outline.slug = slug;

      await updateJob(job.id, {
        outline,
        stage: 'draft',
        run_after: new Date().toISOString(),
        locked_until: null,
      });

      await logEvent('stage_completed', job.id, 'outline', Date.now() - startTime, { title: outline.title, slug });
      return { stage: 'draft', outline };
    }

    case 'draft': {
      const productFeatures = await getActiveFeatures();
      const prompt = getDraftPrompt({
        outline: job.outline,
        verifiedFacts: job.research?.facts || [],
        productFeatures,
        minWords: config.min_words,
        maxWords: config.max_words,
        topic,
      });

      const res = await callGemini({
        model: config.model_writer,
        prompt,
        responseSchema: DRAFT_RESPONSE_SCHEMA,
      });

      if (!res.json) {
        throw new Error('Gemini failed to return valid JSON for draft');
      }

      const draft = res.json;

      await updateJob(job.id, {
        draft,
        stage: 'review',
        run_after: new Date().toISOString(),
        locked_until: null,
      });

      await logEvent('stage_completed', job.id, 'draft', Date.now() - startTime, { wordCount: draft.word_count });
      return { stage: 'review', draft };
    }

    case 'review': {
      const productFeatures = await getActiveFeatures();
      const recentPosts = await getRecentPosts(30);
      const internalLinks = [
        ...GUIDE_LINKS.map((g) => g.href),
        ...recentPosts.map((p) => `/blog/${p.slug}`),
      ];

      const verifiedFacts = job.research?.facts || [];
      const verifiedUrls = verifiedFacts.map((f: any) => f.source_url).filter(Boolean);

      let draftContent = job.draft?.content_md || '';
      const outline = job.outline || {};

      // 1. First lint pass
      let lint = await lintDraft({
        contentMd: draftContent,
        title: outline.title || topic.title,
        quickAnswer: outline.quick_answer || '',
        primaryKeyword: topic.primary_keyword,
        myTerm: topic.my_term || null,
        kind: topic.pillar === 'compare' ? 'comparison' : 'article',
        minWords: config.min_words,
        maxWords: config.max_words,
        verifiedSourceUrls: verifiedUrls,
        allowedInternalHrefs: internalLinks,
        verifiedFactClaims: verifiedFacts.map((f: any) => f.claim),
        productFactDetails: productFeatures.map((f) => f.facts),
      });

      // 2. Critic pass
      const criticPrompt = getCriticPrompt({
        draftMd: draftContent,
        outline,
        verifiedFacts,
        productFeatures,
      });

      const criticRes = await callGemini({
        model: config.model_writer,
        prompt: criticPrompt,
        responseSchema: CRITIC_RESPONSE_SCHEMA,
        temperature: 0.2,
      });

      const critic = criticRes.json || { verdict: 'pass', issues: [] };

      // 3. Rewrite pass if needed
      if (!lint.pass || critic.verdict === 'fix') {
        context.log(`[blogWorker] Review failed (Lint violations: ${lint.violations.length}, Critic verdict: ${critic.verdict}). Attempting rewrite...`);

        const rewritePrompt = getRewritePrompt({
          currentDraftMd: draftContent,
          lintViolations: lint.violations,
          criticIssues: critic.issues || [],
          outline,
          minWords: config.min_words,
          maxWords: config.max_words,
        });

        const rewriteRes = await callGemini({
          model: config.model_writer,
          prompt: rewritePrompt,
          responseSchema: DRAFT_RESPONSE_SCHEMA,
        });

        if (rewriteRes.json?.content_md) {
          draftContent = rewriteRes.json.content_md;
          await updateJob(job.id, {
            draft: { content_md: draftContent, word_count: rewriteRes.json.word_count || draftContent.split(/\s+/).length },
          });

          // Re-test lint and critic
          lint = await lintDraft({
            contentMd: draftContent,
            title: outline.title || topic.title,
            quickAnswer: outline.quick_answer || '',
            primaryKeyword: topic.primary_keyword,
            myTerm: topic.my_term || null,
            kind: topic.pillar === 'compare' ? 'comparison' : 'article',
            minWords: config.min_words,
            maxWords: config.max_words,
            verifiedSourceUrls: verifiedUrls,
            allowedInternalHrefs: internalLinks,
            verifiedFactClaims: verifiedFacts.map((f: any) => f.claim),
            productFactDetails: productFeatures.map((f) => f.facts),
          });
        }
      }

      const checksPayload = {
        lint: { pass: lint.pass, violations: lint.violations, wordCount: lint.wordCount },
        critic,
      };

      if (isDryRun) {
        // In dry run mode, always stop at needs_review and save post for user review
        await updateJob(job.id, {
          checks: checksPayload,
          stage: 'needs_review',
          locked_until: null,
        });

        const pubResult = await publishPost({
          job: { ...job, draft: { content_md: draftContent } },
          topic,
          config,
          statusOverride: 'needs_review',
        });

        await logEvent('dry_run_completed', job.id, 'review', Date.now() - startTime, checksPayload);
        return {
          status: 'needs_review',
          lint,
          critic,
          postId: pubResult.postId,
          slug: pubResult.slug,
          draft: draftContent,
        };
      }

      if (lint.pass && critic.verdict === 'pass') {
        await updateJob(job.id, {
          checks: checksPayload,
          stage: 'publish',
          run_after: new Date().toISOString(),
          locked_until: null,
        });
        await logEvent('stage_completed', job.id, 'review', Date.now() - startTime, { verdict: 'pass' });
        return { stage: 'publish', checks: checksPayload };
      } else {
        // Still failing after rewrite -> needs_review
        await updateJob(job.id, {
          checks: checksPayload,
          stage: 'needs_review',
          locked_until: null,
        });

        await publishPost({
          job: { ...job, checks: checksPayload, draft: { content_md: draftContent } },
          topic,
          config,
          statusOverride: 'needs_review',
        });

        await logEvent('review_needs_human', job.id, 'review', Date.now() - startTime, checksPayload);
        return { stage: 'needs_review', checks: checksPayload };
      }
    }

    case 'publish': {
      const pubResult = await publishPost({
        job,
        topic,
        config,
      });
      await logEvent('stage_completed', job.id, 'publish', Date.now() - startTime, pubResult);
      return pubResult;
    }

    default:
      context.log(`[blogWorker] Unknown or terminal stage: ${job.stage}`);
      return { stage: job.stage };
  }
}

async function executeResearchStage(topic: BlogTopic, config: BlogConfig, context: InvocationContext, extraInstruction = ''): Promise<any> {
  const dateStr = new Date().toISOString().split('T')[0];
  let prompt = getResearchPrompt({ topic, dateStr });
  if (extraInstruction) {
    prompt += `\n\nADDITIONAL INSTRUCTION: ${extraInstruction}`;
  }

  const res = await callGemini({
    model: config.model_research,
    prompt,
    grounded: true,
  });

  const groundedUrlMap = await resolveGroundingChunks(res.groundingMetadata);

  return {
    ...res.json,
    groundedUrlMap,
  };
}

export async function runDryRun(topicTitle: string, context: InvocationContext): Promise<any> {
  const config = await getConfig();
  context.log(`[blogWorker] Running dry-run for topic: "${topicTitle}"`);

  // Check or create topic
  const p = getPool();
  let topicRes = await p.query('SELECT * FROM public.blog_topics WHERE lower(title) = lower($1) LIMIT 1', [topicTitle]);
  let topicId = topicRes.rows[0]?.id;

  if (!topicId) {
    const isComparison = topicTitle.toLowerCase().includes(' vs ');
    const competitor = isComparison ? topicTitle.split(/\s+vs\s+/i)[1]?.trim() : null;
    topicId = await createTopic({
      title: topicTitle,
      primary_keyword: topicTitle.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
      pillar: isComparison ? 'compare' : 'habits',
      intent: isComparison ? 'comparative' : 'informational',
      icp: 'Students and ambitious people',
      pain_point: topicTitle,
      competitor,
      my_term: isComparison ? 'Time-Maxing' : 'Friction Design',
      source: 'manual',
      priority: 80,
      status: 'in_progress',
    });
  }

  // Create job
  const jobId = await createJob({
    topic_id: topicId,
    kind: 'manual',
    stage: 'research',
  });

  const stages: Array<'research' | 'outline' | 'draft' | 'review'> = ['research', 'outline', 'draft', 'review'];
  let lastResult: any = null;

  for (const stg of stages) {
    context.log(`[blogWorker dry-run] Advancing stage: ${stg}`);
    const currentJob = await getJob(jobId);
    if (!currentJob) throw new Error(`Job ${jobId} disappeared during dry run`);
    currentJob.stage = stg;
    lastResult = await processJobStage(currentJob, config, context, true);
  }

  return lastResult;
}

export async function blogWorkerTimerHandler(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('[blogWorkerTimer] Timer triggered at:', new Date().toISOString());
  try {
    const config = await getConfig();
    if (!config.enabled) {
      context.log('[blogWorkerTimer] Blog automation disabled.');
      return;
    }

    const job = await blogClaimJob();
    if (!job) {
      context.log('[blogWorkerTimer] No eligible job claimed.');
      return;
    }

    try {
      await processJobStage(job, config, context, false);
    } catch (err: any) {
      context.error(`[blogWorkerTimer] Error processing job ${job.id}:`, err.message);

      if (err instanceof GeminiRateLimitError) {
        await updateJob(job.id, {
          run_after: new Date(Date.now() + 3600000).toISOString(), // now + 1 hour
          last_error: err.message,
          locked_until: null,
        });
      } else {
        const attempts = (job.attempts || 1) + 1;
        if (attempts >= 3) {
          await updateJob(job.id, {
            stage: 'failed',
            last_error: err.message,
            locked_until: null,
          });
          if (job.topic_id) {
            const topic = await getTopic(job.topic_id);
            if (topic) {
              await updateTopic(job.topic_id, {
                status: 'idea',
                priority: Math.max(0, topic.priority - 10),
              });
            }
          }
        } else {
          await updateJob(job.id, {
            attempts,
            last_error: err.message,
            locked_until: null,
          });
        }
      }
    }
  } catch (outerErr: any) {
    context.error('[blogWorkerTimer] Outer error:', outerErr.message);
  }
}

export async function blogWorkerHttpHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const secretHeader = request.headers.get('x-cron-secret');
  if (!verifyCronSecret(secretHeader)) {
    return { status: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  if (body?.dry_run && body?.topic_title) {
    try {
      const result = await runDryRun(body.topic_title, context);
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dry_run: true,
          topic_title: body.topic_title,
          status: result.status,
          lint: result.lint,
          critic: result.critic,
          slug: result.slug,
          postId: result.postId,
          wordCount: result.lint?.wordCount,
          first300Words: result.draft?.split(/\s+/).slice(0, 300).join(' '),
        }),
      };
    } catch (err: any) {
      context.error('[blogWorkerHttp dry_run error]', err.message);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err.message }),
      };
    }
  }

  // Normal manual worker tick
  try {
    const config = await getConfig();
    const job = await blogClaimJob();
    if (!job) {
      return { status: 200, body: JSON.stringify({ message: 'No pending jobs to claim.' }) };
    }

    const stageResult = await processJobStage(job, config, context, false);
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimed_job: job.id, stage: job.stage, result: stageResult }),
    };
  } catch (err: any) {
    context.error('[blogWorkerHttp error]', err.message);
    return { status: 500, body: JSON.stringify({ error: err.message }) };
  }
}

app.timer('blogWorkerTimer', {
  schedule: '0 */10 * * * *',
  handler: blogWorkerTimerHandler,
});

app.http('blogWorkerHttp', {
  methods: ['POST'],
  route: 'blog-worker',
  authLevel: 'anonymous',
  handler: blogWorkerHttpHandler,
});
