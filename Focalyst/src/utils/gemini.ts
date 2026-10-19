/**
 * Focalyst Structured Note Generator
 * Powered by OpenRouter (meta-llama/llama-3.1-8b-instruct) with Gemini 3.8 Flash backup
 */
import { executeChatCompletion } from '../services/openRouterService';

/**
 * Sends the raw speech transcript to the AI pipeline.
 * Formats it to a clean title, Markdown bullet points, and checkboxed Todo list.
 */
export async function generateStructuredNote(rawTranscript: string): Promise<string> {
  if (!rawTranscript || !rawTranscript.trim()) {
    throw new Error('Transcript is empty');
  }

  const prompt = `You are the structural formatter engine inside the Focalyst database framework ecosystem. Take the following raw speech-to-text transcription. Convert it into a clean, concise, production-ready note. Generate a short 3-5 word Title, followed by an ordered clear Markdown bullet-point note Summary, followed by a crisp checkbox Markdown actionable Todo list. Do not append conversational context. Keep outputs strictly valid text markdown.\n\nTranscript: ${rawTranscript}`;

  const { data } = await executeChatCompletion({
    mode: 'light',
    messages: [
      { role: 'system', content: 'You are a concise, structured markdown note formatter.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  });

  return data.choices?.[0]?.message?.content || rawTranscript;
}

