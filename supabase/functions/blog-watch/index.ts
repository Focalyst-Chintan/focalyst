// blog-watch: detects major model launches from OpenAI, Anthropic and Google (BLOG_AUTOMATION.md section 9)
import { authorized, json } from "../_shared/auth.ts";
import { db, getConfig, log } from "../_shared/db.ts";
import { readFeeds } from "../_shared/feeds.ts";
import { gemini, GeminiBusy } from "../_shared/gemini.ts";
import { classifyPrompt } from "../_shared/prompts.ts";
import { domainOf } from "../_shared/verify.ts";

const FN = "blog-watch";
const KEYWORDS = /\b(gpt|o\d|o-series|claude|opus|sonnet|haiku|gemini|new model|introducing|launch(es|ed)?|release[sd]?)\b/i;
const OFFICIAL = ["openai.com", "anthropic.com", "blog.google", "deepmind.google", "ai.google.dev"];
const MAX_CLASSIFY = 5; // Gemini calls per run

interface Verdict {
  is_major_model_release?: boolean;
  vendor?: "openai" | "anthropic" | "google" | null;
  model_name?: string | null;
  official_url?: string | null;
  confidence?: number;
}

function official(url: string | null | undefined) {
  const d = url ? domainOf(url) : "";
  return !!d && OFFICIAL.some((o) => d === o || d.endsWith(`.${o}`));
}

Deno.serve(async (req) => {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  const started = Date.now();
  const config = await getConfig();
  if (!config.enabled) return json({ idle: true, reason: "disabled" });

  const { items, failed } = await readFeeds("model_news", 72);
  const seen = new Set<string>();
  const candidates = items
    .filter((i) => KEYWORDS.test(i.title))
    .filter((i) => {
      const key = i.title.toLowerCase().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.published?.getTime() ?? 0) - (a.published?.getTime() ?? 0))
    .slice(0, MAX_CLASSIFY);

  const { data: known } = await db().from("blog_model_events").select("vendor,model_name");
  const knownKeys = new Set(((known ?? []) as { vendor: string; model_name: string }[]).map((k) => `${k.vendor}:${k.model_name.toLowerCase()}`));

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: launchesToday } = await db()
    .from("blog_jobs")
    .select("id", { count: "exact", head: true })
    .eq("kind", "model_launch")
    .gte("created_at", startOfDay.toISOString());
  let budget = config.max_launch_posts_per_day - (launchesToday ?? 0);

  const created: string[] = [];
  let classified = 0;
  for (const item of candidates) {
    if (Date.now() - started > 110_000) break;
    let v: Verdict | null = null;
    try {
      v = (await gemini<Verdict>({ model: config.model_research, prompt: classifyPrompt(item), grounded: true, temperature: 0 })).json;
      classified++;
    } catch (e) {
      if (e instanceof GeminiBusy) break;
      await log(FN, "warn", `classify failed: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
      continue;
    }
    if (!v?.is_major_model_release || (v.confidence ?? 0) < 0.8 || !v.vendor || !v.model_name) continue;
    if (!official(v.official_url)) continue;
    const key = `${v.vendor}:${v.model_name.toLowerCase()}`;
    if (knownKeys.has(key) || budget <= 0) continue;

    const { data: event, error: evErr } = await db()
      .from("blog_model_events")
      .insert({ vendor: v.vendor, model_name: v.model_name, title: item.title, source_url: v.official_url, announced_at: item.published?.toISOString() ?? null })
      .select("id")
      .single();
    if (evErr) continue; // unique index: another run got it first
    knownKeys.add(key);

    const { data: topic, error: tErr } = await db()
      .from("blog_topics")
      .insert({
        title: `${v.model_name} is out: using it with your Focalyst plan`,
        primary_keyword: `${v.model_name} mcp`.toLowerCase(),
        pillar: "ai",
        intent: "news",
        icp: "professionals and students who use AI apps",
        pain_point: "wants to use the new model with their real plan",
        my_term: "AI Leverage",
        priority: 100,
        status: "in_progress",
        source: "model_event",
        source_urls: [v.official_url!],
        notes: JSON.stringify({ vendor: v.vendor, model_name: v.model_name, official_url: v.official_url }),
      })
      .select("id")
      .single();
    if (tErr) {
      await log(FN, "error", `topic insert failed: ${tErr.message}`);
      continue;
    }
    const { data: job } = await db().from("blog_jobs").insert({ kind: "model_launch", topic_id: topic.id, stage: "research" }).select("id").single();
    if (job) await db().from("blog_model_events").update({ job_id: job.id }).eq("id", event.id);
    created.push(`${v.vendor} ${v.model_name}`);
    budget--;
  }

  const summary = { items: items.length, candidates: candidates.length, classified, created, failed_feeds: failed, ms: Date.now() - started };
  await log(FN, created.length ? "info" : "info", created.length ? `launch posts queued: ${created.join(", ")}` : "no new launches", summary);
  return json(summary);
});
