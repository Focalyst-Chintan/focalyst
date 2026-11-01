// Prompts from BLOG_AUTOMATION.md sections 7 to 9, with response schemas.
import type { Feature } from "./db.ts";
import type { VerifiedFact } from "./verify.ts";

export type Kind = "article" | "comparison" | "news" | "guide";

export interface Topic {
  id: string;
  title: string;
  primary_keyword: string;
  secondary_keywords: string[];
  pillar: string;
  intent: string;
  icp: string | null;
  pain_point: string | null;
  my_term: string | null;
  competitor: string | null;
  source: string;
  source_urls: string[];
  notes: string | null;
}

export const ICPS =
  "A. exam students in India (NEET, JEE, UPSC, CA, boards, 16 to 25); B. college and medical students worldwide; " +
  "C. young professionals and remote knowledge workers (22 to 35); D. creators, freelancers and solo founders; " +
  "E. ambitious self-improvers who read productivity content";

export const PILLAR_LIST = "focus, study, habits, attention, ai, planning, compare";

export const LENGTHS: Record<Kind, [number, number]> = {
  article: [1100, 1800],
  comparison: [1300, 2000],
  news: [800, 1300],
  guide: [900, 1500],
};

export function kindFor(topic: Topic, jobKind: string): Kind {
  if (jobKind === "model_launch" || topic.intent === "news") return "news";
  if (topic.intent === "comparison" || topic.competitor) return "comparison";
  if (/^how to (connect|set up|add|use)\b/i.test(topic.title)) return "guide";
  return "article";
}

export const TAGS = ["Focus", "Study", "Habits", "Screen time", "AI", "Planning", "Comparisons", "Exams", "Students"];

export const SOURCE_RULES = `SOURCES, in order of preference:
1. government and public health bodies (.gov, nih.gov, cdc.gov, who.int, nhs.uk)
2. universities (.edu, .ac.*)
3. journals and research databases (pubmed, nature.com, sciencedirect, thelancet, jamanetwork, apa.org)
4. hospitals and health systems (mayoclinic.org, clevelandclinic.org, hopkinsmedicine.org and similar)
5. established research and news organisations (pewresearch.org, reuters.com, bbc.com, apnews.com)
6. official company pages, only for facts about that company's product
Never use statistics roundup or SEO content sites (for example sqmagazine.co.uk or any "statistics" listicle
aggregator), marketing blogs of companies selling a related product, or press-release wires. A press release is
allowed only when it is the only source for a named survey; then the claim reads "a survey by {organisation}".
For health, sleep or mental health topics, at least 2 facts must come from groups 1 to 4.`;

export const HEALTH_TOPIC =
  /\b(sleep|insomnia|melatonin|health|mental|anxiety|stress|burnout|depress|adhd|caffeine|exercise|nap|diet|blue light|circadian|wellbeing|well-being|brain)/i;

export function isHealthTopic(t: Topic) {
  return HEALTH_TOPIC.test(`${t.title} ${t.primary_keyword} ${t.pain_point ?? ""}`);
}

// 7.1 Research (grounded)
export function researchPrompt(t: Topic, date: string, primary = false) {
  return `Research this blog topic for ${t.icp ?? "students and ambitious people"}. Today is ${date}.
Topic: ${t.title}. Primary keyword: ${t.primary_keyword}. Reader problem: ${t.pain_point ?? "not given"}.
${t.competitor ? `Find ${t.competitor}'s current features, platforms and pricing from its OFFICIAL website,
help centre or App Store / Play Store listing only.\n` : ""}Find:
1. the 5 to 8 questions people actually ask about this (from search results, forums, news)
2. 5 to 10 specific, checkable facts (numbers, findings, official statements, dates), each with the
   exact page it came from
3. what the top-ranking pages say and what they miss (one line each, max 5)
4. a clear angle we can take that is more useful or more honest than those pages
Return one JSON object in a \`\`\`json block:
{ "questions": [..], "facts": [{ "id": "f1", "claim": "...", "source_title": "...", "source_url": "...",
  "publisher": "..." }], "gaps": [..], "angle": "...", "secondary_keywords": [..] }
Only include facts you found in the search results. Do not guess.
${SOURCE_RULES}${
    primary
      ? "\nFind primary sources: official sites, government and university pages, peer-reviewed journals, reputable news. Give the exact article URL, not a homepage."
      : ""
  }`;
}

// 7.1 step 5: no topic yet
export function findTopicPrompt(pillar: string, date: string) {
  return `Today is ${date}. For these readers: ${ICPS}, find ONE timely blog topic for the "${pillar}" pillar of a
productivity blog that people are searching for right now. No topics about specific people's private lives,
tragedies or politics. Return one JSON object in a \`\`\`json block:
{ "title": "...", "primary_keyword": "...", "intent": "informational|commercial|comparison|news",
  "icp": "...", "pain_point": "...", "my_term": "one of the terms or null", "why_now": "...", "source_urls": [..] }`;
}

export function productFacts(features: Feature[]) {
  return features
    .map(
      (f) =>
        `- [${f.key}] ${f.name} (${f.platforms.join(", ")}; plan: ${f.plan})${f.guide_slug ? ` guide: /guides/${f.guide_slug}` : ""}: ${f.facts}`,
    )
    .join("\n");
}

export function factList(facts: VerifiedFact[]) {
  return facts.map((f) => `- ${f.id}: ${f.claim} (source: ${f.publisher}, ${f.source_url})`).join("\n");
}

const sectionSchema = {
  type: "object",
  properties: {
    h2: { type: "string" },
    lead: { type: "string" },
    points: { type: "array", items: { type: "string" } },
    fact_ids: { type: "array", items: { type: "string" } },
    feature_keys: { type: "array", items: { type: "string" } },
  },
  required: ["h2", "lead", "points", "fact_ids", "feature_keys"],
};

export const OUTLINE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    description: { type: "string" },
    quick_answer: { type: "string" },
    sections: { type: "array", items: sectionSchema },
    cta_after_section: { type: "integer" },
    faq: {
      type: "array",
      items: { type: "object", properties: { q: { type: "string" }, a: { type: "string" } }, required: ["q", "a"] },
    },
    comparison: {
      type: "object",
      nullable: true,
      properties: {
        columns: { type: "array", items: { type: "string" } },
        rows: { type: "array", items: { type: "array", items: { type: "string" } } },
      },
    },
    internal_links: {
      type: "array",
      items: {
        type: "object",
        properties: { anchor: { type: "string" }, href: { type: "string" } },
        required: ["anchor", "href"],
      },
    },
    tags: { type: "array", items: { type: "string" } },
    my_term: { type: "string", nullable: true },
    my_term_plan: { type: "string" },
  },
  required: [
    "title", "slug", "description", "quick_answer", "sections", "cta_after_section", "faq", "internal_links", "tags",
    "my_term_plan",
  ],
};

export interface Outline {
  title: string;
  slug: string;
  description: string;
  quick_answer: string;
  sections: { h2: string; lead: string; points: string[]; fact_ids: string[]; feature_keys: string[] }[];
  cta_after_section: number;
  faq: { q: string; a: string }[];
  comparison?: { columns: string[]; rows: string[][] } | null;
  internal_links: { anchor: string; href: string }[];
  tags: string[];
  my_term?: string | null;
  my_term_plan: string;
}

// 7.2 Outline
export function outlinePrompt(o: {
  kind: Kind;
  topic: Topic;
  research: { questions: string[]; facts: VerifiedFact[]; gaps: string[]; angle: string };
  features: Feature[];
  links: { title: string; href: string }[];
  differentAngle?: boolean;
  newsTemplate?: string;
}) {
  const t = o.topic;
  return `Plan a ${o.kind} post for the Focalyst Journal. Follow the STYLE GUIDE. Use only VERIFIED FACTS and
PRODUCT FACTS. Output JSON matching the schema.
- title: a clear, specific promise in sentence case, max 58 characters, includes the primary keyword
  naturally. No clickbait, no year unless the post is time-sensitive.
- slug: lowercase-hyphenated, max 60 characters, from the keyword.
- description: 140 to 158 characters, a plain summary that answers the query.
- quick_answer: 40 to 70 words that fully answer the main question on their own.
- sections: 4 to 7, each { h2 (question or clear statement a reader would search), lead (2 to 3
  sentences answering it directly), points (3 to 6 bullet notes), fact_ids, feature_keys }.
- cta_after_section: 2 or 3.
- faq: 0 to 3 { q, a }. Each q must be a real question from QUESTIONS PEOPLE ASK that the sections do NOT
  already answer. Each a (40 to 70 words) must add new information, never a summary of a section. If fewer
  than 2 questions qualify, return an empty faq [].
- practical advice: across the sections, plan at least 3 specific actions the reader can do tonight or this
  week (for example "charge your phone outside the bedroom", "set a 10:30 pm wind-down alarm"), not general
  principles. Put them in the points.
- health claims: plan wording that matches what the source supports and how strongly ("can", "is linked to",
  "in one study of ..."). Never "direct impact" or "really" unless the source says so.
- Never write fact ids (f1, f7) in any text field; fact ids belong only in fact_ids.
- comparison (comparison posts only): { columns: ["", "Focalyst", "${t.competitor ?? "{competitor}"}"], rows: 6 to 9
  [job to be done, short factual cell, short factual cell] }, every competitor cell backed by a fact_id.
- internal_links: 3 to 5 { anchor, href } chosen ONLY from INTERNAL LINKS.
- tags: 2 to 4 from: ${TAGS.join(", ")}.
- my_term_plan: where the term ${t.my_term ?? "(choose one from the terms list, set my_term)"} is defined and where it's used again.
${o.kind === "comparison" ? `- Include a section "Choose ${t.competitor} if…" and a section "Choose Focalyst if…". Be fair; no disparaging words; no competitor prices unless a verified fact gives them with a date.\n- Focalyst pricing: say only "Focalyst has a free plan; see focalyst.online/app for Pro pricing".\n` : ""}${o.newsTemplate ? `${o.newsTemplate}\n` : ""}${o.differentAngle ? "- The first title was too close to an existing post: choose a different angle and title.\n" : ""}
TOPIC: ${t.title}
PRIMARY KEYWORD: ${t.primary_keyword}
READER: ${t.icp ?? "general"}; PROBLEM: ${t.pain_point ?? "not given"}; PILLAR: ${t.pillar}
ANGLE FROM RESEARCH: ${o.research.angle}
QUESTIONS PEOPLE ASK:
${o.research.questions.map((q) => `- ${q}`).join("\n")}
GAPS IN TOP PAGES:
${o.research.gaps.map((g) => `- ${g}`).join("\n")}

VERIFIED FACTS:
${factList(o.research.facts)}

PRODUCT FACTS:
${productFacts(o.features)}

INTERNAL LINKS:
${o.links.map((l) => `- ${l.title}: ${l.href}`).join("\n")}`;
}

export const DRAFT_SCHEMA = {
  type: "object",
  properties: { content_md: { type: "string" }, word_count: { type: "integer" } },
  required: ["content_md", "word_count"],
};

// 7.3 Draft
export function draftPrompt(o: {
  outline: Outline;
  facts: VerifiedFact[];
  features: Feature[];
  minWords: number;
  maxWords: number;
}) {
  return `Write the article body in Markdown following the OUTLINE exactly and the STYLE GUIDE strictly.
- No H1. Use "## " for each section h2 from the outline, in order. "### " only when a section needs
  sub-steps.
- Start each section with its lead (you may refine the wording), then develop it with specifics,
  an example and, when useful, a short list or table. Not every section needs a list.
- Put the line [[cta]] alone on its own line after section ${o.outline.cta_after_section}.
- Cite facts inline as [publisher](url) right after the claim. The site turns each citation into a small
  superscript number, so the link text disappears: write every sentence so it reads naturally WITHOUT the
  publisher name. Good: "Screens before bed can delay sleep [Sleep Foundation](url)." Bad: "According to
  [Sleep Foundation](url), screens delay sleep." Use each listed source at least once if relevant. No other
  external links.
- Never write fact ids such as f1, f7, (f2) or [f3] anywhere in the text.
- Health, sleep and mental health claims: say only what the source supports and how strongly ("can",
  "is linked to", "in one study of 2,000 students ..."). Never "direct impact", "proven" or "really" unless
  the source says so.
- Include at least 3 specific actions the reader can do tonight or this week (for example "charge your phone
  outside the bedroom", "set a 10:30 pm wind-down alarm"), not general principles.
- Every sentence must be specific to this topic: a concrete action, a number from VERIFIED FACTS, an example
  or a time. Cut sentences that could appear in any article on the topic.
- Add the internal links from the outline naturally in the text.
- Mention Focalyst only where it solves the reader's problem, using PRODUCT FACTS, 1 to 3 times,
  each with the matching /guides link when one exists. Say clearly when something is Pro-only or
  phone-only.
- Do not write the FAQ, the sources list, a conclusion section or a sign-off.
- ${o.minWords} to ${o.maxWords} words.
Return JSON { "content_md": "...", "word_count": n }.

OUTLINE:
${JSON.stringify(o.outline, null, 2)}

VERIFIED FACTS:
${factList(o.facts)}

PRODUCT FACTS:
${productFacts(o.features)}`;
}

export const CRITIC_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "fix"] },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "unsupported_claim", "wrong_focalyst_claim", "unfair_competitor_claim", "generic", "no_position",
              "repetition", "slop", "overclaim", "missing_actions", "fact_id",
            ],
          },
          quote: { type: "string" },
          fix: { type: "string" },
        },
        required: ["type", "quote", "fix"],
      },
    },
    faq_remove: { type: "array", items: { type: "integer" } },
  },
  required: ["verdict", "issues"],
};

export interface CriticIssue {
  type: string;
  quote: string;
  fix: string;
}

// 7.4 B Critic
export function criticPrompt(o: { md: string; outline: Outline; facts: VerifiedFact[]; features: Feature[] }) {
  return `You are the critic for a Focalyst Journal post. Compare the DRAFT with the VERIFIED FACTS, PRODUCT FACTS
and STYLE GUIDE. Report only real problems, quoting the exact sentence. Check for:
- claims not supported by the facts (unsupported_claim)
- wrong Focalyst claims: features, platforms or free vs Pro limits that differ from PRODUCT FACTS (wrong_focalyst_claim)
- unfair competitor claims, or competitor claims not backed by a verified official page (unfair_competitor_claim)
- generic sentences that could appear in any article on the topic, for example "This small change can greatly
  improve your sleep hygiene" or "Replacing a habit requires finding appealing alternatives" (generic). Be strict.
  The fix must give a concrete replacement: a specific action, a number from VERIFIED FACTS, an example or a time.
- health or research claims stated more strongly than the source supports ("direct impact", "proven", "really")
  (overclaim); the fix uses "can", "is linked to" or "in one study of ..."
- fewer than 3 specific actions the reader can do tonight or this week (missing_actions); quote the weakest
  advice sentence and give a concrete action as the fix
- fact ids such as f1, (f7) or [f3] in the text (fact_id)
- missing position or recommendation (no_position)
- repeated points (repetition)
- slop patterns: formulaic contrasts, empty reassurance, brochure tone (slop)
FAQ: return faq_remove, the 0-based indexes of FAQ items whose question the DRAFT already answers or whose
answer only repeats the body. Return [] when every item adds new information.
Return verdict "pass" when there is nothing that a careful editor would change, otherwise "fix".

TITLE: ${o.outline.title}
QUICK ANSWER: ${o.outline.quick_answer}
FAQ:
${(o.outline.faq ?? []).map((f, i) => `${i}. Q: ${f.q}\n   A: ${f.a}`).join("\n") || "(none)"}

DRAFT:
${o.md}

VERIFIED FACTS:
${factList(o.facts)}

PRODUCT FACTS:
${productFacts(o.features)}`;
}

// 7.4 C Rewrite
export function rewritePrompt(o: {
  md: string;
  violations: string[];
  issues: CriticIssue[];
  facts: VerifiedFact[];
  features: Feature[];
  minWords: number;
  maxWords: number;
  remove?: boolean;
}) {
  const list = [
    ...o.violations.map((v) => `- ${v}`),
    ...o.issues.map((i) => `- [${i.type}] "${i.quote}" → ${i.fix}`),
  ].join("\n");
  return `${
    o.remove
      ? `Final pass on this Focalyst Journal post. DELETE every sentence that contains: a number not in VERIFIED FACTS or
PRODUCT FACTS, a link not in the allowed lists, a claim about Focalyst that differs from PRODUCT FACTS, a banned
word or phrase, an em or en dash, or an exclamation mark. Rewrite the surrounding sentence only if the paragraph
no longer reads naturally. Also delete [generic] sentences beyond the first 2 listed. Keep headings, [[cta]],
citations and internal links that are allowed.`
      : `Fix only these problems in the Focalyst Journal post below; keep everything else the same (headings, order,
[[cta]] line, citations, internal links, voice). Replace each generic sentence with a concrete one: a
specific action, a number from VERIFIED FACTS, an example or a time.`
  }
Never write fact ids (f1, (f7), [f3]). Citations stay as [publisher](url) and sentences read naturally without
the publisher name.
Stay between ${o.minWords} and ${o.maxWords} words.
PROBLEMS:
${list}

Return JSON { "content_md": "...", "word_count": n }.

POST:
${o.md}

VERIFIED FACTS (the only allowed external links are these URLs):
${factList(o.facts)}

PRODUCT FACTS:
${productFacts(o.features)}`;
}

// Section 9 news post template
export function newsTemplate(vendor: string, model: string, app: string) {
  return `- This is a model launch news post. Title pattern: "${model} is out: using it with your Focalyst plan" (max 58 characters, shorten naturally).
- Use exactly these H2s, in order:
  1. "What ${vendor} released": facts only from the official announcement, cited
  2. "What a stronger model can do with your own data": framed as "can", no benchmarks unless cited
  3. "How to connect Focalyst to ${app}": steps from the mcp product fact, link /guides/connect-ai-apps
  4. "Prompts to try with your Focalyst data": 5 prompts tied to tasks, habits, focus time, countdowns and voice-note summaries
  5. "Limits to know"
- Focalyst's connection works through the AI app (ChatGPT, Claude or Gemini). It is not built into the model.
- Never say Focalyst "integrates", "trained on" or "tested" the model.
- Say plainly that AI connections need Focalyst Pro, that which models you can use depends on your plan with that
  AI app, and that Gemini custom connections are only on some accounts.`;
}

// Section 8 trends
export function trendsPrompt(date: string, feedTitles: string[]) {
  return `Today is ${date}. For these readers: ${ICPS}, find 10 questions or topics people are actively searching or
discussing this week related to ${PILLAR_LIST}. Prefer exam dates and results, new study rules,
app updates (screen time, social media features), viral productivity methods, AI tools for
students. For each: { title, primary_keyword, pillar, intent, icp, pain_point, my_term or null,
why_now, source_urls (2+) }. JSON in a \`\`\`json block. No topics about specific people's private
lives, tragedies or politics.
pillar is one of: ${PILLAR_LIST}. intent is one of: informational, commercial, comparison, news.
my_term is one of: Time-Maxing, Attention Budget, Attention Tax, AI Leverage, AI Amplification, Friction Design,
Discipline Debt, Skill Stacking, Polymath Stack, Ambition Gap, Comfort Tax, Energy-Maxxing, or null.
Return { "topics": [ ... ] }.

RECENT HEADLINES FROM OUR FEEDS:
${feedTitles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`;
}

export const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    is_major_model_release: { type: "boolean" },
    vendor: { type: "string", nullable: true, enum: ["openai", "anthropic", "google"] },
    model_name: { type: "string", nullable: true },
    official_url: { type: "string", nullable: true },
    confidence: { type: "number" },
  },
  required: ["is_major_model_release", "confidence"],
};

// Section 9 classifier
export function classifyPrompt(item: { title: string; link: string; summary: string }) {
  return `Is this an announcement of a NEW major AI model (not a feature, price change, paper or minor
update) from OpenAI, Anthropic or Google, available to the public now or within days?
Return { is_major_model_release, vendor: openai|anthropic|google|null, model_name, official_url
(the vendor's own announcement page if you can find it), confidence 0..1 }.
Return one JSON object in a \`\`\`json block.

TITLE: ${item.title}
LINK: ${item.link}
SUMMARY: ${item.summary.slice(0, 800)}`;
}
