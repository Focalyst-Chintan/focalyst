export type VoiceNoteIntentAction = 'start' | 'open';

export interface VoiceNoteIntent {
  action: VoiceNoteIntentAction;
  id: number;
}

type IntentListener = (intent: VoiceNoteIntent) => void;

let pendingIntent: VoiceNoteIntent | null = null;
const listeners = new Set<IntentListener>();

let lastRecordedUrl = '';
let lastRecordedAt = 0;

export function parseVoiceNoteActionFromUrl(url: string): VoiceNoteIntentAction | null {
  if (!url) return null;
  const lower = url.toLowerCase();

  const isVoiceRoute =
    lower.includes('voice-note') ||
    lower.includes('action=record-voice') ||
    (lower.includes('notes') && lower.includes('action='));

  if (!isVoiceRoute) return null;

  if (lower.includes('action=open')) {
    return 'open';
  }
  if (lower.includes('action=start') || lower.includes('action=record-voice')) {
    return 'start';
  }
  return null;
}

export function setPendingVoiceNoteIntent(
  action: VoiceNoteIntentAction,
  sourceKey?: string
): VoiceNoteIntent | null {
  const now = Date.now();
  const dedupeKey = sourceKey || action;
  if (dedupeKey === lastRecordedUrl && now - lastRecordedAt < 800) {
    return pendingIntent;
  }
  lastRecordedUrl = dedupeKey;
  lastRecordedAt = now;

  const intent: VoiceNoteIntent = {
    action,
    id: now + Math.random(),
  };
  pendingIntent = intent;
  listeners.forEach((cb) => {
    try {
      cb(intent);
    } catch {}
  });
  return intent;
}

export function recordVoiceNoteDeepLink(url: string): VoiceNoteIntentAction | null {
  const action = parseVoiceNoteActionFromUrl(url);
  if (!action) return null;
  setPendingVoiceNoteIntent(action, url);
  return action;
}

export function consumePendingVoiceNoteIntent(): VoiceNoteIntent | null {
  const current = pendingIntent;
  pendingIntent = null;
  return current;
}

export function hasPendingVoiceNoteIntent(): boolean {
  return pendingIntent !== null;
}

export function subscribeVoiceNoteIntent(listener: IntentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
