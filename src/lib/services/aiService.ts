import 'server-only';
import { FOCALYST_AI_PERSONA } from '@/constants/focalystPersona';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;


// OpenRouter primary model ID from mobile app: meta-llama/llama-3.1-8b-instruct
export const OPENROUTER_PRIMARY_MODEL = 'meta-llama/llama-3.1-8b-instruct';

export async function generateAIResponse(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  systemPrompt: string = FOCALYST_AI_PERSONA
): Promise<string> {
  // 1. Primary: OpenRouter API
  try {
    if (!OPENROUTER_API_KEY) throw new Error('Missing OpenRouter API Key');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://focalyst.online',
        'X-Title': 'Focalyst',
      },
      body: JSON.stringify({
        model: OPENROUTER_PRIMARY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenRouter');
    return content;
  } catch (openRouterError) {
    console.warn('OpenRouter failed, falling back to Gemini 3.8 Flash:', openRouterError);

    // 2. Secondary Fallback: Gemini 3.8 Flash (and gemini-2.5-flash)
    if (!GEMINI_API_KEY) throw openRouterError;

    const fallbackModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
    for (const modelName of fallbackModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: messages
                .filter((m) => m.role !== 'system')
                .map((m) => ({
                  role: m.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: m.content }],
                })),
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (fallbackErr) {
        console.warn(`Fallback model ${modelName} failed:`, fallbackErr);
      }
    }

    throw new Error('Both OpenRouter primary and Gemini fallback failed.');
  }
}
