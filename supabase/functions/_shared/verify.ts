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
  // statistics roundups and SEO content sites
  "sqmagazine.co.uk", "demandsage.com", "explodingtopics.com", "backlinko.com", "zippia.com", "statista.com",
  "gitnux.org", "zipdo.co", "worldmetrics.org", "wifitalents.com", "enterpriseappstoday.com", "earthweb.com",
  "financesonline.com", "techjury.net", "notta.ai", "cropink.com", "amraandelma.com", "electroiq.com",
  "marketsplash.com", "teamstage.io", "crossrivertherapy.com", "thezebra.com", "headphonesaddict.com",
  "businessdasher.com", "truelist.co", "colorlib.com", "authorityhacker.com", "semrush.com", "ahrefs.com",
  "hubspot.com",
];

// Statistics listicle aggregators by domain name ("xyzstatistics.com", "stats-hub.net")
const STATS_DOMAIN = /(statistic|stats)/;
// Press-release wires: allowed only as the last resort for a named survey (lowest tier)
const PRESS_WIRES = ["prnewswire.com", "businesswire.com", "globenewswire.com", "einpresswire.com", "newswire.com", "prweb.com", "accesswire.com"];

const HOSPITALS = [
  "mayoclinic.org", "clevelandclinic.org", "hopkinsmedicine.org", "health.harvard.edu", "massgeneral.org",
  "mountsinai.org", "nyulangone.org", "stanfordhealthcare.org", "uclahealth.org", "kp.org", "sleepfoundation.org",
  "aasm.org", "sleepeducation.org", "heart.org", "psychiatry.org", "nami.org", "mind.org.uk", "cedars-sinai.org",
  "health.clevelandclinic.org", "medlineplus.gov", "webmd.com",
];
const JOURNALS = [
  "pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov", "nature.com", "sciencedirect.com", "thelancet.com",
  "jamanetwork.com", "apa.org", "bmj.com", "nejm.org", "cell.com", "science.org", "springer.com", "wiley.com",
  "plos.org", "frontiersin.org", "mdpi.com", "oup.com", "tandfonline.com", "sagepub.com", "cochranelibrary.com",
  "pnas.org", "arxiv.org", "biorxiv.org", "medrxiv.org", "nber.org",
];
const PUBLIC_BODIES = ["who.int", "nhs.uk", "nih.gov", "cdc.gov", "europa.eu", "un.org", "unesco.org", "oecd.org"];
const NEWS_RESEARCH = [
  "pewresearch.org", "reuters.com", "bbc.com", "bbc.co.uk", "apnews.com", "gallup.com", "nytimes.com",
  "theguardian.com", "economist.com", "ft.com", "npr.org", "washingtonpost.com", "wsj.com", "bloomberg.com",
  "thehindu.com", "indianexpress.com", "hindustantimes.com", "timesofindia.indiatimes.com", "ofcom.org.uk",
  "commonsensemedia.org", "rand.org", "brookings.edu",
];

const onList = (d: string, list: string[]) => list.some((b) => d === b || d.endsWith(`.${b}`));

// 1 government and public health, 2 universities, 3 journals, 4 hospitals and health systems,
// 5 established research and news organisations, 6 anything else (official company pages), 7 press wires
export function sourceTier(url: string): number {
  const d = domainOf(url);
  if (!d) return 7;
  if (onList(d, PRESS_WIRES)) return 7;
  if (onList(d, PUBLIC_BODIES) || /\.gov(\.[a-z]{2})?$/.test(d) || /\.gov\.[a-z]{2}$/.test(d) || /\.nic\.in$/.test(d)) return 1;
  if (onList(d, JOURNALS)) return 3;
  if (onList(d, HOSPITALS)) return 4;
  if (/\.edu(\.[a-z]{2})?$/.test(d) || /\.ac\.[a-z]{2}$/.test(d)) return 2;
  if (onList(d, NEWS_RESEARCH)) return 5;
  return 6;
}

export const STRONG_TIER = 4; // tiers 1 to 4 count as strong sources for health claims

export function strongDomains(facts: { source_url: string }[]) {
  return new Set(facts.filter((f) => sourceTier(f.source_url) <= STRONG_TIER).map((f) => domainOf(f.source_url))).size;
}

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
    (STATS_DOMAIN.test(d) && sourceTierSafe(d)) ||
    BLOCKED.some((b) => {
      if (b.endsWith(".")) return d.startsWith(b) || d.includes(`.${b}`); // any TLD, e.g. "pinterest."
      if (!b.includes(".")) return d.includes(b); // name fragments, e.g. "ghostbin"
      return d === b || d.endsWith(`.${b}`);
    })
  );
}

// A domain with "stats" or "statistic" in its name is blocked unless it is an official body (e.g. ons.gov.uk)
function sourceTierSafe(d: string) {
  return !(onList(d, PUBLIC_BODIES) || /\.gov(\.[a-z]{2})?$/.test(d) || /\.(edu|ac)(\.|$)/.test(d));
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
  // Best sources first; press wires only when nothing else backs a fact
  const kept = results.filter((r): r is NonNullable<typeof r> => !!r);
  const nonWire = kept.filter((r) => sourceTier(r.source_url) < 7);
  (nonWire.length >= 3 ? nonWire : kept)
    .sort((a, b) => sourceTier(a.source_url) - sourceTier(b.source_url))
    .forEach((r, i) => out.push({ id: `f${i + 1}`, ...r }));
  return out;
}

export function distinctDomains(facts: { source_url: string }[]) {
  return new Set(facts.map((f) => domainOf(f.source_url))).size;
}
