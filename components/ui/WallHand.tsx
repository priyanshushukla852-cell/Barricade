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
  computer?: boolean;
};

function snapToEdge(
  absX: number,
  absY: number,
  origin: { x: number; y: number },
  orientation: Orientation,
  flipped: boolean,
): Edge | null {
  const relX = absX - origin.x;
  const relY = absY - origin.y;
  const boardPx = CELL_SIZE * 9;

  if (relX < 0 || relX > boardPx || relY < 0 || relY > boardPx) return null;

  // When the board is flipped (Red player), y=0 at the top corresponds to data row 8.
  const adjustedRelY = flipped ? boardPx - relY : relY;

  const fractCol = relX / CELL_SIZE;
  const fractRow = adjustedRelY / CELL_SIZE;
  const nearestCol = Math.round(fractCol);
  const nearestRow = Math.round(fractRow);

  if (orientation === 'vertical') {
    // Row capped at 7: companion edge needs row+1 ≤ 8.
    const row = Math.min(7, Math.max(0, Math.floor(fractRow)));
    if (nearestCol >= 1 && nearestCol <= 8) {
      return normalizeEdge({ from: { row, col: nearestCol - 1 }, to: { row, col: nearestCol } });
    }
  } else {
    // Col capped at 7: companion edge needs col+1 ≤ 8.
    const col = Math.min(7, Math.max(0, Math.floor(fractCol)));
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
        const { boardOrigin, playerColor } = useGameStore.getState();
        if (!boardOrigin) return;
        const edge = snapToEdge(moveX, moveY, boardOrigin, orientation, playerColor === 'red');
        if (edge) moveRef.current(edge);
      },
      onPanResponderRelease: (_, { moveX, moveY }) => {
        const { boardOrigin, playerColor, wallPreview, wallPreviewValid } = useGameStore.getState();
        if (!boardOrigin) return;
        // Prefer the last valid preview edge — avoids snap drift between the last
        // move event and the release event causing the placement to land on a
        // different (invalid) edge from the one shown in green.
        if (wallPreview && wallPreviewValid) {
          dropRef.current(wallPreview);
          return;
        }
        const edge = snapToEdge(moveX, moveY, boardOrigin, orientation, playerColor === 'red');
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
      style={[
        styles.token,
        orientation === 'vertical' ? styles.tokenVertical : styles.tokenHorizontal,
        disabled && styles.tokenDisabled,
        dragging && styles.tokenDragging,
      ]}
    >
      <Text style={styles.tokenIcon}>{orientation === 'vertical' ? '│' : '━'}</Text>
    </View>
  );
}

export function WallHand({ onWallDragStart, onWallDrop, computer = false }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const draggingWall = useGameStore((s) => s.draggingWall);

  const game = useGame({ computer });

  const startRef = useRef(onWallDragStart);
  const dropRef = useRef(onWallDrop);
  const gameRef = useRef(game);
  startRef.current = onWallDragStart;
  dropRef.current = onWallDrop;
  gameRef.current = game;

  // Local game: playerColor is null — use currentTurn's wall count.
  const activeColor = playerColor ?? gameState?.currentTurn ?? 'red';
  const wallsRemaining = gameState
    ? activeColor === 'red'
      ? gameState.redWallsRemaining
      : gameState.blueWallsRemaining
    : 0;

  const canDragRef = useRef(false);
  canDragRef.current = gameRef.current.isMyTurn() && wallsRemaining > 0;

  const disabled = wallsRemaining === 0 || !game.isMyTurn();

  return (
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  token: {
    borderRadius: 8,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenVertical:   { width: 44, height: 72 },
  tokenHorizontal: { width: 72, height: 44 },
  tokenDisabled: { backgroundColor: '#CCBBAA', opacity: 0.5 },
  tokenDragging: { opacity: 0.4 },
  tokenIcon: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
});
