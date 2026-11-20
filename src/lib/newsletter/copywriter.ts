import { GoogleGenAI, Type } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewsletterCopy } from './template';

export interface NewsletterTopic {
  id: string;
  topic_number: number | null;
  pillar_number: number;
  topic_title: string;
  core_pain_point: string;
  app_feature_mapping: string;
  generated_copy: NewsletterCopy | null;
  sent_at: string | null;
  created_at: string;
}

const BANNED_BUZZWORDS = [
  'unleash',
  'game-changer',
  'game changer',
  'seamless',
  'seamlessly',
  'delve',
  "in today's fast-paced world",
  'fast-paced world',
  'supercharge',
  'elevate',
  'revolutionize',
  'unlock your potential',
  'leverage',
  'synergy',
  'paradigm',
];

const SYSTEM_PROMPT = `You are Sohan, the founder of Focalyst (a calm, focused productivity app across Web, iOS, and Android).
Write a weekly newsletter email that converts free users to Focalyst Pro by solving a real psychological friction point without sounding like a marketing email.

VOICE & PERSONA:
- Direct, honest, practical, calm, and slightly contrarian.
- Reads like a sharp, helpful note from a builder who actually uses his own tool every day.
- Zero corporate fluff, zero hype, zero exclamation-mark spam.
- STRICTLY BANNED WORDS/PHRASES (never use any of these):
  "unleash", "game-changer", "seamless", "seamlessly", "delve", "in today's fast-paced world", "supercharge", "elevate", "revolutionize", "unlock your potential", "leverage", "synergy", "paradigm".
- ZERO EM-DASHES: Never use em dashes ("—") or double hyphens ("--") anywhere in any field (subject lines, headlines, body paragraphs, callouts, or questions). If you need a pause or break in thought, use periods, commas, parentheses, or start a new sentence. No robotic punctuation.

OUTPUT FIELDS:
- subject: Punchy, curiosity-driven, counter-intuitive, or sharp 3-to-5-word pattern interrupt (e.g., "Your to-do list is lying to you", "Stop planning every hour", "The 10-minute focus reset"). Ban boring, generic, or corporate subject lines (never "Check out our new update" or "Tips to improve your productivity"). Compel opens instantly without fake clickbait. MUST be strictly under 50 characters. No emojis.
- preheader: 1 short summary sentence (under 90 chars) that complements the subject line.
- heroHeadlineHtml: Short serif H1 headline (5-8 words max) with exactly ONE key word wrapped in <i>...</i> tags (e.g. "Stop paying the 23-minute <i>focus</i> tax"). No other HTML tags.
- heroSubtitle: 1 crisp sentence value hook (under 110 chars).
- introParagraph: 2-3 sentences addressing the psychological pain point directly, naming why most people get stuck, and introducing the solution.
- featureTitle: Clear, benefit-driven feature title (under 60 chars, no "Spotlight:" prefix since the template adds that).
- featureBody: 3-4 practical sentences explaining exactly how to use this feature today inside Focalyst. Concrete, actionable steps with no vague promises.
- proTip: 1 practical workflow tip for the callout box (1-2 sentences, concrete).
- replyQuestion: 1 specific, low-friction question inviting the user to hit reply (e.g., "What's the one app you catch yourself opening without thinking?").`;

export async function getNextUnsentTopic(supabase: SupabaseClient): Promise<NewsletterTopic | null> {
  const { data, error } = await supabase
    .from('newsletter_topics')
    .select('*')
    .is('sent_at', null)
    .order('topic_number', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to query next unsent newsletter topic: ${error.message}`);
  }

  return data as NewsletterTopic | null;
}

function validateAndNormalizeCopy(copy: NewsletterCopy): NewsletterCopy {
  const normalized: NewsletterCopy = {
    subject: copy.subject.trim(),
    preheader: copy.preheader.trim(),
    heroHeadlineHtml: copy.heroHeadlineHtml.trim(),
    heroSubtitle: copy.heroSubtitle.trim(),
    introParagraph: copy.introParagraph.trim(),
    featureTitle: copy.featureTitle.trim().replace(/^Spotlight:\s*/i, ''),
    featureBody: copy.featureBody.trim(),
    proTip: copy.proTip.trim(),
    replyQuestion: copy.replyQuestion.trim(),
  };

  if (normalized.subject.length > 50) {
    normalized.subject = normalized.subject.slice(0, 49).trimEnd();
  }

  if (!/<i>.*<\/i>/i.test(normalized.heroHeadlineHtml)) {
    const words = normalized.heroHeadlineHtml.split(/\s+/);
    if (words.length > 1) {
      const last = words.pop()!;
      normalized.heroHeadlineHtml = `${words.join(' ')} <i>${last}</i>`;
    } else {
      normalized.heroHeadlineHtml = `<i>${normalized.heroHeadlineHtml}</i>`;
    }
  }

  const allText = Object.values(normalized).join(' ');
  if (allText.includes('—') || allText.includes('--')) {
    throw new Error('Generated copy contained forbidden em-dashes (— or --)');
  }

  const allTextLower = allText.toLowerCase();
  const foundBanned = BANNED_BUZZWORDS.filter((w) => allTextLower.includes(w));
  if (foundBanned.length > 0) {
    throw new Error(`Generated copy contained banned buzzwords: ${foundBanned.join(', ')}`);
  }

  return normalized;
}

export async function generateNewsletterCopy(topic: NewsletterTopic): Promise<NewsletterCopy> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1beta' },
  });

  const prompt = `Generate this week's Focalyst newsletter copy for the following topic:

Pillar: ${topic.pillar_number}
Topic Title: ${topic.topic_title}
Core Psychological Pain Point: ${topic.core_pain_point}
Focalyst Feature Mapping: ${topic.app_feature_mapping}

Remember:
- Subject MUST be strictly under 50 characters.
- heroHeadlineHtml MUST wrap exactly one keyword in <i>...</i>.
- Write in Sohan's direct, honest, practical founder voice with zero corporate buzzwords.`;

  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.7,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              preheader: { type: Type.STRING },
              heroHeadlineHtml: { type: Type.STRING },
              heroSubtitle: { type: Type.STRING },
              introParagraph: { type: Type.STRING },
              featureTitle: { type: Type.STRING },
              featureBody: { type: Type.STRING },
              proTip: { type: Type.STRING },
              replyQuestion: { type: Type.STRING },
            },
            required: [
              'subject',
              'preheader',
              'heroHeadlineHtml',
              'heroSubtitle',
              'introParagraph',
              'featureTitle',
              'featureBody',
              'proTip',
              'replyQuestion',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Gemini returned empty response text');
      }

      const parsed = JSON.parse(rawText) as NewsletterCopy;
      return validateAndNormalizeCopy(parsed);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Failed to generate newsletter copy');
}

export async function getOrGenerateTopicCopy(
  supabase: SupabaseClient,
  topic: NewsletterTopic
): Promise<NewsletterCopy> {
  if (topic.generated_copy && topic.generated_copy.subject && topic.generated_copy.featureBody) {
    return topic.generated_copy;
  }

  const copy = await generateNewsletterCopy(topic);

  await supabase
    .from('newsletter_topics')
    .update({ generated_copy: copy })
    .eq('id', topic.id);

  return copy;
}
