// 7.5 Publish: write the blog_posts row, refresh the site, ping IndexNow.
import { db, log, type BlogConfig } from "./db.ts";
import { wordCount } from "./lint.ts";
import type { Kind, Outline, Topic } from "./prompts.ts";
import type { VerifiedFact } from "./verify.ts";

// Public by design: the same key is served at focalyst.online/<key>.txt
const DEFAULT_INDEXNOW_KEY = "826f91132875a9c1547b5971fa84f5cf";

export function sourcesFrom(facts: VerifiedFact[]) {
  const seen = new Map<string, { title: string; url: string; publisher: string; checked: string }>();
  for (const f of facts) {
    if (!seen.has(f.source_url)) {
      seen.set(f.source_url, { title: f.source_title, url: f.source_url, publisher: f.publisher, checked: f.checked });
    }
  }
  return [...seen.values()];
}

export async function writePost(o: {
  jobId: string;
  topic: Topic;
  kind: Kind;
  outline: Outline;
  md: string;
  facts: VerifiedFact[];
  secondaryKeywords: string[];
  checks: unknown;
  config: BlogConfig;
  publish: boolean;
}) {
  const words = wordCount(o.md);
  const cited = o.facts.filter((f) => o.md.includes(f.source_url));
  const row = {
    slug: o.outline.slug,
    title: o.outline.title,
    meta_title: o.outline.title,
    description: o.outline.description,
    quick_answer: o.outline.quick_answer,
    content_md: o.md,
    faq: o.outline.faq,
    sources: sourcesFrom(cited.length ? cited : o.facts),
    comparison: o.kind === "comparison" ? o.outline.comparison ?? null : null,
    tags: o.outline.tags,
    pillar: o.topic.pillar,
    kind: o.kind,
    primary_keyword: o.topic.primary_keyword,
    secondary_keywords: o.secondaryKeywords,
    my_term: o.outline.my_term ?? o.topic.my_term,
    word_count: words,
    reading_minutes: Math.max(1, Math.ceil(words / 230)),
    author: o.config.author,
    ai_assisted: true,
    checks: o.checks,
    topic_id: o.topic.id,
    job_id: o.jobId,
    status: o.publish ? "published" : "needs_review",
    published_at: o.publish ? new Date().toISOString() : null,
  };
  const { data, error } = await db().from("blog_posts").upsert(row, { onConflict: "slug" }).select("id").single();
  if (error) throw new Error(`blog_posts upsert: ${error.message}`);
  return data.id as string;
}

export async function refreshSite(slug: string, config: BlogConfig) {
  const site = (Deno.env.get("SITE_URL") || config.site_url).replace(/\/$/, "");
  const secret = Deno.env.get("REVALIDATE_SECRET");
  const result = { revalidate: "skipped", indexnow: "skipped" };

  if (secret) {
    try {
      const res = await fetch(`${site}/api/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(15_000),
      });
      result.revalidate = String(res.status);
      await res.body?.cancel();
    } catch (e) {
      result.revalidate = e instanceof Error ? e.name : "failed";
    }
  } else {
    await log("publish", "warn", "REVALIDATE_SECRET not set; pages refresh within the hour instead");
  }

  const key = Deno.env.get("INDEXNOW_KEY") || DEFAULT_INDEXNOW_KEY;
  try {
    const url = encodeURIComponent(`${site}/blog/${slug}`);
    const res = await fetch(`https://api.indexnow.org/indexnow?url=${url}&key=${key}`, {
      signal: AbortSignal.timeout(15_000),
    });
    result.indexnow = String(res.status);
    await res.body?.cancel();
  } catch (e) {
    result.indexnow = e instanceof Error ? e.name : "failed";
  }
  return result;
}
