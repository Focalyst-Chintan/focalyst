import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { transcribeWithAzureSpeech, transcribeWithGemini } from '@/lib/server/azure-speech';

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

const ALLOWED_TRANSCRIBE_MODEL = 'openai/whisper-large-v3-turbo';
const ALLOWED_GEMINI_MODEL = 'gemini-2.5-flash';

interface NormalizedAudio {
  buffer: Buffer;
  mime: string;
  ext: string;
  fileName: string;
}

/**
 * Parses an Apple Core Audio Format (CAF) buffer with linear PCM (`lpcm`) data
 * and wraps it in a standard 44-byte RIFF/WAVE header (little-endian).
 */
function cafToWav(caf: Buffer): Buffer | null {
  if (caf.length < 20 || caf.subarray(0, 4).toString('ascii') !== 'caff') return null;

  let sampleRate = 44100;
  let formatID = '';
  let formatFlags = 0;
  let channelsPerFrame = 2;
  let bitsPerChannel = 16;
  let pcmData: Buffer | null = null;

  let offset = 8; // skip 'caff' (4) + version (2) + flags (2)
  while (offset + 12 <= caf.length) {
    const chunkType = caf.subarray(offset, offset + 4).toString('ascii');
    const sizeHi = caf.readInt32BE(offset + 4);
    const sizeLo = caf.readUInt32BE(offset + 8);
    offset += 12;

    // CAF uses -1 (0xFFFFFFFFFFFFFFFF) in the `data` chunk when size is unknown / extends to EOF
    const chunkSize =
      sizeHi === -1 && sizeLo === 0xffffffff
        ? caf.length - offset
        : sizeHi * 0x100000000 + sizeLo;
    if (chunkSize < 0 || offset + chunkSize > caf.length) break;

    if (chunkType === 'desc' && chunkSize >= 32) {
      sampleRate = Math.round(caf.readDoubleBE(offset)) || 44100;
      formatID = caf.subarray(offset + 8, offset + 12).toString('ascii');
      formatFlags = caf.readUInt32BE(offset + 12);
      channelsPerFrame = caf.readUInt32BE(offset + 24) || 1;
      bitsPerChannel = caf.readUInt32BE(offset + 28) || 16;
    } else if (chunkType === 'data' && chunkSize > 4) {
      // First 4 bytes of CAF `data` chunk are mEditCount
      pcmData = Buffer.from(caf.subarray(offset + 4, offset + chunkSize));
    }

    offset += chunkSize;
  }

  if (formatID !== 'lpcm' || !pcmData || pcmData.length === 0) {
    console.warn('[ai:transcribe] cafToWav failed', {
      len: caf.length,
      formatID: formatID || '(missing)',
      formatFlags,
      sampleRate,
      channelsPerFrame,
      bitsPerChannel,
      pcmLen: pcmData?.length ?? 0,
    });
    return null;
  }

  const isFloat = (formatFlags & 1) !== 0;
  const isLittleEndian = (formatFlags & 2) !== 0;

  if (!isLittleEndian) {
    if (bitsPerChannel === 16) {
      pcmData.swap16();
    } else if (bitsPerChannel === 24) {
      for (let i = 0; i + 2 < pcmData.length; i += 3) {
        const tmp = pcmData[i];
        pcmData[i] = pcmData[i + 2];
        pcmData[i + 2] = tmp;
      }
    } else if (bitsPerChannel === 32) {
      pcmData.swap32();
    }
  }

  const byteRate = sampleRate * channelsPerFrame * (bitsPerChannel / 8);
  const blockAlign = channelsPerFrame * (bitsPerChannel / 8);
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0, 'ascii');
  wavHeader.writeUInt32LE(36 + pcmData.length, 4);
  wavHeader.write('WAVE', 8, 'ascii');
  wavHeader.write('fmt ', 12, 'ascii');
  wavHeader.writeUInt32LE(16, 16); // PCM fmt chunk size
  wavHeader.writeUInt16LE(isFloat ? 3 : 1, 20); // 1 = PCM, 3 = IEEE float
  wavHeader.writeUInt16LE(channelsPerFrame, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerChannel, 34);
  wavHeader.write('data', 36, 'ascii');
  wavHeader.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([wavHeader, pcmData]);
}

function normalizeAudioContainer(
  buffer: Buffer,
  fallbackMime: string,
  fallbackExt: string
): NormalizedAudio {
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return { buffer, mime: 'audio/mp4', ext: 'm4a', fileName: 'audio.m4a' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    return { buffer, mime: 'audio/wav', ext: 'wav', fileName: 'audio.wav' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'caff') {
    const wavBuffer = cafToWav(buffer);
    if (wavBuffer) {
      console.info(`[ai:transcribe] converted CAF (${buffer.length}B) -> WAV (${wavBuffer.length}B)`);
      return { buffer: wavBuffer, mime: 'audio/wav', ext: 'wav', fileName: 'audio.wav' };
    }
    return { buffer, mime: 'audio/x-caf', ext: 'caf', fileName: 'audio.caf' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return { buffer, mime: 'audio/ogg', ext: 'ogg', fileName: 'audio.ogg' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'fLaC') {
    return { buffer, mime: 'audio/flac', ext: 'flac', fileName: 'audio.flac' };
  }
  if (
    buffer.length >= 3 &&
    (buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
  ) {
    return { buffer, mime: 'audio/mpeg', ext: 'mp3', fileName: 'audio.mp3' };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { buffer, mime: 'audio/webm', ext: 'webm', fileName: 'audio.webm' };
  }

  console.warn(
    `[ai:transcribe] unknown container hex=${buffer.subarray(0, 16).toString('hex')} len=${buffer.length}`
  );
  return {
    buffer,
    mime: fallbackMime,
    ext: fallbackExt,
    fileName: `audio.${fallbackExt}`,
  };
}

async function transcribeOpenRouter(buffer: Buffer, ext: string, _mime: string): Promise<string> {
  const format = ext === 'mp4' ? 'm4a' : ext;
  const r = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://focalyst.online',
      'X-Title': 'Focalyst',
    },
    body: JSON.stringify({
      model: ALLOWED_TRANSCRIBE_MODEL,
      input_audio: {
        data: buffer.toString('base64'),
        format,
      },
    }),
    signal: AbortSignal.timeout(40000),
  });
  if (!r.ok) throw new Error(`openrouter stt ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return String(j.text ?? '').trim();
}

async function transcribeGemini(file: Blob, mime: string): Promise<string> {
  const model = ALLOWED_GEMINI_MODEL;
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

    const azureSpeechKey = process.env.AZURE_SPEECH_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!azureSpeechKey && !geminiKey && !openRouterKey) {
      console.error('[ai:transcribe] Neither AZURE_SPEECH_KEY, GEMINI_API_KEY nor OPENROUTER_API_KEY are configured');
      return NextResponse.json(
        { code: 'no_key', error: 'Voice is not available right now. Please try again later.' },
        { status: 503, headers: cors }
      );
    }

    let text = '';
    let providerName = '';
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const origName = (file as File).name || '';
    const detected = normalizeAudioContainer(rawBuffer, base, ext);
    const fileBuffer = detected.buffer;
    const effectiveMime = detected.mime;
    const effectiveExt = detected.ext;
    const fileName = detected.fileName;

    console.log('[ai:transcribe] input', {
      rawLen: rawBuffer.length,
      origMime: base,
      origName,
      detected: detected.ext,
      effectiveMime,
      effectiveExt,
      hasMoov: rawBuffer.includes(Buffer.from('moov')),
      hex16: rawBuffer.subarray(0, 16).toString('hex'),
    });

    // 1. Try Azure AI Speech REST API first
    if (azureSpeechKey) {
      try {
        const azureText = await transcribeWithAzureSpeech(fileBuffer, fileName, effectiveMime);
        if (azureText) {
          text = azureText;
          providerName = 'azure-speech';
        }
      } catch (e: any) {
        console.warn('[ai:transcribe] azure-speech failed, falling back:', String(e).slice(0, 200));
      }
    }

    // 2. Automatic fallback to Gemini if Azure fails, returns empty, or for formats needing conversion
    if (!text && geminiKey) {
      try {
        const geminiText = await transcribeWithGemini(fileBuffer, effectiveMime);
        if (geminiText) {
          text = geminiText;
          providerName = 'gemini';
        }
      } catch (e: any) {
        console.warn('[ai:transcribe] gemini fallback failed:', String(e).slice(0, 200));
      }
    }

    // 3. Fallback to OpenRouter if still empty
    if (!text && openRouterKey) {
      try {
        text = await transcribeOpenRouter(fileBuffer, effectiveExt, effectiveMime);
        if (text) {
          providerName = 'openrouter';
        }
      } catch (e: any) {
        console.warn('[ai:transcribe] openrouter failed:', String(e).slice(0, 200));
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
      { text, transcript: text },
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
