import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { signOut } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { createInitialState } from '@shared/game';
import type { AiDifficulty } from '@shared/game';
import type { PieceColor, TimerOption } from '@shared/types';

const TIMER_OPTIONS: { value: TimerOption; label: string }[] = [
  { value: 0, label: '∞' },
  { value: 1, label: '1 min' },
  { value: 2, label: '2 min' },
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
];

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

type Sheet = 'local' | 'computer' | null;

export default function HomeScreen() {
  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);
  const setGameState = useGameStore((s) => s.setGameState);
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);
  const clearSelection = useGameStore((s) => s.clearSelection);

  // Sheet state
  const [sheet, setSheet] = useState<Sheet>(null);
  const [localTimer, setLocalTimer] = useState<TimerOption>(0);
  const [computerColor, setComputerColor] = useState<PieceColor>('blue');
  const [computerDifficulty, setComputerDifficulty] = useState<AiDifficulty>('easy');

  // Online state
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  function handleLocalGame() {
    setSheet(null);
    setPlayerColor(null);
    clearSelection();
    setGameState(createInitialState(localTimer));
    router.push({ pathname: '/(game)/game', params: { mode: 'local', roomCode: '' } });
  }

  function handleVsComputer() {
    setSheet(null);
    setPlayerColor(computerColor);
    clearSelection();
    setGameState(createInitialState(0));
    router.push({
      pathname: '/(game)/game',
      params: { mode: 'computer', difficulty: computerDifficulty },
    });
  }

  async function handleCreateRoom() {
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/lobby/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname }),
      });
      const data = (await res.json()) as { roomCode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to create room');
      setGameState(null);
      setPlayerColor('red');
      clearSelection();
      router.push({ pathname: '/(game)/lobby', params: { roomCode: data.roomCode } });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) {
      setJoinError('Enter a 6-character room code');
      return;
    }
    setJoinError('');
    setJoinLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nickname, roomCode: code }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to join room');
      setGameState(null);
      setPlayerColor('blue');
      clearSelection();
      router.push({ pathname: '/(game)/game', params: { mode: 'online', roomCode: code } });
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>BARRICADE</Text>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Single Player */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Single Player</Text>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setSheet('local')}>
            <Text style={styles.btnPrimaryText}>Local Game</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setSheet('computer')}>
            <Text style={styles.btnPrimaryText}>VS Computer</Text>
          </Pressable>
        </View>

        {/* Online */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Online Game</Text>

          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => router.push({ pathname: '/(game)/matchmaking' })}
          >
            <Text style={styles.btnPrimaryText}>Find Opponent</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnPrimary, createLoading && styles.btnDisabled]}
            onPress={handleCreateRoom}
            disabled={createLoading}
          >
            {createLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>Create Room</Text>
            )}
          </Pressable>
          {createError !== '' && <Text style={styles.error}>{createError}</Text>}

          <View style={styles.joinRow}>
            <TextInput
              style={styles.joinInput}
              placeholder="Room Code"
              placeholderTextColor="#AAA"
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase().slice(0, 6))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            <Pressable
              style={[styles.joinBtn, styles.btnSecondary, joinLoading && styles.btnDisabled]}
              onPress={handleJoinRoom}
              disabled={joinLoading}
            >
              {joinLoading ? (
                <ActivityIndicator color="#4A3728" />
              ) : (
                <Text style={styles.btnSecondaryText}>Join</Text>
              )}
            </Pressable>
          </View>
          {joinError !== '' && <Text style={styles.error}>{joinError}</Text>}
        </View>
      </View>

      {/* Setup Sheet */}
      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSheet(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            {sheet === 'local' && (
              <>
                <Text style={styles.sheetTitle}>Local Game</Text>
                <Text style={styles.sheetLabel}>Time per player</Text>
                <View style={styles.optionRow}>
                  {TIMER_OPTIONS.map(({ value, label }) => (
                    <Pressable
                      key={value}
                      style={[styles.chip, localTimer === value && styles.chipSelected]}
                      onPress={() => setLocalTimer(value)}
                    >
                      <Text style={[styles.chipText, localTimer === value && styles.chipTextSelected]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={[styles.btn, styles.btnPrimary, styles.sheetBtn]} onPress={handleLocalGame}>
                  <Text style={styles.btnPrimaryText}>Start Game</Text>
                </Pressable>
              </>
            )}

            {sheet === 'computer' && (
              <>
                <Text style={styles.sheetTitle}>VS Computer</Text>

                <Text style={styles.sheetLabel}>Play as</Text>
                <View style={styles.optionRow}>
                  {(['red', 'blue'] as PieceColor[]).map((c) => (
                    <Pressable
                      key={c}
                      style={[
                        styles.chip,
                        { borderColor: c === 'red' ? '#E24B4A' : '#378ADD' },
                        computerColor === c && { backgroundColor: c === 'red' ? '#E24B4A' : '#378ADD' },
                      ]}
                      onPress={() => setComputerColor(c)}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: c === 'red' ? '#E24B4A' : '#378ADD' },
                        computerColor === c && styles.chipTextSelected,
                      ]}>
                        {c === 'red' ? 'Red' : 'Blue'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.sheetLabel}>Difficulty</Text>
                <View style={styles.optionRow}>
                  {(['easy', 'hard'] as AiDifficulty[]).map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.chip, computerDifficulty === d && styles.chipSelected]}
                      onPress={() => setComputerDifficulty(d)}
                    >
                      <Text style={[styles.chipText, computerDifficulty === d && styles.chipTextSelected]}>
                        {d === 'easy' ? 'Easy' : 'Hard'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable style={[styles.btn, styles.btnPrimary, styles.sheetBtn]} onPress={handleVsComputer}>
                  <Text style={styles.btnPrimaryText}>Start Game</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#1A1A1A',
  },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  signOutText: { fontSize: 14, color: '#888', fontWeight: '600' },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 32,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  btn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimary: { backgroundColor: '#4A3728' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderWidth: 1.5, borderColor: '#4A3728' },
  btnSecondaryText: { color: '#4A3728', fontSize: 15, fontWeight: '600' },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  joinInput: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#D0C8B8',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF',
    letterSpacing: 2,
  },
  joinBtn: {
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#EE2222', fontSize: 13, textAlign: 'center' },

  // Modal sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0C8B8',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#378ADD',
  },
  chipSelected: { backgroundColor: '#378ADD' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#378ADD' },
  chipTextSelected: { color: '#FFF' },
  sheetBtn: { marginTop: 8 },
});
