// blog-worker: claims one due job and moves it one step forward (BLOG_AUTOMATION.md section 7).
// One Gemini call per invocation keeps every run well under the Edge Function limit.
import { authorized, json } from "../_shared/auth.ts";
import { db, getConfig, getFeatures, log, type BlogConfig } from "../_shared/db.ts";
import { gemini, GeminiBusy } from "../_shared/gemini.ts";
import { GUIDES } from "../_shared/guides.ts";
import { describe, lint, scrub, type LintInput, type Violation } from "../_shared/lint.ts";
import {
  CRITIC_SCHEMA, DRAFT_SCHEMA, findTopicPrompt, kindFor, LENGTHS, newsTemplate, OUTLINE_SCHEMA, outlinePrompt,
  draftPrompt, criticPrompt, rewritePrompt, researchPrompt, isHealthTopic, TAGS, type CriticIssue, type Kind, type Outline,
  type Topic,
} from "../_shared/prompts.ts";
import { refreshSite, writePost } from "../_shared/publish.ts";
import { TERMS, voiceBlock } from "../_shared/style.ts";
import { distinctDomains, domainOf, sourceTier, STRONG_TIER, strongDomains, verifyFacts, type RawFact, type VerifiedFact } from "../_shared/verify.ts";

const FN = "blog-worker";
const MAX_ATTEMPTS = 3;

interface Job {
  id: string;
  kind: string;
  for_date: string | null;
  topic_id: string | null;
  stage: string;
  attempts: number;
  research: Research | null;
  outline: (Outline & { kind: Kind; retried?: boolean }) | null;
  draft: { content_md: string; round: number } | null;
  checks: ReviewState | null;
}

interface Research {
  questions: string[];
  facts: VerifiedFact[];
  gaps: string[];
  angle: string;
  secondary_keywords: string[];
  retry?: boolean;
}

interface ReviewState {
  phase: "check" | "rewrite";
  round: number; // rewrites done
  violations: Violation[];
  issues: CriticIssue[];
  history: { round: number; violations: string[]; issues: number }[];
  published_with?: string[];
  removed?: string[];
  faq_remove?: number[];
}

const today = () => new Date().toISOString().slice(0, 10);

async function update(job: Job, patch: Record<string, unknown>) {
  const { error } = await db().from("blog_jobs").update(patch).eq("id", job.id);
  if (error) throw new Error(`blog_jobs update: ${error.message}`);
}

// Same stage, next step: unlock and run again on the next call
async function stay(job: Job, patch: Record<string, unknown> = {}) {
  await update(job, { ...patch, attempts: 0, run_after: new Date().toISOString(), locked_until: null, last_error: null });
}

async function advance(job: Job, stage: string, patch: Record<string, unknown> = {}) {
  await stay(job, { ...patch, stage });
}

async function loadTopic(id: string): Promise<Topic> {
  const { data, error } = await db().from("blog_topics").select("*").eq("id", id).single();
  if (error || !data) throw new Error(`topic ${id} not found`);
  return data as Topic;
}

async function releaseTopic(topicId: string | null, penalty = 10) {
  if (!topicId) return;
  const { data: t } = await db().from("blog_topics").select("priority").eq("id", topicId).maybeSingle();
  if (t) await db().from("blog_topics").update({ status: "idea", priority: t.priority - penalty }).eq("id", topicId);
}

function pillarFor(config: BlogConfig) {
  const dow = ((new Date().getUTCDay() + 6) % 7) + 1; // ISO weekday
  return config.weekday_pillars[String(dow)] ?? "focus";
}

// ---------------------------------------------------------------- research (7.1)

async function research(job: Job, config: BlogConfig) {
  if (!job.topic_id) {
    // No backlog topic: find a timely one for today's pillar first
    const pillar = pillarFor(config);
    const r = await gemini<Record<string, unknown>>({
      model: config.model_research,
      prompt: findTopicPrompt(pillar, today()),
      grounded: true,
      temperature: 0.6,
    });
    const t = r.json;
    if (!t?.title || !t?.primary_keyword) throw new Error("topic finder returned no topic");
    const intents = ["informational", "commercial", "comparison", "news"];
    const { data, error } = await db()
      .from("blog_topics")
      .insert({
        title: String(t.title).slice(0, 200),
        primary_keyword: String(t.primary_keyword).slice(0, 120),
        pillar,
        intent: intents.includes(String(t.intent)) ? t.intent : "informational",
        icp: t.icp ?? null,
        pain_point: t.pain_point ?? null,
        my_term: TERMS.includes(String(t.my_term)) ? t.my_term : null,
        priority: 80,
        status: "in_progress",
        source: "trend",
        source_urls: Array.isArray(t.source_urls) ? t.source_urls.slice(0, 5) : [],
        notes: t.why_now ? String(t.why_now).slice(0, 500) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`topic insert: ${error.message}`);
    await stay(job, { topic_id: data.id });
    return { step: "topic_found", pillar };
  }

  const topic = await loadTopic(job.topic_id);
  const retry = !!job.research?.retry;
  const r = await gemini<{
    questions?: string[];
    facts?: RawFact[];
    gaps?: string[];
    angle?: string;
    secondary_keywords?: string[];
  }>({ model: config.model_research, prompt: researchPrompt(topic, today(), retry), grounded: true, temperature: 0.3 });

  const raw = r.json ?? {};
  let facts = await verifyFacts(raw.facts ?? [], r.grounding);
  // Health, sleep and mental health need 2+ strong sources (groups 1 to 4); research again once,
  // then keep only the strong-source facts plus official product pages
  const health = isHealthTopic(topic);
  const weakHealth = health && strongDomains(facts) < 2;
  if (weakHealth && !retry) {
    await stay(job, { research: { retry: true } });
    return { step: "research_retry_health", strong: strongDomains(facts) };
  }
  if (health) {
    facts = facts
      .filter((f) => sourceTier(f.source_url) <= STRONG_TIER || (sourceTier(f.source_url) === 6 && !!topic.competitor))
      .map((f, i) => ({ ...f, id: `f${i + 1}` }));
  }
  const competitorOk =
    !topic.competitor ||
    facts.some((f) => {
      const name = topic.competitor!.toLowerCase().replace(/\s+/g, "");
      const d = domainOf(f.source_url);
      return d.includes(name) || (/apps\.apple\.com|play\.google\.com/.test(d) && f.source_title.toLowerCase().includes(topic.competitor!.toLowerCase()));
    });
  const enough = facts.length >= 3 && distinctDomains(facts) >= 2 && competitorOk;

  const result: Research = {
    questions: (raw.questions ?? []).slice(0, 8),
    facts,
    gaps: (raw.gaps ?? []).slice(0, 5),
    angle: raw.angle ?? "",
    secondary_keywords: (raw.secondary_keywords ?? []).slice(0, 8),
  };
  const counts = { facts_found: raw.facts?.length ?? 0, verified: facts.length, domains: distinctDomains(facts), competitorOk };

  if (!enough && !retry) {
    await stay(job, { research: { ...result, retry: true } });
    return { step: "research_retry", ...counts };
  }
  if (!enough) {
    // The only case a post is not published: too few verified sources
    await update(job, {
      stage: "needs_review",
      research: result,
      last_error: `research found ${facts.length} verified facts from ${counts.domains} domains${competitorOk ? "" : ", no official competitor page"}`,
      locked_until: null,
    });
    await releaseTopic(job.topic_id);
    await log(FN, "warn", "too few verified sources", { job: job.id, ...counts });
    return { step: "needs_review", ...counts };
  }
  await advance(job, "outline", { research: result });
  return { step: "researched", ...counts };
}

// ---------------------------------------------------------------- outline (7.2)

async function internalLinks() {
  const { data } = await db()
    .from("blog_posts")
    .select("slug,title")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);
  return [
    ...GUIDES.map((g) => ({ title: g.question, href: `/guides/${g.slug}` })),
    ...(data ?? []).map((p: { slug: string; title: string }) => ({ title: p.title, href: `/blog/${p.slug}` })),
  ];
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 60)
    .replace(/-+$/, "");
}

function modelEvent(topic: Topic) {
  try {
    return topic.notes ? (JSON.parse(topic.notes) as { vendor: string; model_name: string }) : null;
  } catch {
    return null;
  }
}

async function outline(job: Job, config: BlogConfig) {
  const topic = await loadTopic(job.topic_id!);
  const kind = kindFor(topic, job.kind);
  const [features, links] = await Promise.all([getFeatures(), internalLinks()]);
  const event = kind === "news" ? modelEvent(topic) : null;
  const app = event?.vendor === "openai" ? "ChatGPT" : event?.vendor === "anthropic" ? "Claude" : "Gemini";
  const vendorName = event?.vendor === "openai" ? "OpenAI" : event?.vendor === "anthropic" ? "Anthropic" : "Google";

  const r = await gemini<Outline>({
    model: config.model_writer,
    system: voiceBlock(topic.my_term),
    prompt: outlinePrompt({
      kind,
      topic,
      research: job.research!,
      features,
      links,
      differentAngle: !!job.outline?.retried,
      newsTemplate: event ? newsTemplate(vendorName, event.model_name, app) : undefined,
    }),
    schema: OUTLINE_SCHEMA,
    temperature: 0.6,
  });
  const o = r.json;
  if (!o?.title || !o.sections?.length) throw new Error("outline missing title or sections");

  // Clean up what the schema can't enforce
  const allowed = new Set(links.map((l) => l.href));
  o.title = o.title.trim().replace(/[—–]/g, ",").replace(/!/g, "");
  o.internal_links = (o.internal_links ?? []).filter((l) => allowed.has(l.href)).slice(0, 5);
  o.tags = (o.tags ?? []).filter((t) => TAGS.includes(t)).slice(0, 4);
  o.cta_after_section = [2, 3].includes(o.cta_after_section) ? o.cta_after_section : 2;
  o.sections = o.sections.slice(0, kind === "comparison" ? 8 : 7);
  o.faq = (o.faq ?? []).slice(0, 5);
  o.my_term = topic.my_term ?? (TERMS.includes(String(o.my_term)) ? o.my_term : null);
  if (kind !== "comparison") o.comparison = null;

  // Unique slug
  let slug = slugify(o.slug || topic.primary_keyword) || slugify(o.title);
  for (let n = 2; ; n++) {
    const { data } = await db().from("blog_posts").select("job_id").eq("slug", slug).maybeSingle();
    if (!data || data.job_id === job.id) break;
    slug = `${slugify(o.slug || topic.primary_keyword).slice(0, 56)}-${n}`;
  }
  o.slug = slug;

  // Not too close to an existing post or another planned topic
  const { data: similar } = await db().rpc("blog_similar_titles", { p_title: o.title });
  const clash = ((similar ?? []) as { source: string; ref: string; title: string; score: number }[]).find(
    (s) => s.score >= 0.6 && !(s.source === "topic" && s.ref === topic.id) && !(s.source === "post" && s.ref === slug),
  );
  if (clash && !job.outline?.retried) {
    await stay(job, { outline: { ...o, kind, retried: true } });
    return { step: "outline_retry", clash: clash.title, score: clash.score };
  }
  await advance(job, "draft", { outline: { ...o, kind, retried: !!job.outline?.retried } });
  return { step: "outlined", kind, sections: o.sections.length, slug };
}

// ---------------------------------------------------------------- draft (7.3)

async function draft(job: Job, config: BlogConfig) {
  const topic = await loadTopic(job.topic_id!);
  const o = job.outline!;
  const [min, max] = LENGTHS[o.kind];
  const features = await getFeatures();
  const r = await gemini<{ content_md: string; word_count: number }>({
    model: config.model_writer,
    system: voiceBlock(o.my_term ?? topic.my_term, { antiSlop: true }),
    prompt: draftPrompt({ outline: o, facts: job.research!.facts, features, minWords: min, maxWords: max }),
    schema: DRAFT_SCHEMA,
    temperature: 0.8,
  });
  if (!r.json?.content_md) throw new Error("draft missing content_md");
  await advance(job, "review", { draft: { content_md: r.json.content_md, round: 0 }, checks: null });
  return { step: "drafted", words: r.json.word_count };
}

// ---------------------------------------------------------------- review (7.4)

function lintInput(job: Job, topic: Topic, features: { facts: string }[], links: string[]): LintInput {
  const o = job.outline!;
  return {
    md: job.draft!.content_md,
    kind: o.kind,
    title: o.title,
    quickAnswer: o.quick_answer,
    primaryKeyword: topic.primary_keyword,
    myTerm: o.my_term ?? topic.my_term,
    sourceUrls: job.research!.facts.map((f) => f.source_url),
    internalHrefs: links,
    allowedNumberText: [...job.research!.facts.map((f) => f.claim), ...features.map((f) => f.facts)].join(" "),
  };
}

const INTEGRITY_ISSUES = new Set(["unsupported_claim", "wrong_focalyst_claim", "unfair_competitor_claim"]);

async function review(job: Job, config: BlogConfig) {
  const topic = await loadTopic(job.topic_id!);
  const o = job.outline!;
  const [features, links] = await Promise.all([getFeatures(), internalLinks()]);
  const input = lintInput(job, topic, features, links.map((l) => l.href));
  const state: ReviewState = job.checks ?? { phase: "check", round: 0, violations: [], issues: [], history: [] };
  const [min, max] = LENGTHS[o.kind];

  if (state.phase === "check") {
    const violations = lint(input);
    const r = await gemini<{ verdict: string; issues: CriticIssue[]; faq_remove?: number[] }>({
      model: config.model_writer,
      system: voiceBlock(o.my_term ?? topic.my_term),
      prompt: criticPrompt({ md: input.md, outline: o, facts: job.research!.facts, features }),
      schema: CRITIC_SCHEMA,
      temperature: 0.2,
    });
    const issues = r.json?.issues ?? [];
    const faqRemove = [...new Set([...(state.faq_remove ?? []), ...(r.json?.faq_remove ?? [])])];
    state.faq_remove = faqRemove;
    const pass = violations.length === 0 && (r.json?.verdict === "pass" || issues.length === 0);
    const history = [...state.history, { round: state.round, violations: describe(violations), issues: issues.length }];

    if (pass) {
      await advance(job, "publish", { checks: { ...state, violations, issues, history, phase: "check" } });
      return { step: "review_passed", round: state.round };
    }
    if (state.round < 2) {
      await stay(job, { checks: { ...state, violations, issues, history, phase: "rewrite" } });
      return { step: "review_failed", round: state.round, violations: violations.length, issues: issues.length };
    }

    // Two rewrites done: remove what's left of the integrity problems in code, then publish
    // Integrity problems, plus generic sentences beyond the 2 allowed, are removed
    const quotes = [
      ...issues.filter((i) => INTEGRITY_ISSUES.has(i.type)).map((i) => i.quote),
      ...issues.filter((i) => i.type === "generic").slice(2).map((i) => i.quote),
    ];
    const cleaned = scrub(input.md, input, quotes);
    const remaining = lint({ ...input, md: cleaned });
    const final: ReviewState = {
      ...state,
      violations: remaining,
      issues,
      history,
      removed: quotes,
      published_with: describe(remaining),
    };
    await advance(job, "publish", { draft: { content_md: cleaned, round: state.round }, checks: final });
    await log(FN, "warn", "publishing with remaining checks", {
      job: job.id,
      integrity: remaining.filter((v) => v.severity === "integrity").length,
      style: remaining.filter((v) => v.severity === "style").length,
    });
    return { step: "review_scrubbed", remaining: remaining.length };
  }

  // phase "rewrite": round 0 fixes the list, round 1 deletes the failing sentences
  const remove = state.round >= 1;
  const r = await gemini<{ content_md: string; word_count: number }>({
    model: config.model_writer,
    system: voiceBlock(o.my_term ?? topic.my_term, { antiSlop: true }),
    prompt: rewritePrompt({
      md: input.md,
      violations: describe(state.violations),
      issues: state.issues,
      facts: job.research!.facts,
      features,
      minWords: min,
      maxWords: max,
      remove,
    }),
    schema: DRAFT_SCHEMA,
    temperature: 0.4,
  });
  if (!r.json?.content_md) throw new Error("rewrite missing content_md");
  await stay(job, {
    draft: { content_md: r.json.content_md, round: state.round + 1 },
    checks: { ...state, round: state.round + 1, phase: "check" },
  });
  return { step: remove ? "rewrite_remove" : "rewrite", round: state.round + 1 };
}

// ---------------------------------------------------------------- publish (7.5)

async function publish(job: Job, config: BlogConfig) {
  const topic = await loadTopic(job.topic_id!);
  const o = job.outline!;
  const postId = await writePost({
    jobId: job.id,
    topic,
    kind: o.kind,
    outline: o,
    md: job.draft!.content_md,
    facts: job.research!.facts,
    secondaryKeywords: job.research!.secondary_keywords,
    checks: job.checks,
    faqRemove: (job.checks as ReviewState | null)?.faq_remove ?? [],
    config,
    publish: config.auto_publish,
  });
  const site = config.auto_publish ? await refreshSite(o.slug, config) : null;
  await db().from("blog_topics").update({ status: "used", used_at: new Date().toISOString() }).eq("id", topic.id);
  await update(job, {
    stage: config.auto_publish ? "done" : "needs_review",
    post_id: postId,
    locked_until: null,
    last_error: null,
  });
  return { step: config.auto_publish ? "published" : "saved_for_review", slug: o.slug, ...site };
}

// ---------------------------------------------------------------- entry

const STAGES: Record<string, (job: Job, config: BlogConfig) => Promise<Record<string, unknown>>> = {
  research,
  outline,
  draft,
  review,
  publish,
};

// {"dry_run": true, "topic_title": "..."}: queue a manual job for that topic (it then runs like any other)
async function queueTopic(title: string) {
  const { data: found } = await db().from("blog_topics").select("id,status").ilike("title", title).limit(1).maybeSingle();
  let topicId = found?.id as string | undefined;
  if (!topicId) {
    const { data, error } = await db()
      .from("blog_topics")
      .insert({ title, primary_keyword: title.toLowerCase(), pillar: "focus", source: "manual", priority: 95, status: "in_progress" })
      .select("id")
      .single();
    if (error) throw new Error(`topic insert: ${error.message}`);
    topicId = data.id;
  }
  const { data: open } = await db()
    .from("blog_jobs")
    .select("id")
    .eq("topic_id", topicId)
    .in("stage", ["research", "outline", "draft", "review", "publish"])
    .limit(1)
    .maybeSingle();
  if (open) return open.id as string;
  await db().from("blog_topics").update({ status: "in_progress" }).eq("id", topicId);
  const { data: job, error } = await db()
    .from("blog_jobs")
    .insert({ kind: "manual", topic_id: topicId, stage: "research" })
    .select("id")
    .single();
  if (error) throw new Error(`job insert: ${error.message}`);
  return job.id as string;
}

Deno.serve(async (req) => {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const started = Date.now();
  const config = await getConfig();

  let queued: string | undefined;
  if (body?.dry_run && typeof body.topic_title === "string") {
    queued = await queueTopic(body.topic_title.slice(0, 200));
    await log(FN, "info", "manual job queued", { job: queued });
  }
  if (!config.enabled) return json({ idle: true, reason: "disabled", queued });

  const { data: claimed, error } = await db().rpc("blog_claim_job");
  if (error) {
    await log(FN, "error", `claim failed: ${error.message}`);
    return json({ error: "claim failed" }, 500);
  }
  const job = (claimed as Job[] | null)?.[0];
  if (!job) return json({ idle: true, queued });

  const stage = job.stage;
  try {
    const result = await STAGES[stage](job, config);
    const ms = Date.now() - started;
    await log(FN, "info", `${stage}: ${result.step}`, { job: job.id, ms, ...result });
    return json({ job: job.id, stage, ms, queued, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const ms = Date.now() - started;
    if (e instanceof GeminiBusy) {
      await update(job, {
        attempts: Math.max(0, job.attempts - 1),
        run_after: new Date(Date.now() + 3600_000).toISOString(),
        locked_until: null,
        last_error: message,
      });
      await log(FN, "warn", `${stage}: Gemini busy, retry in 1 hour`, { job: job.id, ms });
      return json({ job: job.id, stage, busy: true });
    }
    if (job.attempts >= MAX_ATTEMPTS) {
      await update(job, { stage: "failed", locked_until: null, last_error: message.slice(0, 1000) });
      await releaseTopic(job.topic_id);
      await log(FN, "error", `${stage}: failed after ${job.attempts} attempts`, { job: job.id, ms, error: message.slice(0, 300) });
    } else {
      await update(job, {
        locked_until: null,
        run_after: new Date(Date.now() + 60_000).toISOString(),
        last_error: message.slice(0, 1000),
      });
      await log(FN, "error", `${stage}: ${message.slice(0, 300)}`, { job: job.id, ms, attempt: job.attempts });
    }
    return json({ job: job.id, stage, error: message.slice(0, 300) }, 500);
  }
});
