// blog-trends: refills the topic backlog from what readers are asking this week (BLOG_AUTOMATION.md section 8)
import { authorized, json } from "../_shared/auth.ts";
import { db, getConfig, log } from "../_shared/db.ts";
import { readFeeds } from "../_shared/feeds.ts";
import { gemini, GeminiBusy } from "../_shared/gemini.ts";
import { trendsPrompt } from "../_shared/prompts.ts";
import { TERMS } from "../_shared/style.ts";
import { checkPage } from "../_shared/verify.ts";

const FN = "blog-trends";
const PILLARS = ["focus", "study", "habits", "attention", "ai", "planning", "compare"];
const INTENTS = ["informational", "commercial", "comparison", "news"];
const MAX_NEW = 6;

interface Idea {
  title?: string;
  primary_keyword?: string;
  pillar?: string;
  intent?: string;
  icp?: string;
  pain_point?: string;
  my_term?: string | null;
  why_now?: string;
  source_urls?: string[];
}

// 90 when why_now names a date within the next 14 days
function soon(whyNow = "") {
  const now = Date.now();
  const matches = whyNow.match(/\b(\d{1,2} [A-Z][a-z]+ \d{4}|[A-Z][a-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})\b/g) ?? [];
  return matches.some((m) => {
    const t = Date.parse(m);
    return !isNaN(t) && t >= now - 86400_000 && t <= now + 14 * 86400_000;
  });
}

Deno.serve(async (req) => {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  const started = Date.now();
  const config = await getConfig();
  if (!config.enabled) return json({ idle: true, reason: "disabled" });

  const { items, failed } = await readFeeds("trend", 24 * 7);
  let ideas: Idea[] = [];
  try {
    const r = await gemini<{ topics?: Idea[] } | Idea[]>({
      model: config.model_research,
      prompt: trendsPrompt(new Date().toISOString().slice(0, 10), items.map((i) => i.title)),
      grounded: true,
      temperature: 0.5,
    });
    ideas = Array.isArray(r.json) ? r.json : r.json?.topics ?? [];
  } catch (e) {
    const busy = e instanceof GeminiBusy;
    await log(FN, busy ? "warn" : "error", busy ? "Gemini busy, next run will retry" : `trend search failed: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
    return json({ error: "trend search failed" }, busy ? 200 : 500);
  }

  const added: string[] = [];
  const skipped: Record<string, number> = { invalid: 0, similar: 0, sources: 0 };
  for (const idea of ideas) {
    if (added.length >= MAX_NEW || Date.now() - started > 120_000) break;
    if (!idea.title || !idea.primary_keyword || !PILLARS.includes(String(idea.pillar))) {
      skipped.invalid++;
      continue;
    }
    // Too close to an existing post or used topic, or to an idea already in the backlog
    const { data: similar } = await db().rpc("blog_similar_titles", { p_title: idea.title });
    const { data: sameKeyword } = await db().from("blog_topics").select("id").ilike("primary_keyword", idea.primary_keyword).limit(1);
    if ((similar ?? []).length || (sameKeyword ?? []).length) {
      skipped.similar++;
      continue;
    }
    const checks = await Promise.all((idea.source_urls ?? []).slice(0, 4).map((u) => checkPage(u)));
    const verified = checks.filter((c) => c.ok).map((c) => c.url);
    if (!verified.length) {
      skipped.sources++;
      continue;
    }
    const { error } = await db().from("blog_topics").insert({
      title: idea.title.slice(0, 200),
      primary_keyword: idea.primary_keyword.slice(0, 120).toLowerCase(),
      pillar: idea.pillar,
      intent: INTENTS.includes(String(idea.intent)) ? idea.intent : "informational",
      icp: idea.icp ?? null,
      pain_point: idea.pain_point ?? null,
      my_term: TERMS.includes(String(idea.my_term)) ? idea.my_term : null,
      priority: soon(idea.why_now) ? 90 : 75,
      source: "trend",
      source_urls: verified,
      notes: idea.why_now?.slice(0, 500) ?? null,
    });
    if (error) skipped.similar++;
    else added.push(idea.title);
  }

  const summary = { feed_items: items.length, ideas: ideas.length, added: added.length, skipped, failed_feeds: failed, ms: Date.now() - started };
  await log(FN, "info", `added ${added.length} topics`, summary);
  return json({ ...summary, titles: added });
});
