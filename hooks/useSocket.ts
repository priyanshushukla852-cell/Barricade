import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { socket } from '../lib/socketClient';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import type { ClientToServerEvents, GameState, PieceColor } from '@shared/types';

export function useSocket({
  enabled = true,
  onSocketError,
}: {
  enabled?: boolean;
  onSocketError?: () => void;
} = {}): void {
  const setGameState = useGameStore((s) => s.setGameState);
  const setReconnecting = useGameStore((s) => s.setReconnecting);
  const router = useRouter();

  // Keep callback ref fresh so the effect never needs to re-register on callback changes.
  const onSocketErrorRef = useRef(onSocketError);
  onSocketErrorRef.current = onSocketError;

  useEffect(() => {
    if (!enabled) return;

    if (!socket.connected) socket.connect();

    function onGameState(gs: GameState) {
      setGameState(gs);
    }

    function onTimerTick({ redTimeRemaining, blueTimeRemaining }: { redTimeRemaining: number; blueTimeRemaining: number }) {
      const current = useGameStore.getState().gameState;
      if (!current) return;
      setGameState({ ...current, redTimeRemaining, blueTimeRemaining });
    }

    function onGameOver({
      winner,
      reason,
      ratingChange,
    }: {
      winner: PieceColor;
      reason: 'reached_goal' | 'timeout' | 'opponent_left';
      ratingChange?: { before: number; after: number; delta: number };
    }) {
      const current = useGameStore.getState().gameState;
      if (current) setGameState({ ...current, winner, phase: 'game_over' });
      if (ratingChange) useAuthStore.getState().setRating(ratingChange.after);
      router.replace({
        pathname: '/(game)/result',
        params: {
          winner,
          reason,
          ratingBefore: ratingChange ? String(ratingChange.before) : undefined,
          ratingAfter: ratingChange ? String(ratingChange.after) : undefined,
          ratingDelta: ratingChange ? String(ratingChange.delta) : undefined,
        },
      });
    }

    function onOpponentLeft({ reconnecting }: { reconnecting: boolean }) {
      setReconnecting(reconnecting);
    }

    function onError({ message }: { message: string }) {
      console.warn(message);
      onSocketErrorRef.current?.();
    }

    socket.on('game_state', onGameState);
    socket.on('timer_tick', onTimerTick);
    socket.on('game_over', onGameOver);
    socket.on('opponent_left', onOpponentLeft);
    socket.on('error', onError);

    return () => {
      socket.off('game_state', onGameState);
      socket.off('timer_tick', onTimerTick);
      socket.off('game_over', onGameOver);
      socket.off('opponent_left', onOpponentLeft);
      socket.off('error', onError);
    };
  }, [enabled, setGameState, setReconnecting, router]);
}

// Standalone emit used by other hooks — do not call socket.emit directly in components.
export function emit<E extends keyof ClientToServerEvents>(
  event: E,
  ...args: Parameters<ClientToServerEvents[E]>
): void {
  socket.emit(event, ...args);
}
