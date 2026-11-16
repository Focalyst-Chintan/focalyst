import { BlogFeature, BlogTopic } from './db';
import { STYLE_GUIDE_BLOCK, ANTI_AI_SLOP_TEXT, MY_TERMS_LIST, getFullStyleContext } from './style';

// ---------------------------------------------------------------------------
// 7.1 Research (Grounded)
// ---------------------------------------------------------------------------

export function getResearchPrompt(params: {
  topic: BlogTopic;
  dateStr: string;
}): string {
  const { topic, dateStr } = params;
  const isComparison = topic.pillar === 'compare' || Boolean(topic.competitor);

  const competitorClause = isComparison && topic.competitor
    ? `Find ${topic.competitor}'s current features, platforms and pricing from its OFFICIAL website, help centre or App Store / Play Store listing only.`
    : '';

  return `Research this blog topic for ${topic.icp || 'Students and ambitious people'}. Today is ${dateStr}.
Topic: ${topic.title}. Primary keyword: ${topic.primary_keyword}. Reader problem: ${topic.pain_point || 'Improving focus and study habits'}.
${competitorClause}

Find:
1. the 5 to 8 questions people actually ask about this (from search results, forums, news)
2. 5 to 10 specific, checkable facts (numbers, findings, official statements, dates), each with the exact page it came from
3. what the top-ranking pages say and what they miss (one line each, max 5)
4. a clear angle we can take that is more useful or more honest than those pages

Return one JSON object in a \`\`\`json block:
{
  "questions": ["..."],
  "facts": [
    {
      "id": "f1",
      "claim": "...",
      "source_title": "...",
      "source_url": "...",
      "publisher": "..."
    }
  ],
  "gaps": ["..."],
  "angle": "...",
  "secondary_keywords": ["..."]
}
Only include facts you found in the search results. Do not guess.`;
}

// ---------------------------------------------------------------------------
// 7.2 Outline (Structured)
// ---------------------------------------------------------------------------

export const OUTLINE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    slug: { type: 'STRING' },
    description: { type: 'STRING' },
    quick_answer: { type: 'STRING' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          h2: { type: 'STRING' },
          lead: { type: 'STRING' },
          points: { type: 'ARRAY', items: { type: 'STRING' } },
          fact_ids: { type: 'ARRAY', items: { type: 'STRING' } },
          feature_keys: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['h2', 'lead', 'points'],
      },
    },
    cta_after_section: { type: 'INTEGER' },
    faq: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          q: { type: 'STRING' },
          a: { type: 'STRING' },
        },
        required: ['q', 'a'],
      },
    },
    comparison: {
      type: 'OBJECT',
      properties: {
        columns: { type: 'ARRAY', items: { type: 'STRING' } },
        rows: {
          type: 'ARRAY',
          items: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
      },
    },
    internal_links: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          anchor: { type: 'STRING' },
          href: { type: 'STRING' },
        },
        required: ['anchor', 'href'],
      },
    },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    my_term_plan: { type: 'STRING' },
  },
  required: ['title', 'slug', 'description', 'quick_answer', 'sections', 'cta_after_section', 'faq', 'internal_links', 'tags', 'my_term_plan'],
};

export function getOutlinePrompt(params: {
  topic: BlogTopic;
  research: any;
  productFeatures: BlogFeature[];
  internalLinks: { title: string; href: string }[];
  kind: string;
}): string {
  const { topic, research, productFeatures, internalLinks, kind } = params;

  const productFactsText = productFeatures
    .map((f) => `- [${f.key}] ${f.name}: ${f.facts} (Plan: ${f.plan}, Platforms: ${f.platforms.join(', ')}${f.guide_slug ? ', Guide: /guides/' + f.guide_slug : ''})`)
    .join('\n');

  const linksText = internalLinks.map((l) => `- ${l.title}: ${l.href}`).join('\n');

  const myTermObj = MY_TERMS_LIST.find((t) => t.name.toLowerCase() === (topic.my_term || '').toLowerCase()) || MY_TERMS_LIST[0];
  const myTerm = topic.my_term || myTermObj.name;
  const myTermDef = myTermObj.definition;

  return `Plan a ${kind} post for the Focalyst Journal. Follow the STYLE GUIDE. Use only VERIFIED FACTS and PRODUCT FACTS. Output JSON matching the schema.

TOPIC:
Title: ${topic.title}
Keyword: ${topic.primary_keyword}
Pillar: ${topic.pillar}
ICP: ${topic.icp || 'Students & ambitious people'}
Pain point: ${topic.pain_point}
Competitor: ${topic.competitor || 'None'}
My Term: ${myTerm} (Definition: ${myTermDef})

STYLE GUIDE:
${STYLE_GUIDE_BLOCK}

VERIFIED FACTS:
${JSON.stringify(research?.facts || [], null, 2)}

RESEARCH QUESTIONS:
${JSON.stringify(research?.questions || [], null, 2)}

PRODUCT FACTS:
${productFactsText}

INTERNAL LINKS (Choose ONLY from these):
${linksText}

REQUIREMENTS:
- title: a clear, specific promise in sentence case, max 58 characters, includes the primary keyword naturally. No clickbait, no year unless the post is time-sensitive.
- slug: lowercase-hyphenated, max 60 characters, from the keyword.
- description: 140 to 158 characters, a plain summary that answers the query.
- quick_answer: 40 to 70 words that fully answer the main question on their own.
- sections: 4 to 7, each { h2 (question or clear statement a reader would search), lead (2 to 3 sentences answering it directly), points (3 to 6 bullet notes), fact_ids, feature_keys }.
- cta_after_section: 2 or 3.
- faq: 3 to 5 { q (real question from research), a (40 to 80 words, self-contained) }, not repeating H2s.
- comparison (${kind === 'comparison' ? 'REQUIRED' : 'omitted for non-comparisons'}): { columns: ["", "Focalyst", "${topic.competitor || 'Competitor'}"], rows: 6 to 9 [job to be done, short factual cell, short factual cell] }, every competitor cell backed by a fact_id.
- internal_links: 3 to 5 { anchor, href } chosen ONLY from INTERNAL LINKS.
- tags: 2 to 4 from: Focus, Study, Habits, Screen time, AI, Planning, Comparisons, Exams, Students.
- my_term_plan: where the term ${myTerm} is defined and where it's used again.`;
}

// ---------------------------------------------------------------------------
// 7.3 Draft (Structured)
// ---------------------------------------------------------------------------

export const DRAFT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    content_md: { type: 'STRING' },
    word_count: { type: 'INTEGER' },
  },
  required: ['content_md', 'word_count'],
};

export function getDraftPrompt(params: {
  outline: any;
  verifiedFacts: any[];
  productFeatures: BlogFeature[];
  minWords: number;
  maxWords: number;
  topic: BlogTopic;
}): string {
  const { outline, verifiedFacts, productFeatures, minWords, maxWords, topic } = params;

  const productFactsText = productFeatures
    .map((f) => `- [${f.key}] ${f.name}: ${f.facts} (Plan: ${f.plan}, Platforms: ${f.platforms.join(', ')}${f.guide_slug ? ', Guide: /guides/' + f.guide_slug : ''})`)
    .join('\n');

  const myTerm = topic.my_term || 'Time-Maxing';

  return `Write the article body in Markdown following the OUTLINE exactly and the STYLE GUIDE strictly.

STYLE & VOICE CONTEXT:
${getFullStyleContext()}

OUTLINE:
${JSON.stringify(outline, null, 2)}

VERIFIED FACTS:
${JSON.stringify(verifiedFacts, null, 2)}

PRODUCT FACTS:
${productFactsText}

BRAND TERM TO USE:
${myTerm}

HARD RULES:
- No H1. Use "## " for each section h2 from the outline, in order. "### " only when a section needs sub-steps.
- Start each section with its lead (you may refine the wording), then develop it with specifics, an example and, when useful, a short list or table. Not every section needs a list.
- Put the line [[cta]] alone on its own line after section ${outline.cta_after_section || 2}.
- Cite facts inline as [publisher](url) right after the claim. Use each listed source at least once if relevant. No other external links.
- Add the internal links from the outline naturally in the text.
- Mention Focalyst only where it solves the reader's problem, using PRODUCT FACTS, 1 to 3 times, each with the matching /guides link when one exists. Say clearly when something is Pro-only or phone-only.
- The term "${myTerm}" must appear naturally at least once.
- Do not write the FAQ, the sources list, a conclusion section or a sign-off.
- Target ${minWords} to ${maxWords} words.
- No em dashes or en dashes. No exclamation marks outside code. No banned words or phrases.

Return JSON { "content_md": "...", "word_count": n }.`;
}

// ---------------------------------------------------------------------------
// 7.4 Critic (Structured, Temp 0.2)
// ---------------------------------------------------------------------------

export const CRITIC_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['pass', 'fix'] },
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          quote: { type: 'STRING' },
          fix: { type: 'STRING' },
        },
        required: ['type', 'quote', 'fix'],
      },
    },
  },
  required: ['verdict', 'issues'],
};

export function getCriticPrompt(params: {
  draftMd: string;
  outline: any;
  verifiedFacts: any[];
  productFeatures: BlogFeature[];
}): string {
  const { draftMd, outline, verifiedFacts, productFeatures } = params;

  return `You are a strict, senior editor at Focalyst Journal. Review this draft against our hard standards.

DRAFT:
${draftMd}

OUTLINE:
${JSON.stringify(outline, null, 2)}

VERIFIED FACTS:
${JSON.stringify(verifiedFacts, null, 2)}

PRODUCT FACTS:
${JSON.stringify(productFeatures.map((f) => ({ key: f.key, name: f.name, facts: f.facts, plan: f.plan, platforms: f.platforms })), null, 2)}

STYLE GUIDE:
${STYLE_GUIDE_BLOCK}

ANTI-SLOP PRINCIPLES:
${ANTI_AI_SLOP_TEXT}

Check for:
1. Claims not supported by the facts (unsupported numbers, dates, or claims).
2. Wrong Focalyst claims (invented features, fake user counts, misstating free vs Pro).
3. Unfair competitor claims (unverified criticism or unverified specs).
4. Generic or "could fit any topic" sentences.
5. Missing position or recommendation (must take a clear, reasoned stance).
6. Repeated points across sections.
7. Slop patterns: formulaic contrasts ("not just X, but Y"), empty reassurance, brochure tone, exclamation marks, or em dashes.

Return JSON:
{
  "verdict": "pass" | "fix",
  "issues": [
    { "type": "unsupported_claim | wrong_focalyst_claim | slop | generic_sentence | punctuation", "quote": "...", "fix": "..." }
  ]
}
If there are no substantive issues, return verdict: "pass" and issues: [].`;
}

// ---------------------------------------------------------------------------
// 7.4 Rewrite (Structured)
// ---------------------------------------------------------------------------

export function getRewritePrompt(params: {
  currentDraftMd: string;
  lintViolations: string[];
  criticIssues: any[];
  outline: any;
  minWords: number;
  maxWords: number;
}): string {
  const { currentDraftMd, lintViolations, criticIssues, outline, minWords, maxWords } = params;

  return `Rewrite this article body fixing ONLY the exact list of violations and issues below. Keep everything else intact.

CURRENT DRAFT:
${currentDraftMd}

HARD LINT VIOLATIONS TO FIX:
${lintViolations.map((v) => `- ${v}`).join('\n')}

CRITIC ISSUES TO FIX:
${criticIssues.map((i) => `- [${i.type}] Quote: "${i.quote}" -> Fix: ${i.fix}`).join('\n')}

STYLE RULES TO REINFORCE:
- Zero em dashes, zero en dashes, zero " - " as dashes.
- Zero exclamation marks.
- No banned words (delve, tapestry, realm, landscape, intricate, pivotal, crucial, etc.)
- Keep [[cta]] on its own line after section ${outline.cta_after_section || 2}.
- Length must remain between ${minWords} and ${maxWords} words.

Return JSON { "content_md": "...", "word_count": n }.`;
}

// ---------------------------------------------------------------------------
// 8 Trend Finder Prompt (Grounded)
// ---------------------------------------------------------------------------

export function getTrendPrompt(params: {
  icpList: string[];
  pillarList: string[];
}): string {
  return `For these readers: ${params.icpList.join(', ')}, find 10 questions or topics people are actively searching or discussing this week related to ${params.pillarList.join(', ')}. Prefer exam dates and results, new study rules, app updates (screen time, social media features), viral productivity methods, AI tools for students.

For each topic, provide:
- title: clear promise in sentence case
- primary_keyword: exact search query
- pillar: one of focus, study, compare, habits, ai, attention, planning
- intent: informational | comparative | news
- icp: target audience
- pain_point: specific struggle
- my_term: null or one of Time-Maxing, Attention Budget, Attention Tax, AI Leverage, Friction Design, Discipline Debt
- why_now: timely reason or date
- source_urls: at least 2 real, verified URLs from search results

Return one JSON array in a \`\`\`json block:
[
  {
    "title": "...",
    "primary_keyword": "...",
    "pillar": "...",
    "intent": "...",
    "icp": "...",
    "pain_point": "...",
    "my_term": "...",
    "why_now": "...",
    "source_urls": ["...", "..."]
  }
]
No topics about specific people's private lives, tragedies or politics.`;
}

// ---------------------------------------------------------------------------
// 9 Model Watch Classifier Prompt (Structured)
// ---------------------------------------------------------------------------

export const MODEL_WATCH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_major_model_release: { type: 'BOOLEAN' },
    vendor: { type: 'STRING', enum: ['openai', 'anthropic', 'google', 'null'] },
    model_name: { type: 'STRING' },
    official_url: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
  },
  required: ['is_major_model_release', 'vendor', 'model_name', 'official_url', 'confidence'],
};

export function getModelWatchPrompt(params: {
  feedTitle: string;
  feedSnippet: string;
  feedLink: string;
}): string {
  return `Analyse this RSS news item:
Title: "${params.feedTitle}"
Link: "${params.feedLink}"
Snippet: "${params.feedSnippet}"

Is this an announcement of a NEW major AI model (not a feature, price change, paper or minor update) from OpenAI, Anthropic or Google, available to the public now or within days?
Return JSON matching schema:
{
  "is_major_model_release": true | false,
  "vendor": "openai" | "anthropic" | "google" | "null",
  "model_name": "...",
  "official_url": "the vendor's own announcement page if found or feedLink",
  "confidence": 0.0 to 1.0
}`;
}
