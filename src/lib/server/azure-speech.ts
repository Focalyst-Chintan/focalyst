import 'server-only';
import https from 'https';

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

export function cleanTranscript(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';
  const trimmed = rawText.trim();
  if (WHISPER_SILENCE_PHRASES.has(trimmed.toLowerCase())) {
    return '';
  }
  return trimmed;
}

export async function transcribeWithAzureSpeech(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string | null> {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION || 'centralindia';

  if (!speechKey) {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    try {
      const boundary = '----Boundary' + Math.random().toString(36).substring(2);
      const safeFilename = filename || 'audio.wav';
      const safeMime = mimeType || 'audio/wav';

      let form = '';
      form += `--${boundary}\r\n`;
      form += `Content-Disposition: form-data; name="definition"\r\n\r\n`;
      form += JSON.stringify({ locales: ['en-US'] }) + '\r\n';
      form += `--${boundary}\r\n`;
      form += `Content-Disposition: form-data; name="audio"; filename="${safeFilename}"\r\n`;
      form += `Content-Type: ${safeMime}\r\n\r\n`;

      const header = Buffer.from(form, 'utf8');
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const fullPayload = Buffer.concat([header, buffer, footer]);

      const req = https.request(
        {
          hostname: `${speechRegion}.api.cognitive.microsoft.com`,
          path: '/speechtotext/transcriptions:transcribe?api-version=2024-05-15-preview',
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': fullPayload.length,
            Accept: 'application/json',
          },
          timeout: 30000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(data);
                const text =
                  parsed.combinedPhrases?.[0]?.text ||
                  parsed.phrases?.map((p: any) => p.text).filter(Boolean).join(' ') ||
                  '';
                resolve(cleanTranscript(text));
              } catch {
                resolve(null);
              }
            } else {
              console.warn(
                `[AzureSpeech] Fast transcription returned HTTP ${res.statusCode}: ${data.slice(0, 150)}`
              );
              resolve(null);
            }
          });
        }
      );

      req.on('error', (err) => {
        console.warn('[AzureSpeech] Request error:', err.message);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.write(fullPayload);
      req.end();
    } catch (err: any) {
      console.warn('[AzureSpeech] Exception:', err?.message);
      resolve(null);
    }
  });
}

export async function transcribeWithGemini(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  const base64Data = buffer.toString('base64');
  const safeMime = (mimeType || 'audio/webm').toLowerCase().split(';')[0];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': geminiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType: safeMime, data: base64Data } },
                  {
                    text: 'Transcribe this audio exactly as spoken, in the language spoken. Return only the transcript text, nothing else. Do not add explanations.',
                  },
                ],
              },
            ],
            generationConfig: { maxOutputTokens: 2048, temperature: 0 },
          }),
          signal: AbortSignal.timeout(35000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = (json.candidates?.[0]?.content?.parts ?? [])
          .map((p: any) => p.text ?? '')
          .join('')
          .trim();
        const cleaned = cleanTranscript(text);
        if (cleaned) return cleaned;
      } else {
        const err = await res.text().catch(() => '');
        console.warn(`[Gemini STT] ${model} returned HTTP ${res.status}: ${err.slice(0, 150)}`);
      }
    } catch (e: any) {
      console.warn(`[Gemini STT] ${model} error:`, e.message);
    }
  }

  return null;
}

export async function transcribeAudioVoice(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ text: string; provider: 'azure' | 'gemini' | 'none' }> {
  // 1. Primary: Azure AI Speech
  try {
    const azureText = await transcribeWithAzureSpeech(buffer, filename, mimeType);
    if (azureText) {
      return { text: azureText, provider: 'azure' };
    }
  } catch (err: any) {
    console.warn('[transcribeAudioVoice] Azure Speech failed, falling back to Gemini:', err.message);
  }

  // 2. Automatic fallback: Gemini (e.g. WebM/Opus or fast transcription fallback)
  try {
    const geminiText = await transcribeWithGemini(buffer, mimeType);
    if (geminiText) {
      return { text: geminiText, provider: 'gemini' };
    }
  } catch (err: any) {
    console.warn('[transcribeAudioVoice] Gemini fallback failed:', err.message);
  }

  return { text: '', provider: 'none' };
}
