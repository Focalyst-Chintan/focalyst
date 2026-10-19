import { transcribeVoiceAudio, executeChatCompletion, AI_MODELS, getGeminiApiKey } from '../src/services/openRouterService';

export interface ProcessedVoiceNote {
  title: string;
  cleanedTranscript: string;
  summary: string;
}

// Common Whisper hallucinations when audio is silent
const WHISPER_SILENCE_PHRASES = new Set([
  'thank you.',
  'thank you',
  'thanks for watching.',
  'thanks for watching!',
  'subtitles by the amara.org community',
  'you',
  '.',
  '...',
  'bye.',
]);

/**
 * Transcribes an audio file using OpenRouter Whisper Large V3 Turbo with Gemini 3.8 Flash failover.
 */
export async function transcribeAudioUri(audioUri: string): Promise<string> {
  const rawText = await transcribeVoiceAudio(audioUri);
  if (!rawText || !rawText.trim()) return '';

  if (WHISPER_SILENCE_PHRASES.has(rawText.toLowerCase().trim())) {
    return '';
  }

  return rawText.trim();
}

/**
 * Cleans grammar/punctuation and summarizes ONLY what the user actually said.
 * Uses meta-llama/llama-3.1-8b-instruct on OpenRouter with Gemini 3.8 Flash fallback.
 */
export async function processTranscriptWithAI(rawTranscript: string): Promise<ProcessedVoiceNote> {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      title: 'Voice Note',
      cleanedTranscript: '',
      summary: '',
    };
  }

  const systemPrompt = `You are a precise voice note editor and summarizer inside the Focalyst app.
You will receive a raw speech-to-text transcript spoken by the user.

STRICT RULES:
1. ONLY use the information actually present in the user's transcript. NEVER invent, assume, or add any external topics, brand names, or examples that the user did not speak.
2. "cleanedTranscript": Fix obvious speech-to-text grammar, punctuation, and homophone errors while strictly preserving the user's exact meaning and words.
3. "title": Generate a concise, accurate 3-to-6 word title based strictly on what the user talked about.
4. "summary": Write a concise summary of the user's note using standard paragraphs and simple "- " bullet points starting at column 0 (never indent bullets with spaces and never use code blocks).

Respond ONLY in valid JSON format:
{
  "title": "Concise Note Title",
  "cleanedTranscript": "Corrected transcript...",
  "summary": "Summary of the spoken note..."
}`;

  try {
    const { data } = await executeChatCompletion({
      mode: 'light', // meta-llama/llama-3.1-8b-instruct for ultra-fast <0.5s processing
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User Spoken Transcript:\n"""\n${rawTranscript}\n"""` },
      ],
    });

    const content = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return {
      title: parsed.title || 'Voice Note',
      cleanedTranscript: parsed.cleanedTranscript || rawTranscript,
      summary: parsed.summary || parsed.cleanedTranscript || rawTranscript,
    };
  } catch (err) {
    console.warn('[Voice Note AI] Primary LLM failed, attempting direct Gemini 3.8 Flash fallback:', err);
    const geminiKey = getGeminiApiKey();
    if (!geminiKey) {
      return {
        title: 'Voice Note',
        cleanedTranscript: rawTranscript,
        summary: rawTranscript,
      };
    }

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${systemPrompt}\n\nUser Spoken Transcript:\n${rawTranscript}` }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: 'LOW' },
            },
          }),
        }
      );
      const geminiData = await geminiRes.json();
      const parts = geminiData?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.filter((p: any) => !p?.thought && typeof p?.text === 'string').map((p: any) => p.text).join('').trim()
        : geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      const parsed = JSON.parse(text);
      return {
        title: parsed.title || 'Voice Note',
        cleanedTranscript: parsed.cleanedTranscript || rawTranscript,
        summary: parsed.summary || rawTranscript,
      };
    } catch {
      return {
        title: 'Voice Note',
        cleanedTranscript: rawTranscript,
        summary: rawTranscript,
      };
    }
  }
}


