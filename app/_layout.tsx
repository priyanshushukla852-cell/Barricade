import { Stack } from 'expo-router';
import '../hooks/useAuth'; // registers onAuthStateChanged so hydrated flag is set on every launch
import '../lib/sentry';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(game)" />
    </Stack>
  );
}
