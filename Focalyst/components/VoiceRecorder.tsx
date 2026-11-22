import React from 'react';
import { VoiceNoteRecorderModal } from './VoiceNoteRecorderModal';

interface VoiceRecorderProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: (savedNote?: any) => void;
  userPlan?: string | null | undefined;
  voiceNotesCount?: number;
  userId?: string;
  isDarkMode?: boolean;
}

export function VoiceRecorder({ isDarkMode }: VoiceRecorderProps) {
  return <VoiceNoteRecorderModal isDarkMode={isDarkMode} />;
}

export default VoiceRecorder;
