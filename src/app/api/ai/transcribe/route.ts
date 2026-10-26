import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { transcribeAudio } from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
]);

const MAX_BYTES = 4.5 * 1024 * 1024; // 4.5 MB limit

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
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400, headers: cors });
    }

    const blob = file as Blob;
    const mimeType = (blob.type || 'audio/webm').toLowerCase().split(';')[0];
    const filename = (file as any).name || 'recording.webm';

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      console.error('[ai:transcribe]', 'server', 400, `Unsupported mime type: ${mimeType}`);
      return NextResponse.json(
        { error: 'Unsupported audio format. Use webm, mp4, m4a, wav, or mp3.' },
        { status: 400, headers: cors }
      );
    }

    if (blob.size > MAX_BYTES) {
      console.error('[ai:transcribe]', 'server', 413, `File exceeds 4.5MB: ${blob.size}`);
      return NextResponse.json(
        { error: 'That recording is too long. Keep voice notes under 10 minutes.' },
        { status: 413, headers: cors }
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { text, provider } = await transcribeAudio(buffer, filename, mimeType);

    return NextResponse.json(
      { text },
      {
        status: 200,
        headers: {
          ...cors,
          'X-AI-Provider': provider,
        },
      }
    );
  } catch (err: any) {
    console.error('[ai:transcribe]', 'server', 500, err?.message || 'Transcription error');
    return NextResponse.json(
      { error: 'Could not process that recording. Please try again.' },
      { status: 500, headers: cors }
    );
  }
}
