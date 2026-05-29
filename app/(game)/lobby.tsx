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
import { useGameStore } from '../../store/gameStore';
import type { GameState, TimerOption } from '@shared/types';

const TIMER_OPTIONS: TimerOption[] = [1, 2, 3, 5];

export default function LobbyScreen() {
  const { roomCode, autoStart } = useLocalSearchParams<{ roomCode?: string; autoStart?: string }>();
  const code = roomCode ?? '';
  const isAutoStart = autoStart === 'true';

  const userId = useAuthStore((s) => s.userId) ?? '';
  const nickname = useAuthStore((s) => s.nickname) ?? '';
  const playerColor = useGameStore((s) => s.playerColor);

  // Host = red player in a manually created room
  const isHost = !isAutoStart && playerColor === 'red';

  const [timerConfig, setTimerConfig] = useState<TimerOption>(2);
  const [rated, setRatedState] = useState(true);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    emit('join_lobby', { roomCode: code, userId, nickname });

    function onLobbyReady() {
      setOpponentJoined(true);
    }

    function onLobbyInfo({ rated: r }: { rated: boolean }) {
      setRatedState(r);
    }

    function onGameState(_gs: GameState) {
      router.replace({ pathname: '/(game)/game', params: { mode: 'online', roomCode: code } });
    }

    socket.on('lobby_ready', onLobbyReady);
    socket.on('lobby_info', onLobbyInfo);
    socket.on('game_state', onGameState);

    return () => {
      socket.off('lobby_ready', onLobbyReady);
      socket.off('lobby_info', onLobbyInfo);
      socket.off('game_state', onGameState);
    };
  }, [code, userId, nickname]);

  function handleRatedToggle(value: boolean) {
    setRatedState(value);
    emit('update_lobby', { roomCode: code, rated: value });
  }

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

  // ── Auto-start (random match) UI ────────────────────────────────────────────
  if (isAutoStart) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.matchedLabel}>Opponent found!</Text>

          {!opponentJoined ? (
            <View style={styles.waitingRow}>
              <ActivityIndicator color="#4A3728" />
              <Text style={styles.waitingText}>Connecting…</Text>
            </View>
          ) : (
            <View style={styles.waitingRow}>
              <ActivityIndicator color="#22AA66" />
              <Text style={styles.readyText}>Starting game…</Text>
            </View>
          )}

          <Pressable style={[styles.btn, styles.btnCancel, { marginTop: 32 }]} onPress={handleCancel}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Host lobby UI ────────────────────────────────────────────────────────────
  if (isHost) {
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

          {/* Rated/Unrated toggle */}
          <Text style={styles.sectionLabel}>Match type</Text>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, rated && styles.toggleBtnSelected]}
              onPress={() => handleRatedToggle(true)}
            >
              <Text style={[styles.toggleBtnText, rated && styles.toggleBtnTextSelected]}>
                Rated
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, !rated && styles.toggleBtnSelected]}
              onPress={() => handleRatedToggle(false)}
            >
              <Text style={[styles.toggleBtnText, !rated && styles.toggleBtnTextSelected]}>
                Unrated
              </Text>
            </Pressable>
          </View>

          {/* Timer config */}
          <Text style={styles.sectionLabel}>Time per turn</Text>
          <View style={styles.timerRow}>
            {TIMER_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.timerBtn, timerConfig === opt && styles.timerBtnSelected]}
                onPress={() => setTimerConfig(opt)}
              >
                <Text style={[styles.timerBtnText, timerConfig === opt && styles.timerBtnTextSelected]}>
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

  // ── Joiner lobby UI ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.label}>Room Code</Text>
        <Text style={styles.roomCode}>{code}</Text>

        <View style={[styles.ratedBadge, rated ? styles.ratedBadgeOn : styles.ratedBadgeOff]}>
          <Text style={[styles.ratedBadgeText, rated ? styles.ratedBadgeTextOn : styles.ratedBadgeTextOff]}>
            {rated ? 'Rated' : 'Unrated'}
          </Text>
        </View>

        {!opponentJoined ? (
          <View style={styles.waitingRow}>
            <ActivityIndicator color="#4A3728" />
            <Text style={styles.waitingText}>Waiting for host to start…</Text>
          </View>
        ) : (
          <View style={styles.waitingRow}>
            <ActivityIndicator color="#22AA66" />
            <Text style={styles.readyText}>Host is setting up…</Text>
          </View>
        )}

        <Pressable style={[styles.btn, styles.btnCancel, { marginTop: 24 }]} onPress={handleCancel}>
          <Text style={styles.btnCancelText}>Leave</Text>
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
  matchedLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
    marginBottom: 8,
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

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-start',
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#378ADD',
  },
  toggleBtnSelected: { backgroundColor: '#378ADD' },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#378ADD' },
  toggleBtnTextSelected: { color: '#FFF' },

  timerRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-start',
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

  ratedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  ratedBadgeOn: { borderColor: '#22AA66', backgroundColor: '#F0FFF7' },
  ratedBadgeOff: { borderColor: '#999', backgroundColor: '#F5F5F5' },
  ratedBadgeText: { fontSize: 14, fontWeight: '700' },
  ratedBadgeTextOn: { color: '#22AA66' },
  ratedBadgeTextOff: { color: '#888' },

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
