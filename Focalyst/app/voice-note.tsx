import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUser } from '../src/utils/UserContext';
import {
  hasPendingVoiceNoteIntent,
  setPendingVoiceNoteIntent,
} from '../src/services/voiceNoteIntent';

export default function VoiceNoteDeepLinkRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!hasPendingVoiceNoteIntent()) {
      if (params?.action === 'open') {
        setPendingVoiceNoteIntent('open', 'route:open');
      } else if (params?.action === 'start' || params?.action === 'record-voice') {
        setPendingVoiceNoteIntent('start', `route:${params.action}`);
      }
    }
  }, [params?.action]);

  useEffect(() => {
    if (loading) return;
    if (user?.id) {
      router.replace('/(tabs)/notes' as any);
    } else {
      router.replace('/auth' as any);
    }
  }, [loading, router, user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: '#090d16', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}
