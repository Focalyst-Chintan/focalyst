import { transcribeVoiceAudio } from '../src/services/openRouterService';
import { supabase } from '../src/utils/supabase';

export interface ProcessedVoiceNote {
  title: string;
  cleanedTranscript: string;
  summary: string;
}

const FOCALYST_BACKEND_URL = 'https://focalyst.online';

// Common Whisper hallucinations when audio is silent
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

/**
 * Transcribes an audio file via the authenticated Focalyst backend (/api/ai/transcribe).
 */
export async function transcribeAudioUri(audioUri: string): Promise<string> {
  const rawText = await transcribeVoiceAudio(audioUri);
  if (!rawText || !rawText.trim()) return '';

  if (WHISPER_SILENCE_PHRASES.has(rawText.toLowerCase().trim())) {
    return '';
  }

  return rawText.trim();
}

/**
 * Cleans grammar/punctuation and summarizes ONLY what the user actually said
 * via the authenticated Focalyst backend (/api/ai/voice-summary).
 */
export async function processTranscriptWithAI(rawTranscript: string): Promise<ProcessedVoiceNote> {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      title: 'Voice Note',
      cleanedTranscript: '',
      summary: '',
    };
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return {
        title: 'Voice Note',
        cleanedTranscript: rawTranscript,
        summary: rawTranscript,
      };
    }

    const res = await fetch(`${FOCALYST_BACKEND_URL}/api/ai/voice-summary`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: rawTranscript.trim(),
        skipSave: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Voice summary endpoint returned ${res.status}`);
    }

    const data = await res.json();

    // If an older server deployment created a note row when skipSave was not yet active,
    // remove the temporary duplicate row so VoiceNoteRecorderModal's own insert remains canonical.
    if (data?.note?.id) {
      supabase
        .from('notes')
        .delete()
        .eq('id', data.note.id)
        .then(
          () => {},
          () => {}
        );
    }

    return {
      title: data?.title || data?.note?.title || 'Voice Note',
      cleanedTranscript: data?.cleanedTranscript || data?.note?.transcript || rawTranscript,
      summary: data?.summary || data?.note?.content || rawTranscript,
    };
  } catch (err) {
    console.warn('[Voice Note AI] Backend summarization fallback to raw transcript:', err);
    return {
      title: 'Voice Note',
      cleanedTranscript: rawTranscript,
      summary: rawTranscript,
    };
  }
}


