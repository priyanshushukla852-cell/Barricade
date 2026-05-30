import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BoardComponent } from '../../components/board/BoardComponent';
import { TurnIndicator } from '../../components/ui/TurnIndicator';
import { PlayerTimer } from '../../components/ui/TimerDisplay';
import { WallHand } from '../../components/ui/WallHand';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ReconnectingOverlay } from '../../components/ui/ReconnectingOverlay';
import { useGame } from '../../hooks/useGame';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { emit } from '../../hooks/useSocket';
import { socket } from '../../lib/socketClient';
import { applyMove, applyWall, checkWinner, getComputerMove } from '@shared/game';
import type { AiDifficulty } from '@shared/game';
import type { Direction, Edge, PieceColor, Position } from '@shared/types';

export default function GameScreen() {
  const { mode, roomCode, difficulty: rawDifficulty } = useLocalSearchParams<{
    mode?: string;
    roomCode?: string;
    difficulty?: string;
  }>();
  const isOnline = mode === 'online';
  const isComputer = mode === 'computer';
  const difficulty: AiDifficulty = rawDifficulty === 'hard' ? 'hard' : 'easy';

  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setBoardOrigin = useGameStore((s) => s.setBoardOrigin);

  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);

  // Which player's clock sits at the bottom (nearest the player) vs the top.
  // Local game: Blue at bottom (row 8), Red at top rotated 180° so they can read it.
  // Online: my color at bottom, opponent at top.
  const isLocal = !isOnline;
  const showTimer = isOnline || (gameState !== null && gameState.timerConfig !== 0);
  const bottomColor: PieceColor = isLocal ? 'blue' : (playerColor ?? 'blue');
  const topColor: PieceColor = bottomColor === 'red' ? 'blue' : 'red';

  const [boardFlashError, setBoardFlashError] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSocketError() {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setBoardFlashError(true);
    flashTimeoutRef.current = setTimeout(() => setBoardFlashError(false), 300);
  }

  const game = useGame({ online: isOnline, computer: isComputer, onSocketError: handleSocketError });
  const boardRef = useRef<View>(null);

  useEffect(() => {
    if (roomCode) setRoomCode(roomCode);
    return () => setRoomCode(null);
  }, [roomCode, setRoomCode]);

  // For online games, register this socket with the server room so broadcasts reach us.
  // Re-emit join_lobby on every reconnect so the server clears the disconnect timer
  // and the opponent's "connection lost" overlay disappears.
  useEffect(() => {
    if (!isOnline || !roomCode || !userId || !nickname) return;

    function onConnect() {
      emit('join_lobby', { roomCode: roomCode!, userId: userId!, nickname: nickname! });
    }

    socket.on('connect', onConnect);

    if (socket.connected) {
      emit('join_lobby', { roomCode, userId, nickname });
    } else {
      socket.connect();
      // join_lobby will fire via the connect event above
    }

    return () => {
      socket.off('connect', onConnect);
    };
  }, [isOnline, roomCode, userId, nickname]);

  // Client-side chess clock for local games.
  useEffect(() => {
    if (isOnline) return;
    const id = setInterval(() => {
      const state = useGameStore.getState().gameState;
      if (!state || state.phase !== 'choosing' || state.timerConfig === 0) return;
      const active = state.currentTurn;
      const remaining = active === 'red' ? state.redTimeRemaining : state.blueTimeRemaining;
      const next = Math.max(0, remaining - 1);
      if (next === 0) {
        const winner: PieceColor = active === 'red' ? 'blue' : 'red';
        useGameStore.getState().setGameState({ ...state, winner, phase: 'game_over' });
      } else {
        useGameStore.getState().setGameState(
          active === 'red'
            ? { ...state, redTimeRemaining: next }
            : { ...state, blueTimeRemaining: next },
        );
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isOnline]);

  // Fire the computer's move when it's the computer's turn.
  useEffect(() => {
    if (!isComputer) return;
    if (!gameState || gameState.phase !== 'choosing') return;
    if (!playerColor || gameState.currentTurn === playerColor) return;

    const delay = difficulty === 'hard'
      ? 900 + Math.random() * 700   // 900–1600 ms: feels like it's thinking hard
      : 400 + Math.random() * 400;  // 400–800 ms: quicker, casual feel
    const id = setTimeout(() => {
      const state = useGameStore.getState().gameState;
      if (!state || state.phase !== 'choosing') return;
      if (!playerColor || state.currentTurn === playerColor) return;

      const action = getComputerMove(state, difficulty);
      if (action.type === 'move') {
        try {
          const next = applyMove(state, action.direction);
          const winner = checkWinner(next);
          useGameStore.getState().setGameState(winner ? { ...next, winner, phase: 'game_over' } : next);
        } catch {}
      } else {
        try {
          const next = applyWall(state, action.edge);
          useGameStore.getState().setGameState(next);
        } catch {}
      }
    }, delay);

    return () => clearTimeout(id);
  }, [isComputer, gameState?.currentTurn, gameState?.phase, playerColor, difficulty]);

  useEffect(() => {
    if (!isOnline && gameState?.phase === 'game_over' && gameState.winner) {
      const timedOut =
        gameState.timerConfig !== 0 &&
        (gameState.winner === 'blue'
          ? gameState.redTimeRemaining === 0
          : gameState.blueTimeRemaining === 0);
      router.replace({
        pathname: '/(game)/result',
        params: {
          winner: gameState.winner,
          reason: timedOut ? 'timeout' : 'reached_goal',
          mode,
          difficulty: rawDifficulty ?? 'easy',
          timerConfig: String(gameState.timerConfig),
        },
      });
    }
  }, [isOnline, gameState?.phase, gameState?.winner]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const measureBoard = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardOrigin({ x, y });
    });
  }, [setBoardOrigin]);

  function handleSquarePress(position: Position, dir?: Direction) {
    if (dir !== undefined) {
      game.onConfirmMove(dir);
    } else {
      game.onSelectPiece();
    }
  }

  function handleWallDrop(edge: Edge) {
    game.onConfirmWall(edge);
  }

  return (
    <SafeAreaView style={styles.screen}>
      {showTimer && <PlayerTimer color={topColor} flipped={isLocal} />}

      <View style={styles.header}>
        <TurnIndicator />
      </View>

      {gameState === null ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4A3728" />
        </View>
      ) : (
        <View style={styles.boardContainer}>
          <View ref={boardRef} onLayout={measureBoard}>
            <BoardComponent onSquarePress={handleSquarePress} flashError={boardFlashError} />
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.wallCounter}>
          <View style={[styles.counterDot, { backgroundColor: '#E24B4A' }]} />
          <Text style={styles.counterText}>{gameState?.redWallsRemaining ?? 10}</Text>
        </View>
        <WallHand onWallDragStart={game.onStartWallDrag} onWallDrop={handleWallDrop} computer={isComputer} />
        <View style={styles.wallCounter}>
          <View style={[styles.counterDot, { backgroundColor: '#378ADD' }]} />
          <Text style={styles.counterText}>{gameState?.blueWallsRemaining ?? 10}</Text>
        </View>
      </View>

      {showTimer && <PlayerTimer color={bottomColor} />}

      <ReconnectingOverlay />
      <OfflineBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  boardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  wallCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 48,
  },
  counterDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
});
