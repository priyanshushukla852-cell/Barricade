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

const WALL_THICKNESS = 7;
const BOARD_PIXEL_SIZE = CELL_SIZE * 9;

const WALL_LENGTH = CELL_SIZE * 2;

function wallPositionStyle(wall: Edge, flipped = false) {
  const isHorizontalAdjacency = wall.from.row === wall.to.row;
  if (isHorizontalAdjacency) {
    // Vertical wall bar spanning 2 rows on the border between two horizontally adjacent squares.
    const col = Math.max(wall.from.col, wall.to.col);
    // Standard: top = from.row * CS  (wall spans down from that row)
    // Flipped:  rows r and r+1 appear at visual y (8-r) and (7-r)*CS → top = (7-r)*CS
    const top = flipped
      ? (7 - wall.from.row) * CELL_SIZE
      : wall.from.row * CELL_SIZE;
    return {
      position: 'absolute' as const,
      left: col * CELL_SIZE - WALL_THICKNESS / 2,
      top,
      width: WALL_THICKNESS,
      height: WALL_LENGTH,
      borderRadius: WALL_THICKNESS / 2,
    };
  }
  // Horizontal wall bar spanning 2 cols on the border between two vertically adjacent squares.
  const row = Math.max(wall.from.row, wall.to.row);
  // Standard: top = row * CS - WT/2  (centered on the border below the lesser row)
  // Flipped:  border between rows r and r+1 appears at visual y = (8-r)*CS = (9-max_row)*CS
  const top = flipped
    ? (9 - row) * CELL_SIZE - WALL_THICKNESS / 2
    : row * CELL_SIZE - WALL_THICKNESS / 2;
  return {
    position: 'absolute' as const,
    top,
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
  flipped,
}: {
  wall: Edge;
  color: string;
  skipAnimation: boolean;
  flipped: boolean;
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
      style={[wallPositionStyle(wall, flipped), { backgroundColor: color }, animatedStyle]}
    />
  );
}

function WallPreview({ wall, color, flipped }: { wall: Edge; color: string; flipped: boolean }) {
  return <View style={[wallPositionStyle(wall, flipped), { backgroundColor: color }]} />;
}

export function WallOverlay({ flipped = false }: { flipped?: boolean }) {
  const placedWalls = useGameStore((s) => s.gameState?.placedWalls ?? []);
  const wallPreview = useGameStore((s) => s.wallPreview);
  const wallPreviewValid = useGameStore((s) => s.wallPreviewValid);
  const reducedMotion = useReducedMotion();

  // applyWall appends [primary, companion] so even-indexed entries are primaries.
  // Only render primaries — each spans exactly 2 cells via WALL_LENGTH.
  const primaryWalls = placedWalls.filter((_, i) => i % 2 === 0);

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
            flipped={flipped}
          />
        );
      })}
      {wallPreview && (
        <WallPreview
          wall={wallPreview}
          color={wallPreviewValid ? '#22CC88' : '#EE4444'}
          flipped={flipped}
        />
      )}
    </View>
  );
}
