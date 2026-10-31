// Minimal RSS 2.0 / Atom reader for blog_feeds
import { db } from "./db.ts";

export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  published: Date | null;
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

export function parseFeed(xml: string): FeedItem[] {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return blocks.map((b) => {
    const link = isAtom
      ? (b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) ?? b.match(/<link[^>]*href="([^"]+)"/i))?.[1] ?? ""
      : tag(b, "link") || (b.match(/<guid[^>]*>([^<]+)<\/guid>/i)?.[1] ?? "");
    const date = tag(b, isAtom ? "updated" : "pubDate") || tag(b, "published") || tag(b, "dc:date");
    const parsed = date ? new Date(date) : null;
    return {
      title: tag(b, "title"),
      link: link.trim(),
      summary: tag(b, isAtom ? "summary" : "description") || tag(b, "content"),
      published: parsed && !isNaN(parsed.getTime()) ? parsed : null,
    };
  });
}

export async function fetchFeed(url: string): Promise<{ ok: boolean; items: FeedItem[]; reason?: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FocalystJournalBot/1.0 (+https://focalyst.online/blog)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, items: [], reason: `status ${res.status}` };
    }
    const xml = await res.text();
    if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) return { ok: false, items: [], reason: "not RSS or Atom" };
    return { ok: true, items: parseFeed(xml) };
  } catch (e) {
    return { ok: false, items: [], reason: e instanceof Error ? e.name : "fetch failed" };
  }
}

export async function readFeeds(kind: "model_news" | "trend", sinceHours: number) {
  const { data } = await db().from("blog_feeds").select("name,url").eq("kind", kind).eq("active", true);
  const since = Date.now() - sinceHours * 3600_000;
  const results = await Promise.all(((data ?? []) as { name: string; url: string }[]).map(async (f) => ({ ...f, ...(await fetchFeed(f.url)) })));
  const items = results.flatMap((r) => r.items.filter((i) => !i.published || i.published.getTime() >= since));
  return { items, failed: results.filter((r) => !r.ok).map((r) => ({ name: r.name, reason: r.reason })) };
}
