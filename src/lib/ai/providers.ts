import 'server-only';

// Common Whisper hallucinations when audio is silent
export const WHISPER_SILENCE_PHRASES = new Set([
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

export function cleanWhisperTranscript(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';
  const trimmed = rawText.trim();
  if (WHISPER_SILENCE_PHRASES.has(trimmed.toLowerCase())) {
    return '';
  }
  return trimmed;
}

const OPENROUTER_CHAT_MODEL_LIGHT = 'meta-llama/llama-3.1-8b-instruct';
const OPENROUTER_CHAT_MODEL_HEAVY = 'meta-llama/llama-3.3-70b-instruct';
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash';

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChatResult {
  stream: ReadableStream<Uint8Array>;
  provider: 'openrouter' | 'gemini';
}

/**
 * Streams chat completions: OpenRouter first, then Gemini fallback.
 * Uses a 20-second wait-for-first-token timeout before falling back.
 * Max tokens: 1024.
 */
export async function streamChat(
  messages: ChatMessageParam[],
  systemPrompt?: string,
  modelType: 'light' | 'heavy' = 'light'
): Promise<StreamChatResult> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const fullMessages: ChatMessageParam[] = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  const orModel = modelType === 'heavy' ? OPENROUTER_CHAT_MODEL_HEAVY : OPENROUTER_CHAT_MODEL_LIGHT;

  // 1. Try OpenRouter with 20s first-token timeout
  if (openRouterKey) {
    try {
      const controller = new AbortController();
      const firstTokenTimeout = setTimeout(() => {
        controller.abort(new Error('First token timeout after 20s'));
      }, 20000);

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://focalyst.online',
          'X-Title': 'Focalyst',
        },
        body: JSON.stringify({
          model: orModel,
          messages: fullMessages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        clearTimeout(firstTokenTimeout);
        const errText = await res.text().catch(() => '');
        console.error('[ai:chat]', 'openrouter', res.status, errText.slice(0, 100));
        throw new Error(`OpenRouter returned status ${res.status}`);
      }

      if (!res.body) {
        clearTimeout(firstTokenTimeout);
        throw new Error('OpenRouter response body is null');
      }

      const reader = res.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      let hasReceivedFirstToken = false;
      let buffer = '';

      // Read first chunk to ensure first token arrived before the 20s timeout
      const firstRead = await reader.read();
      clearTimeout(firstTokenTimeout);

      if (firstRead.done) {
        throw new Error('OpenRouter stream ended immediately without tokens');
      }

      hasReceivedFirstToken = true;

      const stream = new ReadableStream<Uint8Array>({
        async start(streamController) {
          function processChunk(chunkText: string) {
            buffer += chunkText;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) {
                // Skip SSE comments like ": OPENROUTER PROCESSING"
                continue;
              }
              if (trimmed === 'data: [DONE]') {
                continue;
              }
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6).trim();
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === 'string' && content.length > 0) {
                    streamController.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Incomplete or non-JSON chunk
                }
              }
            }
          }

          if (firstRead.value) {
            processChunk(decoder.decode(firstRead.value, { stream: true }));
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                processChunk(decoder.decode(value, { stream: true }));
              }
            }
            if (buffer.length > 0) {
              processChunk('\n');
            }
            streamController.close();
          } catch (streamErr) {
            console.error('[ai:chat]', 'openrouter', 500, 'Stream read error');
            streamController.error(streamErr);
          }
        },
      });

      return { stream, provider: 'openrouter' };
    } catch (orErr: any) {
      console.error('[ai:chat]', 'openrouter', 500, orErr?.message || 'OpenRouter fallback triggered');
    }
  }

  // 2. Fallback to Gemini with 20s first-token timeout
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const firstTokenTimeout = setTimeout(() => {
        controller.abort(new Error('First token timeout after 20s'));
      }, 20000);

      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${geminiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GEMINI_CHAT_MODEL,
          messages: fullMessages,
          stream: true,
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        clearTimeout(firstTokenTimeout);
        const errText = await res.text().catch(() => '');
        console.error('[ai:chat]', 'gemini', res.status, errText.slice(0, 100));
        throw new Error(`Gemini returned status ${res.status}`);
      }

      if (!res.body) {
        clearTimeout(firstTokenTimeout);
        throw new Error('Gemini response body is null');
      }

      const reader = res.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const firstRead = await reader.read();
      clearTimeout(firstTokenTimeout);

      if (firstRead.done) {
        throw new Error('Gemini stream ended immediately without tokens');
      }

      let buffer = '';

      const stream = new ReadableStream<Uint8Array>({
        async start(streamController) {
          function processChunk(chunkText: string) {
            buffer += chunkText;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(':')) {
                continue;
              }
              if (trimmed === 'data: [DONE]') {
                continue;
              }
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6).trim();
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (typeof content === 'string' && content.length > 0) {
                    streamController.enqueue(encoder.encode(content));
                  }
                } catch {}
              }
            }
          }

          if (firstRead.value) {
            processChunk(decoder.decode(firstRead.value, { stream: true }));
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                processChunk(decoder.decode(value, { stream: true }));
              }
            }
            if (buffer.length > 0) {
              processChunk('\n');
            }
            streamController.close();
          } catch (streamErr) {
            console.error('[ai:chat]', 'gemini', 500, 'Gemini stream read error');
            streamController.error(streamErr);
          }
        },
      });

      return { stream, provider: 'gemini' };
    } catch (geminiErr: any) {
      console.error('[ai:chat]', 'gemini', 500, geminiErr?.message || 'Gemini chat error');
    }
  }

  throw new Error('All AI providers failed to respond');
}

/**
 * Non-streaming completeJSON helper with 45-second timeout and fallback from OpenRouter to Gemini.
 */
export async function completeJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  schemaHint?: string,
  timeoutMs = 45000
): Promise<{ data: T; provider: 'openrouter' | 'gemini' }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const messages = [
    {
      role: 'system',
      content: schemaHint ? `${systemPrompt}\n\nRespond strictly in valid JSON format:\n${schemaHint}` : systemPrompt,
    },
    { role: 'user', content: userPrompt },
  ];

  // 1. Try OpenRouter (Llama 3.3 70B)
  if (openRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://focalyst.online',
          'X-Title': 'Focalyst',
        },
        body: JSON.stringify({
          model: OPENROUTER_CHAT_MODEL_HEAVY,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return { data: parsed, provider: 'openrouter' };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.error('[ai:completeJSON]', 'openrouter', res.status, errText.slice(0, 100));
      }
    } catch (orErr: any) {
      console.error('[ai:completeJSON]', 'openrouter', 500, orErr?.message || 'OpenRouter completeJSON error');
    }
  }

  // 2. Fallback to Gemini
  if (geminiKey) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${geminiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GEMINI_CHAT_MODEL,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return { data: parsed, provider: 'gemini' };
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.error('[ai:completeJSON]', 'gemini', res.status, errText.slice(0, 100));
      }
    } catch (geminiErr: any) {
      console.error('[ai:completeJSON]', 'gemini', 500, geminiErr?.message || 'Gemini completeJSON error');
    }
  }

  throw new Error('Failed to generate structured JSON with all providers');
}

/**
 * Transcribes audio: OpenRouter STT -> Gemini audio fallback.
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ text: string; provider: string }> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const base64Audio = buffer.toString('base64');
  const extMatch = filename.toLowerCase().match(/\.(m4a|mp4|wav|mp3|webm|ogg|flac|aac)$/);
  const audioFormat = extMatch ? extMatch[1] : (mimeType.includes('webm') ? 'webm' : (mimeType.includes('mp4') ? 'm4a' : 'wav'));

  // 1. Try OpenRouter Whisper STT with multipart FormData
  if (openRouterKey) {
    const whisperModels = ['openai/whisper-large-v3-turbo', 'openai/whisper-large-v3'];
    for (const modelId of whisperModels) {
      try {
        const formData = new FormData();
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        formData.append('file', new Blob([uint8 as unknown as BlobPart], { type: mimeType || 'audio/webm' }), `audio.${audioFormat}`);
        formData.append('model', modelId);

        const res = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://focalyst.online',
            'X-Title': 'Focalyst',
          },
          body: formData,
          signal: AbortSignal.timeout(40000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = cleanWhisperTranscript(data?.text || '');
          if (text) return { text, provider: 'openrouter' };
        } else {
          const errText = await res.text().catch(() => '');
          console.error('[ai:transcribe]', 'openrouter', res.status, errText.slice(0, 100));
        }
      } catch (orErr: any) {
        console.error('[ai:transcribe]', 'openrouter', 500, orErr?.message || 'OpenRouter transcribe error');
      }
    }
  }

  // 3. Fallback to Gemini Multimodal Audio
  if (geminiKey) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-3.8-flash'];
    for (const geminiModel of geminiModels) {
      try {
        const payload: Record<string, any> = {
          contents: [
            {
              parts: [
                {
                  text: 'Transcribe the spoken words in this audio recording into clean text. Output ONLY what the speaker said. If silence, output an empty string.',
                },
                {
                  inline_data: {
                    mime_type: mimeType || 'audio/webm',
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts;
          const text = Array.isArray(parts)
            ? parts.filter((p: any) => !p?.thought && typeof p?.text === 'string').map((p: any) => p.text).join('').trim()
            : data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          return { text: cleanWhisperTranscript(text), provider: 'gemini' };
        } else {
          const errText = await res.text().catch(() => '');
          console.error('[ai:transcribe]', 'gemini', res.status, errText.slice(0, 100));
        }
      } catch (geminiErr: any) {
        console.error('[ai:transcribe]', 'gemini', 500, geminiErr?.message || 'Gemini audio transcribe error');
      }
    }
  }

  throw new Error('All speech transcription providers failed');
}
