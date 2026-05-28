import { StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import type { PieceColor } from '@shared/types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PIECE_COLOR: Record<PieceColor, string> = {
  red: '#E24B4A',
  blue: '#378ADD',
};

type Props = {
  color: PieceColor;
  // Rotate 180° so the player physically sitting at the top of the phone can read their clock.
  flipped?: boolean;
};

export function PlayerTimer({ color, flipped = false }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  const timeRemaining = color === 'red' ? gameState.redTimeRemaining : gameState.blueTimeRemaining;
  const active = gameState.currentTurn === color;
  const low = active && timeRemaining < 10;

  return (
    <View style={[styles.row, active && styles.rowActive, flipped && styles.rowFlipped]}>
      <View style={[styles.dot, { backgroundColor: PIECE_COLOR[color] }]} />
      <Text style={styles.label}>{color.toUpperCase()}</Text>
      <Text style={[styles.time, !active && styles.timeIdle, low && styles.timeLow]}>
        {formatTime(timeRemaining)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#FAF7F2',
  },
  rowActive: {
    backgroundColor: '#EDE8DF',
  },
  rowFlipped: {
    transform: [{ rotate: '180deg' }],
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#888',
  },
  time: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  timeIdle: {
    opacity: 0.3,
  },
  timeLow: {
    color: '#EE2222',
  },
});
