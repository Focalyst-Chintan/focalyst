import 'server-only';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { completeJSON } from '@/lib/ai/providers';
import { uploadVoiceNoteBlob, getVoiceNoteReadSasUrl } from '@/lib/server/azure-storage';
import { insertVoiceNote, getVoiceNotesByUser } from '@/lib/server/azure-db';
import { transcribeAudioVoice } from '@/lib/server/azure-speech';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

const VOICE_SUMMARY_SYSTEM_PROMPT = `You are a precise voice note editor and summarizer inside the Focalyst app.
You will receive a raw speech-to-text transcript spoken by the user.

STRICT RULES:
1. ONLY use the information actually present in the user's transcript. NEVER invent, assume, or add any external topics, brand names, or examples that the user did not speak.
2. "cleanedTranscript": Fix obvious speech-to-text grammar, punctuation, and homophone errors while strictly preserving the user's exact meaning and words.
3. "title": Generate a concise, accurate 3-to-6 word title based strictly on what the user talked about.
4. "summary": Write a concise summary of the user's note using standard paragraphs and simple "- " bullet points starting at column 0.

Respond ONLY in valid JSON format:
{
  "title": "Concise Note Title",
  "cleanedTranscript": "Corrected transcript...",
  "summary": "Summary of the spoken note..."
}`;

export async function GET(req: NextRequest) {
  const cors = corsHeaders(req);
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  try {
    const rawNotes = await getVoiceNotesByUser(auth.user.id, 100);
    const voiceNotes = await Promise.all(
      rawNotes.map(async (n) => {
        let playableAudioUrl = n.audio_url || n.audio_blob_url;
        if (playableAudioUrl && (playableAudioUrl.includes('blob.core.windows.net') || !playableAudioUrl.includes('sig='))) {
          try {
            playableAudioUrl = await getVoiceNoteReadSasUrl(playableAudioUrl, 120);
          } catch {
            // keep original
          }
        }
        return {
          ...n,
          audio_url: playableAudioUrl,
          audio_blob_url: n.audio_blob_url,
        };
      })
    );

    return NextResponse.json({ success: true, voice_notes: voiceNotes }, { status: 200, headers: cors });
  } catch (err: any) {
    console.error('[voice-notes:GET] error:', err?.message);
    return NextResponse.json({ error: 'Could not fetch voice notes' }, { status: 500, headers: cors });
  }
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
    let transcript = '';
    let durationSeconds = 0;
    let audioBlobUrl: string | null = null;
    let audioSasUrl: string | null = null;
    let noteTitle: string | null = null;
    const noteId = crypto.randomUUID();

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as Blob | null;
      const durationVal = formData.get('durationSeconds');
      if (durationVal) durationSeconds = parseInt(durationVal.toString(), 10) || 0;
      noteTitle = formData.get('title')?.toString() || null;

      if (!file) {
        return NextResponse.json({ error: 'Audio file is required' }, { status: 400, headers: cors });
      }

      const mimeType = (file.type || 'audio/webm').toLowerCase().split(';')[0];
      const filename = (file as any).name || 'recording.webm';
      const extMatch = filename.toLowerCase().match(/\.(m4a|mp4|wav|mp3|webm|ogg|flac|aac)$/);
      const ext = extMatch ? extMatch[1] : (mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('wav') ? 'wav' : 'webm'));
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload directly to Azure Blob Storage voice-notes container
      const uploadRes = await uploadVoiceNoteBlob({
        userId: auth.user.id,
        noteId,
        extension: ext,
        buffer,
        contentType: mimeType,
      });
      audioBlobUrl = uploadRes.blobUrl;
      audioSasUrl = uploadRes.sasUrl;

      // Transcribe via Azure Speech REST API with Gemini fallback
      const stt = await transcribeAudioVoice(buffer, filename, mimeType);
      transcript = stt.text;
    } else {
      const body = await req.json().catch(() => ({}));
      transcript = body.transcript || '';
      durationSeconds = body.durationSeconds || 0;
      audioBlobUrl = body.audio_blob_url || body.audio_url || null;
      noteTitle = body.title || null;
    }

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: 'No speech detected in recording. Please try speaking again.' },
        { status: 400, headers: cors }
      );
    }

    // Generate AI Summary
    let processed = {
      title: noteTitle || 'Voice Note',
      cleanedTranscript: transcript.trim(),
      summary: transcript.trim(),
    };

    try {
      const { data } = await completeJSON<{
        title?: string;
        cleanedTranscript?: string;
        summary?: string;
      }>(
        VOICE_SUMMARY_SYSTEM_PROMPT,
        `User Spoken Transcript:\n"""\n${transcript.trim()}\n"""`,
        `{"title":"string","cleanedTranscript":"string","summary":"string"}`,
        25000
      );
      if (data) {
        processed = {
          title: noteTitle || data.title || 'Voice Note',
          cleanedTranscript: data.cleanedTranscript || transcript.trim(),
          summary: data.summary || data.cleanedTranscript || transcript.trim(),
        };
      }
    } catch (err: any) {
      console.warn('[voice-notes:POST] summary error:', err?.message);
    }

    const voiceNote = await insertVoiceNote({
      id: noteId,
      user_id: auth.user.id,
      title: processed.title,
      audio_blob_url: audioBlobUrl,
      audio_url: audioSasUrl || audioBlobUrl,
      duration_seconds: durationSeconds,
      transcript: processed.cleanedTranscript,
      raw_transcript: transcript.trim(),
      summary: processed.summary,
    });

    return NextResponse.json(
      {
        success: true,
        voice_note: {
          ...voiceNote,
          audio_url: audioSasUrl || voiceNote.audio_url,
        },
      },
      { status: 201, headers: cors }
    );
  } catch (err: any) {
    console.error('[voice-notes:POST] error:', err?.message);
    return NextResponse.json(
      { error: 'Could not process and save voice note' },
      { status: 500, headers: cors }
    );
  }
}
