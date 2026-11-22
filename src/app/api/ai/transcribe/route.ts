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
  mp4Codec?: string;
}

function buildPcm16Wav(pcm16Le: Buffer, sampleRate: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0, 'ascii');
  wavHeader.writeUInt32LE(36 + pcm16Le.length, 4);
  wavHeader.write('WAVE', 8, 'ascii');
  wavHeader.write('fmt ', 12, 'ascii');
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20); // PCM
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(16, 34);
  wavHeader.write('data', 36, 'ascii');
  wavHeader.writeUInt32LE(pcm16Le.length, 40);
  return Buffer.concat([wavHeader, pcm16Le]);
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

interface Mp4Box {
  type: string;
  dataStart: number;
  end: number;
}

function findMp4Boxes(buf: Buffer, start: number, end: number, targetType?: string): Mp4Box[] {
  const out: Mp4Box[] = [];
  let pos = start;
  while (pos + 8 <= end) {
    const size32 = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    let headerLen = 8;
    let boxSize = size32;
    if (size32 === 1) {
      if (pos + 16 > end) break;
      const hi = buf.readUInt32BE(pos + 8);
      const lo = buf.readUInt32BE(pos + 12);
      boxSize = hi * 0x100000000 + lo;
      headerLen = 16;
    } else if (size32 === 0) {
      boxSize = end - pos;
    }
    if (boxSize < headerLen || pos + boxSize > end) break;
    const boxEnd = pos + boxSize;
    if (!targetType || type === targetType) {
      out.push({ type, dataStart: pos + headerLen, end: boxEnd });
    }
    pos = boxEnd;
  }
  return out;
}

function convertPcmToInt16Le(
  raw: Buffer,
  bitsPerChannel: number,
  isFloat: boolean,
  isBigEndian: boolean,
  isSigned: boolean
): Buffer {
  if (isFloat && bitsPerChannel === 32) {
    const count = Math.floor(raw.length / 4);
    const out = Buffer.allocUnsafe(count * 2);
    for (let i = 0; i < count; i++) {
      const sample = isBigEndian ? raw.readFloatBE(i * 4) : raw.readFloatLE(i * 4);
      const clamped = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0));
      out.writeInt16LE(Math.round(clamped * 32767), i * 2);
    }
    return out;
  }
  if (bitsPerChannel === 16) {
    const usable = raw.length - (raw.length % 2);
    const out = Buffer.from(raw.subarray(0, usable));
    if (isBigEndian) out.swap16();
    return out;
  }
  if (bitsPerChannel === 24) {
    const count = Math.floor(raw.length / 3);
    const out = Buffer.allocUnsafe(count * 2);
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const b0 = isBigEndian ? raw[o] : raw[o + 2];
      const b1 = raw[o + 1];
      const signedHigh = ((b0 << 24) >> 16) | b1;
      out.writeInt16LE(signedHigh, i * 2);
    }
    return out;
  }
  if (bitsPerChannel === 32) {
    const count = Math.floor(raw.length / 4);
    const out = Buffer.allocUnsafe(count * 2);
    for (let i = 0; i < count; i++) {
      const val = isBigEndian ? raw.readInt32BE(i * 4) : raw.readInt32LE(i * 4);
      out.writeInt16LE(val >> 16, i * 2);
    }
    return out;
  }
  if (bitsPerChannel === 8) {
    const out = Buffer.allocUnsafe(raw.length * 2);
    for (let i = 0; i < raw.length; i++) {
      const s8 = isSigned ? raw.readInt8(i) : raw.readUInt8(i) - 128;
      out.writeInt16LE(s8 << 8, i * 2);
    }
    return out;
  }
  return raw;
}

const UNCOMPRESSED_MP4_CODECS = new Set([
  'lpcm',
  'sowt',
  'twos',
  'fl32',
  'in24',
  'in32',
  'ipcm',
  'fpcm',
]);

function inspectAndConvertM4a(buffer: Buffer): { wavBuffer: Buffer | null; mp4Codec?: string } {
  const moovs = findMp4Boxes(buffer, 0, buffer.length, 'moov');
  if (moovs.length === 0) return { wavBuffer: null };
  const moov = moovs[0];

  let mp4Codec: string | undefined;
  let entryStart = -1;
  let entryEnd = -1;
  let mdhdTimescale = 0;

  for (const trak of findMp4Boxes(buffer, moov.dataStart, moov.end, 'trak')) {
    const mdia = findMp4Boxes(buffer, trak.dataStart, trak.end, 'mdia')[0];
    if (!mdia) continue;
    const minf = findMp4Boxes(buffer, mdia.dataStart, mdia.end, 'minf')[0];
    if (!minf) continue;
    const stbl = findMp4Boxes(buffer, minf.dataStart, minf.end, 'stbl')[0];
    if (!stbl) continue;
    const stsd = findMp4Boxes(buffer, stbl.dataStart, stbl.end, 'stsd')[0];
    if (!stsd || stsd.dataStart + 16 > stsd.end) continue;

    const firstEntry = stsd.dataStart + 8;
    const entrySize = buffer.readUInt32BE(firstEntry);
    if (entrySize >= 16 && firstEntry + entrySize <= stsd.end) {
      mp4Codec = buffer.subarray(firstEntry + 4, firstEntry + 8).toString('ascii');
      entryStart = firstEntry;
      entryEnd = firstEntry + entrySize;

      const mdhd = findMp4Boxes(buffer, mdia.dataStart, mdia.end, 'mdhd')[0];
      if (mdhd && mdhd.dataStart + 16 <= mdhd.end) {
        const mdhdVersion = buffer.readUInt8(mdhd.dataStart);
        if (mdhdVersion === 1 && mdhd.dataStart + 24 <= mdhd.end) {
          mdhdTimescale = buffer.readUInt32BE(mdhd.dataStart + 20);
        } else if (mdhdVersion === 0) {
          mdhdTimescale = buffer.readUInt32BE(mdhd.dataStart + 12);
        }
      }
      break;
    }
  }

  if (!mp4Codec || !UNCOMPRESSED_MP4_CODECS.has(mp4Codec) || entryStart < 0) {
    return { wavBuffer: null, mp4Codec };
  }

  const mdat = findMp4Boxes(buffer, 0, buffer.length, 'mdat')[0];
  if (!mdat || mdat.dataStart >= mdat.end) {
    return { wavBuffer: null, mp4Codec };
  }

  const version = entryStart + 18 <= entryEnd ? buffer.readUInt16BE(entryStart + 16) : 0;
  let sampleRate = mdhdTimescale || 44100;
  let channels = 2;
  let bitsPerChannel = 16;
  let flags = 0;
  let isFloat = false;
  let isBigEndian = false;
  let isSigned = true;
  let pcmCFound = false;

  if (mp4Codec === 'ipcm' || mp4Codec === 'fpcm') {
    if (entryStart + 36 <= entryEnd) {
      channels = buffer.readUInt16BE(entryStart + 24) || 1;
      bitsPerChannel = buffer.readUInt16BE(entryStart + 26) || 16;
      const fixedRate = buffer.readUInt32BE(entryStart + 32) >>> 16;
      sampleRate = fixedRate > 0 ? fixedRate : mdhdTimescale || 44100;
    }

    const childStart = entryStart + (version === 1 ? 52 : 36);
    let pcmCStart = -1;
    if (childStart < entryEnd) {
      const pcmCBox = findMp4Boxes(buffer, childStart, entryEnd, 'pcmC')[0];
      if (pcmCBox) {
        pcmCStart = pcmCBox.dataStart - 8;
      } else {
        const idx = buffer.indexOf(Buffer.from('pcmC'), entryStart + 36);
        if (idx >= entryStart + 40 && idx + 10 <= entryEnd) {
          pcmCStart = idx - 4;
        }
      }
    }

    if (pcmCStart >= 0 && pcmCStart + 14 <= entryEnd) {
      pcmCFound = true;
      flags = buffer.readUInt8(pcmCStart + 12);
      const pcmSampleSize = buffer.readUInt8(pcmCStart + 13);
      if (pcmSampleSize > 0) {
        bitsPerChannel = pcmSampleSize;
      }
    }

    isFloat = mp4Codec === 'fpcm';
    isBigEndian = pcmCFound ? (flags & 1) === 0 : true;
    isSigned = bitsPerChannel !== 8;
  } else if (version === 2 && entryStart + 64 <= entryEnd) {
    sampleRate = Math.round(buffer.readDoubleBE(entryStart + 40)) || mdhdTimescale || 44100;
    channels = buffer.readUInt32BE(entryStart + 48) || 1;
    bitsPerChannel = buffer.readUInt32BE(entryStart + 56) || 16;
    flags = buffer.readUInt32BE(entryStart + 60);
    isFloat = (flags & 1) !== 0;
    isBigEndian = (flags & 2) !== 0;
    isSigned = (flags & 4) !== 0;
  } else if (entryStart + 36 <= entryEnd) {
    channels = buffer.readUInt16BE(entryStart + 24) || 1;
    bitsPerChannel = buffer.readUInt16BE(entryStart + 26) || 16;
    sampleRate = Math.round(buffer.readUInt32BE(entryStart + 32) / 65536) || mdhdTimescale || 44100;
    if (mp4Codec === 'fl32') {
      isFloat = true;
      bitsPerChannel = 32;
      isBigEndian = true;
    } else if (mp4Codec === 'twos' || mp4Codec === 'in24' || mp4Codec === 'in32') {
      isBigEndian = true;
      if (mp4Codec === 'in24') bitsPerChannel = 24;
      if (mp4Codec === 'in32') bitsPerChannel = 32;
    }
  }

  const rawPcm = buffer.subarray(mdat.dataStart, mdat.end);
  const pcm16Le = convertPcmToInt16Le(rawPcm, bitsPerChannel, isFloat, isBigEndian, isSigned);
  const wavBuffer = buildPcm16Wav(pcm16Le, sampleRate, channels);
  console.info('[ai:transcribe] converted M4A PCM -> WAV', {
    mp4Codec,
    sampleRate,
    channels,
    bitsPerChannel,
    isBigEndian,
    pcmCFound,
    wavLen: wavBuffer.length,
  });
  return { wavBuffer, mp4Codec };
}

function normalizeAudioContainer(
  buffer: Buffer,
  fallbackMime: string,
  fallbackExt: string
): NormalizedAudio {
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const { wavBuffer, mp4Codec } = inspectAndConvertM4a(buffer);
    if (wavBuffer) {
      return { buffer: wavBuffer, mime: 'audio/wav', ext: 'wav', fileName: 'audio.wav', mp4Codec };
    }
    return { buffer, mime: 'audio/mp4', ext: 'm4a', fileName: 'audio.m4a', mp4Codec };
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
      mp4Codec: detected.mp4Codec,
      effectiveMime,
      effectiveExt,
      hasMoov: rawBuffer.includes(Buffer.from('moov')),
      hex16: rawBuffer.subarray(0, 16).toString('hex'),
    });

    // 1. Try OpenRouter STT first (whisper-large-v3-turbo)
    if (openRouterKey) {
      try {
        text = await transcribeOpenRouter(fileBuffer, effectiveExt, effectiveMime);
        if (text) {
          providerName = 'openrouter';
        }
      } catch (e: any) {
        console.warn('[ai:transcribe] openrouter failed, falling back:', String(e).slice(0, 200));
      }
    }

    // 2. Fallback to Azure AI Speech REST API
    if (!text && azureSpeechKey) {
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

    // 3. Last-resort fallback to Gemini
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
