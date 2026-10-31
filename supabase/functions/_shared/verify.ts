// Source checks: resolve Google grounding redirects and keep only pages that load.
import type { GroundingLink } from "./gemini.ts";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// Content farms, AI listicle sites, pastebins, social and Q&A pages we never cite
const BLOCKED = [
  "pastebin.com", "ghostbin", "hastebin", "medium.com", "quora.com", "reddit.com", "pinterest.",
  "facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com",
  "scribd.com", "slideshare.net", "coursehero.com", "chegg.com", "brainly.", "answers.com",
  "ezinearticles", "hubpages.com", "wikihow.com", "blogspot.", "wordpress.com", "substack.com",
  "vertexaisearch.cloud.google.com", "focalyst.online",
];

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isBlocked(url: string) {
  const d = domainOf(url);
  return (
    !d ||
    BLOCKED.some((b) => {
      if (b.endsWith(".")) return d.startsWith(b) || d.includes(`.${b}`); // any TLD, e.g. "pinterest."
      if (!b.includes(".")) return d.includes(b); // name fragments, e.g. "ghostbin"
      return d === b || d.endsWith(`.${b}`);
    })
  );
}

export function normaliseUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^utm_|^ref$|^fbclid$|^gclid$/.test(k)) u.searchParams.delete(k);
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export interface PageCheck {
  ok: boolean;
  url: string; // final URL after redirects
  title?: string;
  reason?: string;
}

const cache = new Map<string, Promise<PageCheck>>();

// 200 with HTML within 10 s, not on the block list
export function checkPage(url: string): Promise<PageCheck> {
  if (!cache.has(url)) {
    cache.set(
      url,
      (async () => {
        if (!/^https?:\/\//.test(url)) return { ok: false, url, reason: "not http" };
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000);
        try {
          const res = await fetch(url, {
            redirect: "follow",
            signal: ctrl.signal,
            headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
          });
          const final = normaliseUrl(res.url || url);
          const type = res.headers.get("content-type") ?? "";
          const html = res.ok && type.includes("html") ? await res.text() : "";
          if (!html) await res.body?.cancel().catch(() => {});
          if (isBlocked(final)) return { ok: false, url: final, reason: "blocked domain" };
          if (!res.ok) return { ok: false, url: final, reason: `status ${res.status}` };
          if (!html) return { ok: false, url: final, reason: "not html" };
          const title = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim();
          return { ok: true, url: final, title };
        } catch (e) {
          return { ok: false, url, reason: e instanceof Error ? e.name : "fetch failed" };
        } finally {
          clearTimeout(timer);
        }
      })(),
    );
  }
  return cache.get(url)!;
}

// Grounding chunks are Google redirect links: follow each one to its real page
export async function resolveGrounding(links: GroundingLink[]) {
  const checks = await Promise.all(links.slice(0, 20).map((l) => checkPage(l.uri)));
  return checks.map((c, i) => ({ ...c, groundTitle: links[i].title }));
}

export interface RawFact {
  id?: string;
  claim: string;
  source_title?: string;
  source_url?: string;
  publisher?: string;
}

export interface VerifiedFact {
  id: string;
  claim: string;
  source_title: string;
  source_url: string;
  publisher: string;
  checked: string;
}

// Keep facts whose page loads; match by URL first, then by grounded page domain or title
export async function verifyFacts(facts: RawFact[], grounding: GroundingLink[]): Promise<VerifiedFact[]> {
  const grounded = (await resolveGrounding(grounding)).filter((g) => g.ok);
  const today = new Date().toISOString().slice(0, 10);
  const out: VerifiedFact[] = [];
  const results = await Promise.all(
    facts.slice(0, 12).map(async (f) => {
      if (!f.claim) return null;
      let page: PageCheck | null = null;
      if (f.source_url) {
        const direct = await checkPage(f.source_url);
        if (direct.ok) page = direct;
      }
      if (!page) {
        const want = f.source_url ? domainOf(f.source_url) : "";
        const match = grounded.find(
          (g) =>
            (want && domainOf(g.url) === want) ||
            (!!f.publisher && g.groundTitle.toLowerCase().includes(f.publisher.toLowerCase())),
        );
        if (match) page = match;
      }
      if (!page) return null;
      return {
        claim: f.claim.trim(),
        source_title: (f.source_title || page.title || domainOf(page.url)).slice(0, 200),
        source_url: page.url,
        publisher: (f.publisher || domainOf(page.url)).slice(0, 80),
        checked: today,
      };
    }),
  );
  results.forEach((r, i) => {
    if (r) out.push({ id: `f${i + 1}`, ...r });
  });
  return out;
}

export function distinctDomains(facts: { source_url: string }[]) {
  return new Set(facts.map((f) => domainOf(f.source_url))).size;
}
