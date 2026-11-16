export class GeminiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiRateLimitError';
  }
}

export interface GeminiCallParams {
  model: string;
  prompt: string;
  systemInstruction?: string;
  responseSchema?: any;
  grounded?: boolean;
  temperature?: number;
}

export interface GeminiCallResult {
  text: string;
  json?: any;
  groundingMetadata?: any;
}

export async function callGemini(params: GeminiCallParams): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: params.prompt }],
      },
    ],
  };

  if (params.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: params.systemInstruction }],
    };
  }

  const genConfig: any = {};
  if (params.temperature !== undefined) {
    genConfig.temperature = params.temperature;
  }

  if (params.grounded) {
    body.tools = [{ google_search: {} }];
  } else if (params.responseSchema) {
    genConfig.responseMimeType = 'application/json';
    genConfig.responseSchema = params.responseSchema;
  }

  if (Object.keys(genConfig).length > 0) {
    body.generationConfig = genConfig;
  }

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 110000); // 110s timeout

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.status === 429 || resp.status === 503) {
        const errText = await resp.text().catch(() => '');
        console.warn(`[Gemini] HTTP ${resp.status} on attempt ${attempt}. Response: ${errText.slice(0, 200)}`);
        if (attempt < maxAttempts) {
          console.log('[Gemini] Waiting 20s before retry...');
          await new Promise((resolve) => setTimeout(resolve, 20000));
          continue;
        } else {
          throw new GeminiRateLimitError(`Gemini HTTP ${resp.status} rate limit exceeded after retry.`);
        }
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Gemini API error (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
      }

      const data = await resp.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || '';
      const groundingMetadata = candidate?.groundingMetadata;

      let json: any = undefined;
      if (params.responseSchema || params.grounded) {
        json = parseLenientJson(text);
      }

      return { text, json, groundingMetadata };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Gemini API call timed out after 110 seconds.');
      }
      if (err instanceof GeminiRateLimitError) {
        throw err;
      }
      if (attempt < maxAttempts && (err.message?.includes('429') || err.message?.includes('503'))) {
        console.warn(`[Gemini] Error on attempt ${attempt}: ${err.message}. Retrying in 20s...`);
        await new Promise((resolve) => setTimeout(resolve, 20000));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Gemini call failed unexpectedly after loop.');
}

function parseLenientJson(text: string): any {
  if (!text) return null;
  const trimmed = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Look for ```json ... ``` blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = trimmed.match(codeBlockRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // Look for first { to last }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Look for first [ to last ]
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}
