export interface ResearchFact {
  id: string;
  claim: string;
  source_title: string;
  source_url: string;
  publisher: string;
  verified_at?: string;
}

export const DOMAIN_BLOCKLIST = [
  'medium.com',
  'quora.com',
  'pinterest.com',
  'pastebin.com',
  'buzzfeed.com',
  'ehow.com',
  'answers.com',
  'chegg.com',
  'coursehero.com',
  'scribd.com',
  'slideshare.net',
  'hubpages.com',
  'ezinearticles.com',
  'brainly.com',
  'geeksforgeeks.org',
  'w3schools.com',
  'about.com',
  'lifewire.com',
];

export function extractHostname(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isDomainBlocked(urlStr: string): boolean {
  const host = extractHostname(urlStr);
  if (!host) return true;
  return DOMAIN_BLOCKLIST.some((blocked) => host === blocked || host.endsWith('.' + blocked));
}

export async function resolveRedirect(urlStr: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s
    const resp = await fetch(urlStr, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp.url || urlStr;
  } catch {
    return urlStr;
  }
}

export async function checkHtmlUrl(urlStr: string): Promise<{ ok: boolean; finalUrl: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const resp = await fetch(urlStr, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return { ok: false, finalUrl: urlStr };
    }

    const contentType = (resp.headers.get('content-type') || '').toLowerCase();
    const finalUrl = resp.url || urlStr;

    // Check if it's HTML
    if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
      return { ok: true, finalUrl };
    }

    // Some servers don't return accurate content-type; check first 512 bytes
    const textPrefix = await resp.text().catch(() => '');
    if (textPrefix.toLowerCase().includes('<html') || textPrefix.toLowerCase().includes('<!doctype')) {
      return { ok: true, finalUrl };
    }

    return { ok: false, finalUrl };
  } catch {
    return { ok: false, finalUrl: urlStr };
  }
}

export async function resolveGroundingChunks(groundingMetadata: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const chunks = groundingMetadata?.groundingChunks || [];

  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    if (uri && typeof uri === 'string') {
      try {
        const finalUrl = await resolveRedirect(uri);
        map.set(uri, finalUrl);
      } catch {
        map.set(uri, uri);
      }
    }
  }

  return map;
}

export async function verifyResearchFacts(
  facts: ResearchFact[],
  groundedUrlMap: Map<string, string>,
  competitor?: string | null
): Promise<{ verifiedFacts: ResearchFact[]; uniqueDomains: string[]; competitorVerified: boolean }> {
  const verifiedFacts: ResearchFact[] = [];
  const domainSet = new Set<string>();
  let competitorVerified = false;
  const compLower = competitor ? competitor.toLowerCase().trim() : '';

  for (const fact of facts) {
    if (!fact.source_url || !fact.claim) continue;

    // Resolve URL through grounded map or directly
    let targetUrl = groundedUrlMap.get(fact.source_url) || fact.source_url;
    if (targetUrl.includes('google.com/url') || targetUrl.includes('vertexaisearch')) {
      targetUrl = await resolveRedirect(targetUrl);
    }

    if (isDomainBlocked(targetUrl)) {
      continue;
    }

    const check = await checkHtmlUrl(targetUrl);
    if (!check.ok) {
      continue;
    }

    const finalUrl = check.finalUrl;
    const host = extractHostname(finalUrl);
    if (!host || isDomainBlocked(finalUrl)) {
      continue;
    }

    domainSet.add(host);

    if (compLower && (host.includes(compLower) || (fact.source_title && fact.source_title.toLowerCase().includes(compLower)))) {
      competitorVerified = true;
    }

    verifiedFacts.push({
      ...fact,
      source_url: finalUrl,
      verified_at: new Date().toISOString(),
    });
  }

  return {
    verifiedFacts,
    uniqueDomains: Array.from(domainSet),
    competitorVerified,
  };
}
