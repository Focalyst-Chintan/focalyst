import { Stack } from 'expo-router';

export default function BlockingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
