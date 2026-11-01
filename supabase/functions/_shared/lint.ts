// Code checks from BLOG_AUTOMATION.md 7.4 A. Each violation says which rule and quotes the text.
import { TERMS } from "./style.ts";
import { normaliseUrl } from "./verify.ts";
import type { Kind } from "./prompts.ts";

// integrity: facts, links and claims (removed before publishing); style: everything else
export type Severity = "integrity" | "style";

// Internal fact ids like "(f7)", "(f2, f5)", "[f3]" or a bare "f7" must never reach readers
const FACT_LABEL = /\s*[\(\[]f\d+(?:\s*,\s*f\d+)*[\)\]]/g;
const BARE_FACT_ID = /(?<=^|\s)f\d{1,2}(?=$|[\s.,;:)])/g;

export function stripFactIds(text: string): string {
  return (text ?? "").replace(FACT_LABEL, "").replace(BARE_FACT_ID, "").replace(/ {2,}/g, " ").replace(/ ([.,;:])/g, "$1");
}

export function hasFactIds(text: string): string | null {
  return (text ?? "").match(FACT_LABEL)?.[0]?.trim() ?? (text ?? "").match(BARE_FACT_ID)?.[0] ?? null;
}

export interface Violation {
  rule: string;
  severity: Severity;
  text: string;
}

export const BANNED_WORDS = [
  "delve", "delves", "delving", "tapestry", "realm", "landscape", "landscapes", "intricate", "pivotal", "crucial",
  "multifaceted", "transformative", "vibrant", "seamless", "seamlessly", "meticulous", "meticulously", "robust",
  "foster", "fosters", "fostering", "leverage", "leverages", "leveraging", "navigate", "navigating", "navigates",
  "underscore", "underscores", "showcase", "showcases", "unlock", "unlocks", "unlocking", "garner", "bolster",
  "utilize", "utilizes", "utilise", "testament", "game-changer", "game changer", "supercharge", "elevate",
  "elevates", "embark", "harness", "harnessing", "boasts",
];

export const BANNED_PHRASES = [
  "in today's", "fast-paced world", "ever-evolving", "it is important to note", "it's worth noting", "let's dive",
  "dive into", "at its core", "when it comes to", "in recent years", "in conclusion", "to sum up", "in summary",
  "ultimately", "moreover", "furthermore", "additionally", "the good news is", "level up", "the future is bright",
  "studies show", "experts agree", "research shows",
];

export const LIMITS: Record<Kind, { words: [number, number]; h2: [number, number] }> = {
  article: { words: [1100, 1800], h2: [4, 7] },
  comparison: { words: [1300, 2000], h2: [4, 8] },
  news: { words: [800, 1300], h2: [4, 7] },
  guide: { words: [900, 1500], h2: [4, 7] },
};

const STOP = new Set(
  "a an the and or of to for in on at with how what why when is are do does your you my i it vs best".split(" "),
);

function stripCode(md: string) {
  return md.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
}

// Prose without link URLs, for word and dash checks
export function plainText(md: string) {
  return stripCode(md)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\[\[cta\]\]\s*$/gm, "")
    .replace(/[#*_>|]/g, " ");
}

export function wordCount(md: string) {
  return plainText(md).split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function sentences(text: string) {
  return text
    .split(/\n+/)
    .flatMap((p) => p.split(/(?<=[.?!])\s+(?=[A-Z0-9"“[])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function links(md: string) {
  return [...stripCode(md).matchAll(/\[([^\]]*)\]\(([^)\s]+)\)/g)].map((m) => ({ text: m[1], href: m[2] }));
}

function norm(s: string) {
  return s.toLowerCase().replace(/[,\s]/g, "");
}

// Numbers with a unit, a % or a 4-digit year
const NUMBER_RE =
  /(\d[\d,]*(?:\.\d+)?)\s*(%|percent\b|×|x\b|times\b|hours?\b|hrs?\b|minutes?\b|mins?\b|days?\b|weeks?\b|months?\b|years?\b)|\b((?:19|20)\d{2})\b/gi;

export function unsupportedNumbers(md: string, allowedText: string) {
  const allowed = norm(allowedText);
  const out: { value: string; sentence: string }[] = [];
  for (const sentence of sentences(plainText(md))) {
    for (const m of sentence.matchAll(NUMBER_RE)) {
      const value = (m[1] ?? m[3]).replace(/,/g, "");
      if (!allowed.includes(norm(value))) out.push({ value: m[0].trim(), sentence });
    }
  }
  return out;
}

export interface LintInput {
  md: string;
  kind: Kind;
  minWords?: number;
  maxWords?: number;
  title: string;
  quickAnswer: string;
  primaryKeyword: string;
  myTerm: string | null;
  sourceUrls: string[];
  internalHrefs: string[];
  allowedNumberText: string; // verified facts + product facts
}

export function lint(i: LintInput): Violation[] {
  const v: Violation[] = [];
  const add = (rule: string, severity: Severity, text: string) => v.push({ rule, severity, text: text.slice(0, 240) });
  const prose = plainText(i.md);
  const lower = prose.toLowerCase();

  // Banned words and phrases ("AI Leverage" with that capitalisation is allowed)
  const withoutTerm = prose.replace(/AI Leverage/g, "");
  for (const w of BANNED_WORDS) {
    const re = new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
    const m = withoutTerm.match(re);
    if (m) add("banned_word", "style", m[0]);
  }
  for (const p of BANNED_PHRASES) if (lower.includes(p)) add("banned_phrase", "style", p);

  // Internal fact ids (f1, (f7), [f2, f5]) in the body or quick answer
  const label = hasFactIds(stripCode(i.md).replace(/\]\([^)]*\)/g, "]")) ?? hasFactIds(i.quickAnswer);
  if (label) add("fact_id", "style", label);

  // Dashes and exclamation marks
  for (const s of sentences(prose)) {
    if (/[—–]/.test(s) || /\w \- \w/.test(s)) add("dash", "style", s);
    if (s.includes("!")) add("exclamation", "style", s);
  }

  // Length
  const words = wordCount(i.md);
  const [min, max] = [i.minWords ?? LIMITS[i.kind].words[0], i.maxWords ?? LIMITS[i.kind].words[1]];
  if (words < min || words > max) add("length", "style", `${words} words (allowed ${min} to ${max})`);

  // Headings, and the first paragraph after each H2
  const lines = i.md.split("\n");
  const h2 = lines.filter((l) => /^## /.test(l));
  const [hMin, hMax] = LIMITS[i.kind].h2;
  if (h2.length < hMin || h2.length > hMax) add("headings", "style", `${h2.length} H2s (allowed ${hMin} to ${hMax})`);
  if (/^# /m.test(i.md)) add("headings", "style", "has an H1");
  for (const block of i.md.split(/^## .*$/m).slice(1)) {
    const first = block.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith("#"));
    if (first && wordCount(first) > 70) add("lead_length", "style", first.slice(0, 120));
  }

  // CTA
  const ctas = (i.md.match(/^\s*\[\[cta\]\]\s*$/gm) ?? []).length;
  if (ctas !== 1) add("cta", "style", `[[cta]] appears ${ctas} times`);

  // Links
  const sources = new Set(i.sourceUrls.map(normaliseUrl));
  const internal = new Set(i.internalHrefs);
  let internalCount = 0;
  for (const l of links(i.md)) {
    if (l.href.startsWith("/")) {
      internalCount++;
      if (!internal.has(l.href.replace(/[?#].*$/, ""))) add("internal_link", "integrity", l.href);
    } else if (!sources.has(normaliseUrl(l.href))) {
      add("external_link", "integrity", l.href);
    }
  }
  if (internalCount < 2) add("internal_link_count", "style", `${internalCount} internal links (need 2)`);

  // Numbers
  for (const n of unsupportedNumbers(i.md, i.allowedNumberText)) add("number", "integrity", `${n.value}: ${n.sentence}`);

  // Terms
  if (i.myTerm && !prose.includes(i.myTerm)) add("term_missing", "style", i.myTerm);
  const used = TERMS.filter((t) => prose.includes(t));
  if (used.length > 2) add("too_many_terms", "style", used.join(", "));

  // Rhythm
  const lens = sentences(prose).map((s) => s.split(/\s+/).length);
  if (lens.length > 3) {
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
    if (sd < 6) add("rhythm", "style", `sentence length standard deviation ${sd.toFixed(1)} (need 6)`);
  }
  const paras = i.md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(#|\||-|\*|\d+\.|\[\[cta)/.test(p));
  for (let k = 2; k < paras.length; k++) {
    const first = (p: string) => p.split(/\s+/)[0].toLowerCase().replace(/\W/g, "");
    if (first(paras[k]) && first(paras[k]) === first(paras[k - 1]) && first(paras[k]) === first(paras[k - 2])) {
      add("same_opening", "style", paras[k].slice(0, 80));
    }
  }

  // Quick answer
  const qa = wordCount(i.quickAnswer);
  if (qa < 40 || qa > 70) add("quick_answer_length", "style", `${qa} words (allowed 40 to 70)`);
  const kw = i.primaryKeyword.toLowerCase().split(/\W+/).filter((w) => w && !STOP.has(w));
  const both = `${i.title} ${i.quickAnswer}`.toLowerCase();
  if (kw.length && !kw.some((w) => both.includes(w.slice(0, 5)))) {
    add("quick_answer_keyword", "style", "quick answer and title don't share the keyword idea");
  }

  return v;
}

export function describe(v: Violation[]) {
  return v.map((x) => `${x.rule}: ${x.text}`);
}

// Last resort before publishing: drop sentences with unsupported numbers or claims the critic flagged,
// unlink links outside the allowed lists, and replace dashes and exclamation marks
export function scrub(md: string, i: LintInput, quotes: string[]): string {
  const sources = new Set(i.sourceUrls.map(normaliseUrl));
  const internal = new Set(i.internalHrefs);
  let out = md.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (all, text, href: string) => {
    if (href.startsWith("/")) return internal.has(href.replace(/[?#].*$/, "")) ? all : text;
    return sources.has(normaliseUrl(href)) ? all : text;
  });

  const bad = unsupportedNumbers(out, i.allowedNumberText).map((n) => n.sentence);
  const drop = [...bad, ...quotes.filter((q) => q.length > 20)];
  out = out
    .split("\n")
    .map((line) => {
      if (/^#/.test(line) || /^\s*\[\[cta\]\]/.test(line)) return line;
      let l = line;
      for (const s of sentences(l)) {
        const p = plainText(s).trim();
        if (drop.some((d) => p.includes(d.trim().slice(0, 60)) || d.includes(p.slice(0, 60)))) {
          l = l.replace(s, "").replace(/\s{2,}/g, " ");
        }
      }
      return l.trimEnd();
    })
    .join("\n");

  return out
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/(\w) - (\w)/g, "$1, $2")
    .replace(/!/g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[-*]\s*$/gm, "");
}
