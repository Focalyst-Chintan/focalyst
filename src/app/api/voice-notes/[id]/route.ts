import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { getVoiceNoteById, deleteVoiceNoteById } from '@/lib/server/azure-db';
import { deleteVoiceNoteBlob, getVoiceNoteReadSasUrl } from '@/lib/server/azure-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { id } = await params;
  try {
    const note = await getVoiceNoteById(id, auth.user.id);
    if (!note) {
      return NextResponse.json({ error: 'Voice note not found' }, { status: 404, headers: cors });
    }

    let playableAudioUrl = note.audio_url || note.audio_blob_url;
    if (playableAudioUrl && (playableAudioUrl.includes('blob.core.windows.net') || !playableAudioUrl.includes('sig='))) {
      try {
        playableAudioUrl = await getVoiceNoteReadSasUrl(playableAudioUrl, 120);
      } catch {
        // keep original
      }
    }

    return NextResponse.json(
      {
        success: true,
        voice_note: {
          ...note,
          audio_url: playableAudioUrl,
        },
      },
      { status: 200, headers: cors }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500, headers: cors });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { id } = await params;
  try {
    const existing = await getVoiceNoteById(id, auth.user.id);
    if (!existing) {
      return NextResponse.json({ error: 'Voice note not found' }, { status: 404, headers: cors });
    }

    // Delete blob if exists
    try {
      await deleteVoiceNoteBlob(auth.user.id, id);
    } catch (e: any) {
      console.warn('[voice-notes:DELETE] Blob delete warning:', e?.message);
    }

    // Delete row from Azure PostgreSQL
    await deleteVoiceNoteById(id, auth.user.id);

    return NextResponse.json({ success: true }, { status: 200, headers: cors });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500, headers: cors });
  }
}
