import React from 'react';
import { VoiceNoteRecorderModal } from './VoiceNoteRecorderModal';
import { supabase } from '../src/utils/supabase';

interface VoiceRecorderProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess: (savedNote?: any) => void;
  userPlan?: string | null | undefined;
  voiceNotesCount?: number;
  userId?: string;
  isDarkMode?: boolean;
}

export function VoiceRecorder({
  visible,
  onClose,
  onSaveSuccess,
  userId,
}: VoiceRecorderProps) {
  return (
    <VoiceNoteRecorderModal
      visible={visible}
      onClose={onClose}
      onSaveSuccess={onSaveSuccess}
      userId={userId}
      supabase={supabase}
    />
  );
}

export default VoiceRecorder;
