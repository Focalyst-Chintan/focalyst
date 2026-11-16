import { BANNED_WORDS, BANNED_PHRASES, MY_TERMS_LIST } from './style';
import { blogSimilarTitles, getPool } from './db';

export interface LintParams {
  contentMd: string;
  title: string;
  quickAnswer: string;
  primaryKeyword: string;
  myTerm: string | null;
  kind: string;
  minWords: number;
  maxWords: number;
  verifiedSourceUrls: string[];
  allowedInternalHrefs: string[];
  verifiedFactClaims: string[];
  productFactDetails: string[];
}

export interface LintResult {
  pass: boolean;
  violations: string[];
  wordCount: number;
}

export async function lintDraft(params: LintParams): Promise<LintResult> {
  const violations: string[] = [];
  const text = params.contentMd;

  // 1. Strip code blocks for certain punctuation checks
  const textWithoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

  // 2. Dashes check: no em dashes "—", no en dashes "–", no " - " used as dash
  if (text.includes('—')) {
    violations.push('Contains em dash (—). Em dashes are strictly prohibited.');
  }
  if (text.includes('–')) {
    violations.push('Contains en dash (–). En dashes are strictly prohibited.');
  }
  if (/\s-\s/.test(textWithoutCode)) {
    violations.push('Contains space-hyphen-space (" - ") used as a dash. Use commas or separate sentences.');
  }

  // 3. Exclamation marks outside code
  if (textWithoutCode.includes('!')) {
    // Make sure it is not part of markdown image syntax ![alt](url)
    const withoutImages = textWithoutCode.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
    if (withoutImages.includes('!')) {
      violations.push('Contains exclamation marks (!). Exclamation marks are prohibited.');
    }
  }

  // 4. Banned words and phrases (case-insensitive whole word, except "AI Leverage" allowed)
  for (const phrase of BANNED_PHRASES) {
    const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i');
    if (regex.test(textWithoutCode)) {
      violations.push(`Contains banned phrase: "${phrase}"`);
    }
  }

  for (const word of BANNED_WORDS) {
    if (word.toLowerCase() === 'leverage') {
      // "AI Leverage" is allowed
      const leverageRegex = /\b([a-zA-Z]+)?\s*leverage\b/gi;
      let match;
      while ((match = leverageRegex.exec(textWithoutCode)) !== null) {
        const fullMatch = match[0];
        if (fullMatch !== 'AI Leverage') {
          violations.push(`Contains banned word: "leverage" outside the allowed term "AI Leverage"`);
          break;
        }
      }
      continue;
    }

    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    if (regex.test(textWithoutCode)) {
      violations.push(`Contains banned word: "${word}"`);
    }
  }

  // 5. Length / Word Count
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (wordCount < params.minWords || wordCount > params.maxWords) {
    violations.push(`Word count is ${wordCount}, expected between ${params.minWords} and ${params.maxWords} words.`);
  }

  // 6. Headings check
  // H2 count between 4 and 7 (or 4 and 8 for comparisons)
  const h2Matches = Array.from(text.matchAll(/^##\s+(.+)$/gm));
  const h2Count = h2Matches.length;
  const maxH2 = params.kind === 'comparison' ? 8 : 7;
  if (h2Count < 4 || h2Count > maxH2) {
    violations.push(`H2 section count is ${h2Count}, must be between 4 and ${maxH2}.`);
  }

  // First paragraph after each H2 is 70 words or fewer
  const sections = text.split(/^##\s+/m).slice(1);
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const lines = sec.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('[[cta]]'));
    const firstParagraph = lines[0] || '';
    const firstParaWords = firstParagraph.split(/\s+/).filter(Boolean).length;
    if (firstParaWords > 70) {
      violations.push(`First paragraph after H2 #${i + 1} is ${firstParaWords} words (limit is 70 words). Lead: "${firstParagraph.slice(0, 40)}..."`);
    }
  }

  // 7. CTA: [[cta]] appears exactly once
  const ctaMatches = text.match(/\[\[cta\]\]/g) || [];
  if (ctaMatches.length !== 1) {
    violations.push(`The token [[cta]] must appear exactly once, but was found ${ctaMatches.length} times.`);
  }

  // 8. Links check
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  const externalLinks: string[] = [];
  const internalLinks: string[] = [];

  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const href = linkMatch[2].trim();
    if (href.startsWith('http://') || href.startsWith('https://')) {
      externalLinks.push(href);
    } else if (href.startsWith('/')) {
      internalLinks.push(href);
    }
  }

  // External links: every one must be in verified source URLs
  const normSources = params.verifiedSourceUrls.map(normaliseUrl);
  for (const ext of externalLinks) {
    const normExt = normaliseUrl(ext);
    const found = normSources.some((s) => s === normExt || normExt.startsWith(s) || s.startsWith(normExt));
    if (!found) {
      violations.push(`External link not in verified sources list: "${ext}"`);
    }
  }

  // Internal links: at least 2 internal links, and every one must be in allowed list
  if (internalLinks.length < 2) {
    violations.push(`Contains ${internalLinks.length} internal links, but at least 2 internal links are required.`);
  }
  const normAllowed = params.allowedInternalHrefs.map((h) => h.toLowerCase().trim());
  for (const intLink of internalLinks) {
    const clean = intLink.split('#')[0].split('?')[0].toLowerCase();
    if (!normAllowed.includes(clean)) {
      violations.push(`Internal link "${intLink}" is not in the approved internal links list.`);
    }
  }

  // 9. Terms check: my_term appears at least once. Max 2 different terms from my-terms.md.
  if (params.myTerm) {
    const myTermRegex = new RegExp(`\\b${escapeRegExp(params.myTerm)}\\b`, 'i');
    if (!myTermRegex.test(text)) {
      violations.push(`Target brand term "${params.myTerm}" was not found in the article body.`);
    }
  }

  const termsFound = new Set<string>();
  for (const t of MY_TERMS_LIST) {
    const tRegex = new RegExp(`\\b${escapeRegExp(t.name)}\\b`, 'i');
    if (tRegex.test(text)) {
      termsFound.add(t.name);
    }
  }
  if (termsFound.size > 2) {
    violations.push(`Too many brand terms used (${termsFound.size}: ${Array.from(termsFound).join(', ')}). Maximum allowed is 2.`);
  }

  // 10. Rhythm: sentence-length standard deviation at least 6 words.
  // No more than 2 paragraphs in a row starting with the same word.
  const sentences = textWithoutCode
    .split(/[.?!]\s+/)
    .map((s) => s.trim().split(/\s+/).filter(Boolean).length)
    .filter((l) => l > 1);

  if (sentences.length > 5) {
    const mean = sentences.reduce((a, b) => a + b, 0) / sentences.length;
    const variance = sentences.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / sentences.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 6.0) {
      violations.push(`Sentence length standard deviation is ${stdDev.toFixed(2)} (minimum is 6.0 words for natural rhythm).`);
    }
  }

  const paragraphs = textWithoutCode
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('#') && !p.startsWith('-') && !p.startsWith('*'));

  let prevStartWord = '';
  let repeatCount = 0;
  for (const p of paragraphs) {
    const firstWord = (p.match(/^[a-zA-Z0-9]+/)?.[0] || '').toLowerCase();
    if (firstWord && firstWord === prevStartWord) {
      repeatCount++;
      if (repeatCount >= 2) {
        violations.push(`More than 2 consecutive paragraphs start with the same word: "${firstWord}"`);
        break;
      }
    } else {
      prevStartWord = firstWord;
      repeatCount = 0;
    }
  }

  // 11. Quick answer: 40 to 70 words, shares main keyword idea with title
  const qaWords = params.quickAnswer.trim().split(/\s+/).filter(Boolean);
  if (qaWords.length < 40 || qaWords.length > 70) {
    violations.push(`Quick answer is ${qaWords.length} words, expected between 40 and 70 words.`);
  }

  const kwTokens = params.primaryKeyword.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const qaLower = params.quickAnswer.toLowerCase();
  const kwShared = kwTokens.some((tok) => qaLower.includes(tok));
  if (kwTokens.length > 0 && !kwShared) {
    violations.push(`Quick answer does not share the main keyword idea with the title ("${params.primaryKeyword}").`);
  }

  // 12. Duplicates check: blog_similar_titles(title) < 0.6 and no published post in last 60 days with same primary keyword
  try {
    const sim = await blogSimilarTitles(params.title);
    const highSim = sim.find((s) => s.score >= 0.6);
    if (highSim) {
      violations.push(`Title is too similar (score ${highSim.score.toFixed(2)}) to existing ${highSim.source}: "${highSim.title}"`);
    }

    const p = getPool();
    const dupKw = await p.query(
      `SELECT title, slug FROM public.blog_posts
       WHERE status = 'published'
         AND published_at >= now() - interval '60 days'
         AND lower(primary_keyword) = lower($1)
       LIMIT 1`,
      [params.primaryKeyword]
    );
    if (dupKw.rows[0]) {
      violations.push(`A post was already published with keyword "${params.primaryKeyword}" in the last 60 days: "${dupKw.rows[0].title}"`);
    }
  } catch (err: any) {
    // If DB check fails, log warning
    console.warn('[lint] DB similarity check warning:', err.message);
  }

  return {
    pass: violations.length === 0,
    violations,
    wordCount,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normaliseUrl(u: string): string {
  try {
    const parsed = new URL(u);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}`;
  } catch {
    return u.toLowerCase().replace(/\/+$/, '');
  }
}
