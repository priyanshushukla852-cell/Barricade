import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';

export function ReconnectingOverlay() {
  const reconnecting = useGameStore((s) => s.reconnecting);
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!reconnecting) {
      setSecondsLeft(60);
      return;
    }
    setSecondsLeft(60);
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [reconnecting]);

  if (!reconnecting) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>Connection lost</Text>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={styles.subtitle}>Reconnecting… {secondsLeft}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#FFFFFF', fontSize: 16 },
});
