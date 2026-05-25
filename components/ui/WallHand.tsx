import { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { useGame } from '../../hooks/useGame';
import { normalizeEdge } from '@shared/game';
import { CELL_SIZE } from '../board/SquareComponent';
import type { Edge } from '@shared/types';

type Orientation = 'vertical' | 'horizontal';

type Props = {
  onWallDragStart: () => void;
  onWallDrop: (edge: Edge) => void;
};

function snapToEdge(
  absX: number,
  absY: number,
  origin: { x: number; y: number },
  orientation: Orientation,
): Edge | null {
  const relX = absX - origin.x;
  const relY = absY - origin.y;
  const boardPx = CELL_SIZE * 9;

  if (relX < 0 || relX > boardPx || relY < 0 || relY > boardPx) return null;

  const fractCol = relX / CELL_SIZE;
  const fractRow = relY / CELL_SIZE;
  const nearestCol = Math.round(fractCol);
  const nearestRow = Math.round(fractRow);

  if (orientation === 'vertical') {
    const row = Math.min(8, Math.max(0, Math.floor(fractRow)));
    if (nearestCol >= 1 && nearestCol <= 8) {
      return normalizeEdge({ from: { row, col: nearestCol - 1 }, to: { row, col: nearestCol } });
    }
  } else {
    const col = Math.min(8, Math.max(0, Math.floor(fractCol)));
    if (nearestRow >= 1 && nearestRow <= 8) {
      return normalizeEdge({ from: { row: nearestRow - 1, col }, to: { row: nearestRow, col } });
    }
  }
  return null;
}

function WallToken({
  orientation,
  canDragRef,
  onDragStart,
  onDrop,
  onDragMove,
  dragging,
  disabled,
}: {
  orientation: Orientation;
  canDragRef: { current: boolean };
  onDragStart: () => void;
  onDrop: (edge: Edge) => void;
  onDragMove: (edge: Edge) => void;
  dragging: boolean;
  disabled: boolean;
}) {
  const startRef = useRef(onDragStart);
  const dropRef = useRef(onDrop);
  const moveRef = useRef(onDragMove);
  startRef.current = onDragStart;
  dropRef.current = onDrop;
  moveRef.current = onDragMove;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canDragRef.current,
      onPanResponderGrant: () => startRef.current(),
      onPanResponderMove: (_, { moveX, moveY }) => {
        const origin = useGameStore.getState().boardOrigin;
        if (!origin) return;
        const edge = snapToEdge(moveX, moveY, origin, orientation);
        if (edge) moveRef.current(edge);
      },
      onPanResponderRelease: (_, { moveX, moveY }) => {
        const origin = useGameStore.getState().boardOrigin;
        if (!origin) return;
        const edge = snapToEdge(moveX, moveY, origin, orientation);
        if (edge) {
          dropRef.current(edge);
        } else {
          useGameStore.getState().clearSelection();
        }
      },
      onPanResponderTerminate: () => {
        useGameStore.getState().clearSelection();
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[styles.token, disabled && styles.tokenDisabled, dragging && styles.tokenDragging]}
    >
      <Text style={styles.tokenIcon}>{orientation === 'vertical' ? '│' : '━'}</Text>
    </View>
  );
}

export function WallHand({ onWallDragStart, onWallDrop }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const draggingWall = useGameStore((s) => s.draggingWall);

  const game = useGame();

  const startRef = useRef(onWallDragStart);
  const dropRef = useRef(onWallDrop);
  const gameRef = useRef(game);
  startRef.current = onWallDragStart;
  dropRef.current = onWallDrop;
  gameRef.current = game;

  const wallsRemaining = gameState
    ? playerColor === 'red'
      ? gameState.redWallsRemaining
      : gameState.blueWallsRemaining
    : 0;

  const canDragRef = useRef(false);
  canDragRef.current = gameRef.current.isMyTurn() && wallsRemaining > 0;

  const disabled = wallsRemaining === 0 || !game.isMyTurn();

  return (
    <View style={styles.container}>
      <View style={styles.tokens}>
        <WallToken
          orientation="vertical"
          canDragRef={canDragRef}
          onDragStart={() => startRef.current()}
          onDrop={(e) => dropRef.current(e)}
          onDragMove={(e) => gameRef.current.onWallDragMove(e)}
          dragging={draggingWall}
          disabled={disabled}
        />
        <WallToken
          orientation="horizontal"
          canDragRef={canDragRef}
          onDragStart={() => startRef.current()}
          onDrop={(e) => dropRef.current(e)}
          onDragMove={(e) => gameRef.current.onWallDragMove(e)}
          dragging={draggingWall}
          disabled={disabled}
        />
      </View>
      <Text style={[styles.count, disabled && styles.countDisabled]}>
        {wallsRemaining} wall{wallsRemaining !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  tokens: { flexDirection: 'row', gap: 8 },
  token: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenDisabled: { backgroundColor: '#CCBBAA', opacity: 0.5 },
  tokenDragging: { opacity: 0.4 },
  tokenIcon: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  count: { fontSize: 15, fontWeight: '600', color: '#333333' },
  countDisabled: { color: '#AAAAAA' },
});
