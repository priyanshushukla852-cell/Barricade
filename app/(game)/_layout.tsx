import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function GameLayout() {
  const token = useAuthStore((s) => s.token);

  if (!token) return <Redirect href="/(auth)/auth" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
