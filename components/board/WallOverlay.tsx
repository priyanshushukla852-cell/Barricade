import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/gameStore';
import { normalizeEdge } from '@shared/game';
import { CELL_SIZE } from './SquareComponent';
import type { Edge } from '@shared/types';

const WALL_THICKNESS = 4;
const BOARD_PIXEL_SIZE = CELL_SIZE * 9;

const WALL_LENGTH = CELL_SIZE * 2;

function wallPositionStyle(wall: Edge) {
  const isHorizontalAdjacency = wall.from.row === wall.to.row;
  if (isHorizontalAdjacency) {
    // Vertical wall on the border between two horizontally adjacent squares.
    // from is the lesser position (smaller col), so from.row is the top cell.
    const col = Math.max(wall.from.col, wall.to.col);
    return {
      position: 'absolute' as const,
      left: col * CELL_SIZE - WALL_THICKNESS / 2,
      top: wall.from.row * CELL_SIZE,
      width: WALL_THICKNESS,
      height: WALL_LENGTH,
      borderRadius: WALL_THICKNESS / 2,
    };
  }
  // Horizontal wall on the border between two vertically adjacent squares.
  // from is the lesser position (smaller row), so from.col is the left cell.
  const row = Math.max(wall.from.row, wall.to.row);
  return {
    position: 'absolute' as const,
    top: row * CELL_SIZE - WALL_THICKNESS / 2,
    left: wall.from.col * CELL_SIZE,
    width: WALL_LENGTH,
    height: WALL_THICKNESS,
    borderRadius: WALL_THICKNESS / 2,
  };
}

function AnimatedWallSegment({
  wall,
  color,
  skipAnimation,
}: {
  wall: Edge;
  color: string;
  skipAnimation: boolean;
}) {
  const opacity = useSharedValue(skipAnimation ? 1 : 0);

  useEffect(() => {
    if (!skipAnimation) {
      opacity.value = withTiming(1, { duration: 250 });
    }
    // Intentionally run only on mount — skipAnimation is captured at init time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[wallPositionStyle(wall), { backgroundColor: color }, animatedStyle]}
    />
  );
}

function WallPreview({ wall, color }: { wall: Edge; color: string }) {
  return <View style={[wallPositionStyle(wall), { backgroundColor: color }]} />;
}

function isPrimaryEdge(wall: Edge, allWalls: Edge[]): boolean {
  if (wall.from.row === wall.to.row) {
    // Vertical bar: it's a companion if the same column span one row above exists
    if (wall.from.row === 0) return true;
    return !allWalls.some(
      (w) =>
        w.from.row === wall.from.row - 1 &&
        w.from.col === wall.from.col &&
        w.to.row === wall.to.row - 1 &&
        w.to.col === wall.to.col,
    );
  }
  // Horizontal bar: it's a companion if the same row span one col to the left exists
  if (wall.from.col === 0) return true;
  return !allWalls.some(
    (w) =>
      w.from.row === wall.from.row &&
      w.from.col === wall.from.col - 1 &&
      w.to.row === wall.to.row &&
      w.to.col === wall.to.col - 1,
  );
}

export function WallOverlay() {
  const placedWalls = useGameStore((s) => s.gameState?.placedWalls ?? []);
  const wallPreview = useGameStore((s) => s.wallPreview);
  const wallPreviewValid = useGameStore((s) => s.wallPreviewValid);
  const reducedMotion = useReducedMotion();

  // Each placed wall stores two edges (primary + companion). Only render
  // primary edges — each draws exactly 2 cells, matching the logical block.
  const primaryWalls = placedWalls.filter((w) => isPrimaryEdge(w, placedWalls));

  return (
    <View
      style={{
        position: 'absolute', top: 0, left: 0,
        width: BOARD_PIXEL_SIZE, height: BOARD_PIXEL_SIZE,
        overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      {primaryWalls.map((wall) => {
        const key = JSON.stringify(normalizeEdge(wall));
        return (
          <AnimatedWallSegment
            key={key}
            wall={wall}
            color="#333333"
            skipAnimation={reducedMotion}
          />
        );
      })}
      {wallPreview && (
        <WallPreview
          wall={wallPreview}
          color={wallPreviewValid ? '#22CC88' : '#EE4444'}
        />
      )}
    </View>
  );
}
