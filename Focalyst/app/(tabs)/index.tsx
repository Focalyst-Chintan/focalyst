import { useEffect } from 'react';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';

export default function TabIndexRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();

  useEffect(() => {
    if (params?.view === 'countdown') {
      router.navigate('/(tabs)/focus?section=countdown');
    }
  }, [params?.view, router]);

  if (params?.view === 'countdown') {
    return null;
  }

  // Only known views are forwarded; anything else lands on the plain Plan tab.
  return <Redirect href={params?.view === 'calendar' ? '/(tabs)/plan?view=calendar' : '/(tabs)/plan'} />;
}
