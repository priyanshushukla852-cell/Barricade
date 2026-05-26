import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { socket } from '../../lib/socketClient';
import { emit } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import type { GameState, TimerOption } from '@shared/types';

const TIMER_OPTIONS: TimerOption[] = [1, 2, 3, 5];

export default function LobbyScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode?: string }>();
  const code = roomCode ?? '';

  const userId = useAuthStore((s) => s.userId) ?? '';
  const nickname = useAuthStore((s) => s.nickname) ?? '';

  const [timerConfig, setTimerConfig] = useState<TimerOption>(2);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    // Tell the server which socket belongs to this player so broadcasts reach us.
    emit('join_lobby', { roomCode: code, userId, nickname });

    function onLobbyReady() {
      setOpponentJoined(true);
    }

    function onGameState(_gs: GameState) {
      router.replace({ pathname: '/(game)/game', params: { mode: 'online', roomCode: code } });
    }

    socket.on('lobby_ready', onLobbyReady);
    socket.on('game_state', onGameState);

    return () => {
      socket.off('lobby_ready', onLobbyReady);
      socket.off('game_state', onGameState);
    };
  }, [code, userId, nickname]);

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStart() {
    emit('start_game', { roomCode: code, timerConfig });
  }

  function handleCancel() {
    emit('leave_game', { roomCode: code });
    router.replace('/(game)/home');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.label}>Room Code</Text>
        <Text style={styles.roomCode}>{code}</Text>

        <Pressable style={styles.copyBtn} onPress={handleCopy}>
          <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy Code'}</Text>
        </Pressable>

        {!opponentJoined ? (
          <View style={styles.waitingRow}>
            <ActivityIndicator color="#4A3728" />
            <Text style={styles.waitingText}>Waiting for opponent…</Text>
          </View>
        ) : (
          <Text style={styles.readyText}>Opponent joined!</Text>
        )}

        <Text style={styles.timerLabel}>Time per turn</Text>
        <View style={styles.timerRow}>
          {TIMER_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              style={[styles.timerBtn, timerConfig === opt && styles.timerBtnSelected]}
              onPress={() => setTimerConfig(opt)}
            >
              <Text
                style={[styles.timerBtnText, timerConfig === opt && styles.timerBtnTextSelected]}
              >
                {opt} min
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.btn, styles.btnPrimary, !opponentJoined && styles.btnDisabled]}
          onPress={handleStart}
          disabled={!opponentJoined}
        >
          <Text style={styles.btnPrimaryText}>Start Game</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnCancel]} onPress={handleCancel}>
          <Text style={styles.btnCancelText}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    alignItems: 'center',
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roomCode: {
    fontFamily: 'monospace',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: '#1A1A1A',
  },
  copyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D0C8B8',
  },
  copyText: { fontSize: 14, color: '#4A3728', fontWeight: '600' },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  waitingText: { fontSize: 15, color: '#888' },
  readyText: { fontSize: 15, color: '#22AA66', fontWeight: '600' },
  timerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  timerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#378ADD',
  },
  timerBtnSelected: { backgroundColor: '#378ADD' },
  timerBtnText: { fontSize: 14, fontWeight: '600', color: '#378ADD' },
  timerBtnTextSelected: { color: '#FFF' },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimary: { backgroundColor: '#4A3728' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnCancel: { borderWidth: 1.5, borderColor: '#D0C8B8' },
  btnCancelText: { fontSize: 16, color: '#888', fontWeight: '600' },
});
