import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function SplashScreen() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) {
        router.replace('/(game)/home');
      } else {
        router.replace('/(auth)/auth');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>BARRICADE</Text>
      <ActivityIndicator size="large" color="#4A3728" style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#1A1A1A',
  },
  indicator: {},
});
