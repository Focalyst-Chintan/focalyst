import 'server-only';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { completeJSON } from '@/lib/ai/providers';
import { VOICE_SUMMARY_SYSTEM_PROMPT, buildVoiceSummaryUserPrompt } from '@/lib/ai/voiceSummaryPrompt';
import { FREE_TIER_LIMITS } from '@/lib/featureGates';
import { uploadVoiceNoteBlob, getVoiceNoteReadSasUrl } from '@/lib/server/azure-storage';
import { insertVoiceNote } from '@/lib/server/azure-db';
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

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: cors });
  }

  const auth = await requireUser(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const { user, supabase } = auth;

  try {
    let transcript = '';
    let durationSeconds = 0;
    let skipSave = false;
    let audioBlobUrl: string | null = null;
    let audioSasUrl: string | null = null;
    let previousSummary: string | undefined;
    let isRegenerate = false;
    const noteId = crypto.randomUUID();

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as Blob | null;
      const durationVal = formData.get('durationSeconds');
      if (durationVal) durationSeconds = parseInt(durationVal.toString(), 10) || 0;
      skipSave = formData.get('skipSave') === 'true';

      if (!file) {
        return NextResponse.json({ error: 'Audio file is required' }, { status: 400, headers: cors });
      }

      const mimeType = (file.type || 'audio/webm').toLowerCase().split(';')[0];
      const filename = (file as any).name || 'recording.webm';
      const extMatch = filename.toLowerCase().match(/\.(m4a|mp4|wav|mp3|webm|ogg|flac|aac)$/);
      const ext = extMatch ? extMatch[1] : (mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('wav') ? 'wav' : 'webm'));
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 1. Upload audio blob directly to Azure Blob Storage voice-notes container
      try {
        const uploadRes = await uploadVoiceNoteBlob({
          userId: user.id,
          noteId,
          extension: ext,
          buffer,
          contentType: mimeType,
        });
        audioBlobUrl = uploadRes.blobUrl;
        audioSasUrl = uploadRes.sasUrl;
      } catch (uploadErr: any) {
        console.error('[ai:voice-summary] Azure Blob upload error:', uploadErr?.message);
      }

      // 2. Transcribe via Azure Speech REST API with Gemini fallback
      const sttResult = await transcribeAudioVoice(buffer, filename, mimeType);
      transcript = sttResult.text;
    } else {
      const body = await req.json().catch(() => ({}));
      transcript = body.transcript || '';
      durationSeconds = body.durationSeconds || 0;
      skipSave = Boolean(body.skipSave);
      audioBlobUrl = body.audio_blob_url || body.audio_url || null;
      previousSummary = typeof body.previousSummary === 'string' ? body.previousSummary : undefined;
      isRegenerate = Boolean(body.isRegenerate);
    }

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: 'No speech detected in recording. Please try speaking again.' },
        { status: 400, headers: cors }
      );
    }

    // Check Free tier note limit
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    const isFree = !profile?.plan || profile.plan === 'free';
    if (isFree) {
      const { count } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count !== null && count >= FREE_TIER_LIMITS.notes) {
        return NextResponse.json(
          { error: 'Note limit reached. Upgrade to Pro for unlimited voice notes.' },
          { status: 402, headers: cors }
        );
      }
    }

    // Generate AI Summary
    let processed = {
      title: 'Voice Note',
      cleanedTranscript: transcript.trim(),
      summary: transcript.trim(),
    };

    try {
      const schemaHint = `{
  "title": "string",
  "cleanedTranscript": "string",
  "summary": "string"
}`;
      const { data, provider } = await completeJSON<{
        title?: string;
        cleanedTranscript?: string;
        summary?: string;
      }>(
        VOICE_SUMMARY_SYSTEM_PROMPT,
        buildVoiceSummaryUserPrompt(transcript.trim(), { previousSummary, isRegenerate }),
        schemaHint,
        25000,
        isRegenerate ? 0.35 : 0.2
      );

      const summaryText = typeof data?.summary === 'string' ? data.summary.trim() : '';
      const rawTrimmed = transcript.trim();
      const isSummaryValid = Boolean(summaryText) && summaryText !== rawTrimmed;

      if (!isSummaryValid) {
        console.error(
          '[ai:voice-summary] Invalid or un-summarized output from provider:',
          provider,
          { hasSummary: Boolean(summaryText), matchesRaw: summaryText === rawTrimmed }
        );
      }

      if (data) {
        const cleaned = (typeof data.cleanedTranscript === 'string' && data.cleanedTranscript.trim())
          ? data.cleanedTranscript.trim()
          : rawTrimmed;
        processed = {
          title: (typeof data.title === 'string' && data.title.trim()) ? data.title.trim() : 'Voice Note',
          cleanedTranscript: cleaned,
          summary: isSummaryValid ? summaryText : cleaned,
        };
      }
    } catch (summaryErr: any) {
      console.error(
        '[ai:voice-summary] Summarization failed:',
        summaryErr?.status || 500,
        summaryErr?.message || 'Summarization fallback used'
      );
    }

    if (skipSave) {
      return NextResponse.json(
        {
          success: true,
          title: processed.title || 'Voice Note',
          cleanedTranscript: processed.cleanedTranscript || transcript.trim(),
          summary: processed.summary || processed.cleanedTranscript,
          audio_blob_url: audioBlobUrl,
        },
        { status: 200, headers: cors }
      );
    }

    // Save record to Azure PostgreSQL public.voice_notes
    let azureVoiceNote: any = null;
    try {
      azureVoiceNote = await insertVoiceNote({
        id: noteId,
        user_id: user.id,
        title: processed.title || 'Voice Note',
        audio_blob_url: audioBlobUrl,
        audio_url: audioSasUrl || audioBlobUrl,
        duration_seconds: durationSeconds,
        transcript: processed.cleanedTranscript || transcript.trim(),
        raw_transcript: transcript.trim(),
        summary: processed.summary || processed.cleanedTranscript,
      });
    } catch (dbErr: any) {
      console.error('[ai:voice-summary] Azure PostgreSQL voice_notes insert error:', dbErr?.message);
    }

    // Save/mirror note in notes table matching the phone app and web UI
    const notePayload = {
      id: azureVoiceNote?.id || noteId,
      user_id: user.id,
      title: processed.title || 'Voice Note',
      content: processed.summary || processed.cleanedTranscript,
      transcript: processed.cleanedTranscript || transcript.trim(),
      note_type: 'voice',
      is_favourite: false,
      duration_seconds: durationSeconds,
      audio_url: audioSasUrl || audioBlobUrl || null,
      updated_at: new Date().toISOString(),
    };

    let savedNote: any = azureVoiceNote || notePayload;
    try {
      const { data, error: insertError } = await supabase
        .from('notes')
        .insert([notePayload])
        .select()
        .single();

      if (!insertError && data) {
        savedNote = data;
      }
    } catch (sbErr: any) {
      console.warn('[ai:voice-summary] Supabase mirror note notice:', sbErr?.message);
    }

    return NextResponse.json(
      {
        success: true,
        title: processed.title || 'Voice Note',
        cleanedTranscript: processed.cleanedTranscript || transcript.trim(),
        summary: processed.summary || processed.cleanedTranscript,
        note: savedNote,
      },
      { status: 200, headers: cors }
    );
  } catch (err: any) {
    console.error('[ai:voice-summary]', 'server', 500, err?.message || 'Voice summary error');
    return NextResponse.json(
      { error: 'Could not process that recording. Please try again.' },
      { status: 500, headers: cors }
    );
  }
}
