import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, originAllowed, corsHeaders } from '@/lib/server/auth';
import { completeJSON, transcribeAudio } from '@/lib/ai/providers';
import { FREE_TIER_LIMITS } from '@/lib/featureGates';

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
4. "summary": Write a concise summary of the user's note using standard paragraphs and simple "- " bullet points starting at column 0 (never indent bullets with spaces and never use code blocks).

Respond ONLY in valid JSON format:
{
  "title": "Concise Note Title",
  "cleanedTranscript": "Corrected transcript...",
  "summary": "Summary of the spoken note..."
}`;

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

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as Blob | null;
      const durationVal = formData.get('durationSeconds');
      if (durationVal) durationSeconds = parseInt(durationVal.toString(), 10) || 0;

      if (!file) {
        return NextResponse.json({ error: 'Audio file is required' }, { status: 400, headers: cors });
      }

      const mimeType = (file.type || 'audio/webm').toLowerCase().split(';')[0];
      const filename = (file as any).name || 'recording.webm';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const sttResult = await transcribeAudio(buffer, filename, mimeType);
      transcript = sttResult.text;
    } else {
      const body = await req.json().catch(() => ({}));
      transcript = body.transcript || '';
      durationSeconds = body.durationSeconds || 0;
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
      const { data } = await completeJSON<{
        title?: string;
        cleanedTranscript?: string;
        summary?: string;
      }>(
        VOICE_SUMMARY_SYSTEM_PROMPT,
        `User Spoken Transcript:\n"""\n${transcript.trim()}\n"""`,
        schemaHint,
        25000
      );

      if (data) {
        processed = {
          title: data.title || 'Voice Note',
          cleanedTranscript: data.cleanedTranscript || transcript.trim(),
          summary: data.summary || data.cleanedTranscript || transcript.trim(),
        };
      }
    } catch (summaryErr: any) {
      console.error('[ai:voice-summary]', 'server', 500, summaryErr?.message || 'Summarization fallback used');
    }

    // Save note in notes table matching the phone app
    const notePayload = {
      user_id: user.id,
      title: processed.title || 'Voice Note',
      content: processed.summary || processed.cleanedTranscript,
      transcript: processed.cleanedTranscript || transcript.trim(),
      note_type: 'voice',
      is_favourite: false,
      duration_seconds: durationSeconds,
      updated_at: new Date().toISOString(),
    };

    const { data: savedNote, error: insertError } = await supabase
      .from('notes')
      .insert([notePayload])
      .select()
      .single();

    if (insertError) {
      console.error('[ai:voice-summary]', 'supabase', 500, insertError.message);
      return NextResponse.json(
        { error: 'Failed to save voice note to database.' },
        { status: 500, headers: cors }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
