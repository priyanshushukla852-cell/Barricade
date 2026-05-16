import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BoardComponent } from '../../components/board/BoardComponent';
import { TurnIndicator } from '../../components/ui/TurnIndicator';
import { TimerDisplay } from '../../components/ui/TimerDisplay';
import { WallHand } from '../../components/ui/WallHand';
import { OfflineBanner } from '../../components/ui/OfflineBanner';
import { ReconnectingOverlay } from '../../components/ui/ReconnectingOverlay';
import { useGame } from '../../hooks/useGame';
import { useGameStore } from '../../store/gameStore';
import type { Direction, Edge, Position } from '@shared/types';

export default function GameScreen() {
  const { mode, roomCode } = useLocalSearchParams<{ mode?: string; roomCode?: string }>();
  const isOnline = mode === 'online';

  const gameState = useGameStore((s) => s.gameState);
  const setRoomCode = useGameStore((s) => s.setRoomCode);
  const setBoardOrigin = useGameStore((s) => s.setBoardOrigin);

  const [boardFlashError, setBoardFlashError] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSocketError() {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setBoardFlashError(true);
    flashTimeoutRef.current = setTimeout(() => setBoardFlashError(false), 300);
  }

  const game = useGame({ online: isOnline, onSocketError: handleSocketError });
  const boardRef = useRef<View>(null);

  useEffect(() => {
    if (roomCode) setRoomCode(roomCode);
    return () => setRoomCode(null);
  }, [roomCode, setRoomCode]);

  useEffect(() => {
    if (!isOnline && gameState?.phase === 'game_over' && gameState.winner) {
      router.replace({
        pathname: '/(game)/result',
        params: { winner: gameState.winner, reason: 'reached_goal' },
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
      <View style={styles.header}>
        <TurnIndicator />
        {isOnline && <TimerDisplay />}
      </View>

      {gameState === null ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4A3728" />
        </View>
      ) : (
        <View ref={boardRef} onLayout={measureBoard} style={styles.boardWrapper}>
          <BoardComponent onSquarePress={handleSquarePress} flashError={boardFlashError} />
        </View>
      )}

      <View style={styles.footer}>
        <WallHand onWallDragStart={game.onStartWallDrag} onWallDrop={handleWallDrop} />
      </View>

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
  boardWrapper: { alignSelf: 'center', marginHorizontal: 16 },
  footer: { paddingVertical: 16 },
});
