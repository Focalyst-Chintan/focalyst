import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

async function transcribeOpenRouter(file: Blob, ext: string, mime: string): Promise<string> {
  const out = new FormData();
  out.append('file', new File([await file.arrayBuffer()], `audio.${ext}`, { type: mime || 'audio/webm' }));
  out.append('model', process.env.SPEECH_MODEL || 'openai/whisper-large-v3-turbo');
  const r = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://focalyst.online',
      'X-Title': 'Focalyst',
    },
    body: out,
    signal: AbortSignal.timeout(40000),
  });
  if (!r.ok) throw new Error(`openrouter stt ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return String(j.text ?? '').trim();
}

async function transcribeGemini(file: Blob, mime: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: mime || 'audio/webm', data } },
              {
                text: 'Transcribe this audio exactly as spoken, in the language spoken. Return only the transcript text, nothing else.',
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 2048, temperature: 0 },
      }),
      signal: AbortSignal.timeout(40000),
    }
  );
  if (!r.ok) throw new Error(`gemini stt ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('').trim();
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { code: 'no_file', error: 'No recording was received.' },
        { status: 400, headers: cors }
      );
    }

    const base = (file.type || '').split(';')[0].trim().toLowerCase();
    const nameExt = ((file as File).name || '').split('.').pop()?.toLowerCase();
    const ext = EXT[base] ?? (nameExt && Object.values(EXT).includes(nameExt) ? nameExt : null);

    if (!ext) {
      return NextResponse.json(
        { code: 'bad_type', error: 'That audio format is not supported.' },
        { status: 415, headers: cors }
      );
    }

    if (file.size < 2000) {
      return NextResponse.json(
        { code: 'too_short', error: 'That was too short. Hold the mic a little longer.' },
        { status: 400, headers: cors }
      );
    }

    if (file.size > 4_500_000) {
      return NextResponse.json(
        { code: 'too_large', error: 'That recording is too long. Keep it under 10 minutes.' },
        { status: 413, headers: cors }
      );
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!openRouterKey && !geminiKey) {
      console.error('[ai:transcribe] OPENROUTER_API_KEY and GEMINI_API_KEY missing on the server');
      return NextResponse.json(
        { code: 'no_key', error: 'Voice is not available right now. Please try again later.' },
        { status: 503, headers: cors }
      );
    }

    let text = '';
    let providerName = '';

    // 1. Try OpenRouter
    if (openRouterKey) {
      try {
        text = await transcribeOpenRouter(file, ext, base);
        if (text) {
          providerName = 'openrouter';
        }
      } catch (e: any) {
        console.error('[ai:transcribe] openrouter failed', String(e).slice(0, 200));
      }
    }

    // 2. Try Gemini backup if OpenRouter failed or returned empty
    if (!text && geminiKey) {
      try {
        text = await transcribeGemini(file, base);
        if (text) {
          providerName = 'gemini';
        }
      } catch (e: any) {
        console.error('[ai:transcribe] gemini failed', String(e).slice(0, 200));
      }
    }

    if (!providerName) {
      return NextResponse.json(
        { code: 'provider', error: 'Could not process that recording. Please try again.' },
        { status: 502, headers: cors }
      );
    }

    if (!text) {
      return NextResponse.json(
        { code: 'empty', error: 'We could not hear anything. Try speaking a little closer to the mic.' },
        { status: 422, headers: cors }
      );
    }

    console.info('[ai:transcribe] ok', providerName, base, file.size);
    return NextResponse.json(
      { text },
      {
        status: 200,
        headers: {
          ...cors,
          'X-AI-Provider': providerName,
        },
      }
    );
  } catch (err: any) {
    console.error('[ai:transcribe] unhandled error', err?.message || err);
    return NextResponse.json(
      { code: 'provider', error: 'Could not process that recording. Please try again.' },
      { status: 502, headers: cors }
    );
  }
}
