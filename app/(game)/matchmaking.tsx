import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { socket } from '../../lib/socketClient';
import { emit } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import type { MatchedPayload } from '@shared/types';

const TIMEOUT_SECONDS = 30;

export default function MatchmakingScreen() {
  const userId = useAuthStore((s) => s.userId) ?? '';
  const nickname = useAuthStore((s) => s.nickname) ?? '';
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);
  const setGameState = useGameStore((s) => s.setGameState);
  const clearSelection = useGameStore((s) => s.clearSelection);

  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startSearching() {
    setElapsed(0);
    setTimedOut(false);
    if (!socket.connected) socket.connect();
    emit('join_queue', { userId, nickname });
  }

  useEffect(() => {
    startSearching();

    function onMatched({ roomCode, playerColor }: MatchedPayload) {
      setGameState(null);
      setPlayerColor(playerColor);
      clearSelection();
      router.replace({
        pathname: '/(game)/lobby',
        params: { roomCode, autoStart: 'true' },
      });
    }

    socket.on('matched', onMatched);
    return () => {
      socket.off('matched', onMatched);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elapsed-time ticker and 30s timeout.
  useEffect(() => {
    if (timedOut) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= TIMEOUT_SECONDS) {
          emit('leave_queue', { userId });
          setTimedOut(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timedOut, userId]);

  function handleCancel() {
    emit('leave_queue', { userId });
    router.replace('/(game)/home');
  }

  function handleRetry() {
    startSearching();
  }

  if (timedOut) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.title}>No opponent found</Text>
          <Text style={styles.subtitle}>Nobody joined the queue in time.</Text>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleRetry}>
            <Text style={styles.btnPrimaryText}>Try Again</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnCancel]} onPress={() => router.replace('/(game)/home')}>
            <Text style={styles.btnCancelText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#4A3728" />
        <Text style={styles.title}>Finding opponent…</Text>
        <Text style={styles.timer}>{elapsed}s</Text>
        <Text style={styles.hint}>Up to {TIMEOUT_SECONDS} seconds</Text>
        <Pressable style={[styles.btn, styles.btnCancel]} onPress={handleCancel}>
          <Text style={styles.btnCancelText}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2', paddingTop: 20, paddingBottom: 20 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  timer: {
    fontSize: 36,
    fontWeight: '900',
    color: '#4A3728',
    letterSpacing: 2,
  },
  hint: {
    fontSize: 13,
    color: '#AAA',
  },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnPrimary: { backgroundColor: '#4A3728' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnCancel: { borderWidth: 1.5, borderColor: '#D0C8B8' },
  btnCancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
});
