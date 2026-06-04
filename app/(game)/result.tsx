import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { socket } from '../../lib/socketClient';
import { emit } from '../../hooks/useSocket';
import { useGameStore } from '../../store/gameStore';
import { createInitialState } from '@shared/game';
import type { PieceColor, TimerOption } from '@shared/types';

const PIECE_COLORS: Record<PieceColor, string> = {
  red: '#E24B4A',
  blue: '#378ADD',
};

type RematchState = 'idle' | 'waiting' | 'opponent_wants' | 'starting' | 'expired';

export default function ResultScreen() {
  const {
    winner,
    reason,
    mode,
    roomCode,
    timerConfig: timerConfigParam,
    difficulty,
    ratingBefore,
    ratingAfter,
    ratingDelta,
  } = useLocalSearchParams<{
    winner?: string;
    reason?: string;
    mode?: string;
    roomCode?: string;
    timerConfig?: string;
    difficulty?: string;
    ratingBefore?: string;
    ratingAfter?: string;
    ratingDelta?: string;
  }>();

  const playerColor = useGameStore((s) => s.playerColor);
  const setPlayerColor = useGameStore((s) => s.setPlayerColor);
  const setGameState = useGameStore((s) => s.setGameState);
  const clearSelection = useGameStore((s) => s.clearSelection);

  const [rematchState, setRematchState] = useState<RematchState>('idle');
  const rematchStateRef = useRef(rematchState);
  rematchStateRef.current = rematchState;

  const isOnline = mode === 'online';
  const isComputer = mode === 'computer';
  const isLocal = mode === 'local';

  const timerConfig = timerConfigParam ? (parseInt(timerConfigParam, 10) as TimerOption) : 0;

  const isValidColor = winner === 'red' || winner === 'blue';
  const color = isValidColor ? PIECE_COLORS[winner as PieceColor] : '#1A1A1A';
  const label = winner ? winner.toUpperCase() : '?';

  const before = ratingBefore ? parseInt(ratingBefore, 10) : null;
  const after = ratingAfter ? parseInt(ratingAfter, 10) : null;
  const delta = ratingDelta ? parseInt(ratingDelta, 10) : null;

  // Online rematch socket listeners
  useEffect(() => {
    if (!isOnline) return;

    function onRematchRequested() {
      if (rematchStateRef.current === 'idle') {
        setRematchState('opponent_wants');
      }
    }

    function onRematchStarted({ playerColor: newColor }: { playerColor: PieceColor }) {
      setRematchState('starting');
      setPlayerColor(newColor);
      router.replace({
        pathname: '/(game)/game',
        params: { mode: 'online', roomCode: roomCode ?? '' },
      });
    }

    function onRematchExpired() {
      setRematchState('expired');
    }

    socket.on('rematch_requested', onRematchRequested);
    socket.on('rematch_started', onRematchStarted);
    socket.on('rematch_expired', onRematchExpired);

    return () => {
      socket.off('rematch_requested', onRematchRequested);
      socket.off('rematch_started', onRematchStarted);
      socket.off('rematch_expired', onRematchExpired);
    };
  }, [isOnline, roomCode, setPlayerColor]);

  function getSubtitle() {
    if (!reason) return '';
    if (reason === 'reached_goal') return "Reached the opponent's home!";
    if (reason === 'opponent_left') return 'Opponent left the game.';
    if (reason === 'timeout') {
      if (!playerColor) {
        const loser = winner === 'red' ? 'blue' : 'red';
        return `${loser.charAt(0).toUpperCase() + loser.slice(1)} ran out of time!`;
      }
      return playerColor === winner ? 'Opponent ran out of time!' : 'You ran out of time!';
    }
    return '';
  }

  function handleRematch() {
    if (isOnline) {
      if (rematchState !== 'idle' && rematchState !== 'opponent_wants') return;
      emit('request_rematch', { roomCode: roomCode ?? '' });
      setRematchState('waiting');
      return;
    }

    // Local / computer: instant restart
    const newTimerConfig: TimerOption = timerConfig;
    const newColor: PieceColor | null = isComputer
      ? (playerColor === 'red' ? 'blue' : 'red')
      : null;

    clearSelection();
    setGameState(createInitialState(newTimerConfig));
    setPlayerColor(newColor);

    if (isComputer) {
      router.replace({
        pathname: '/(game)/game',
        params: { mode: 'computer', difficulty: difficulty ?? 'easy' },
      });
    } else {
      router.replace({ pathname: '/(game)/game', params: { mode: 'local' } });
    }
  }

  function rematchButtonLabel(): string {
    if (!isOnline) return 'Rematch';
    switch (rematchState) {
      case 'idle': return 'Rematch';
      case 'opponent_wants': return 'Accept Rematch';
      case 'waiting': return 'Waiting for opponent…';
      case 'starting': return 'Starting…';
      case 'expired': return 'Rematch Expired';
    }
  }

  const rematchDisabled = rematchState === 'waiting' || rematchState === 'starting' || rematchState === 'expired';
  const rematchHighlighted = rematchState === 'opponent_wants';

  const subtitle = getSubtitle();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={[styles.winner, { color }]}>{label} WINS!</Text>
        {subtitle !== '' && <Text style={styles.subtitle}>{subtitle}</Text>}

        {before !== null && after !== null && delta !== null && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{before}</Text>
            <Text style={styles.ratingArrow}> → </Text>
            <Text style={styles.ratingText}>{after}</Text>
            <Text style={[styles.ratingDelta, delta >= 0 ? styles.ratingGain : styles.ratingLoss]}>
              {delta >= 0 ? ` (+${delta})` : ` (${delta})`}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.btn,
              styles.btnPrimary,
              rematchHighlighted && styles.btnHighlighted,
              rematchDisabled && styles.btnDisabled,
            ]}
            onPress={handleRematch}
            disabled={rematchDisabled}
          >
            <Text style={styles.btnPrimaryText}>{rematchButtonLabel()}</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => router.replace('/(game)/home')}
          >
            <Text style={styles.btnSecondaryText}>Home</Text>
          </Pressable>
        </View>
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
    gap: 16,
  },
  winner: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ratingText: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  ratingArrow: { fontSize: 18, color: '#999' },
  ratingDelta: { fontSize: 18, fontWeight: '700' },
  ratingGain: { color: '#22AA66' },
  ratingLoss: { color: '#EE2222' },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#4A3728' },
  btnHighlighted: { backgroundColor: '#22AA66' },
  btnDisabled: { opacity: 0.45 },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderWidth: 1.5, borderColor: '#4A3728' },
  btnSecondaryText: { color: '#4A3728', fontSize: 16, fontWeight: '600' },
});
