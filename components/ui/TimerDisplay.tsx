import { StyleSheet, Text, View } from 'react-native';
import { useGameStore } from '../../store/gameStore';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerDisplay() {
  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);

  if (!gameState) return null;

  const { redTimeRemaining, blueTimeRemaining, currentTurn } = gameState;

  const redActive = currentTurn === 'red';
  const blueActive = currentTurn === 'blue';
  const redLow = redActive && redTimeRemaining < 10;
  const blueLow = blueActive && blueTimeRemaining < 10;

  // In online mode show own timer prominently, opponent's dimly.
  // In local mode (playerColor null) show both equally.
  const showBothEqual = playerColor === null;

  return (
    <View style={styles.row}>
      <View style={[styles.clock, redActive && styles.clockActive, redLow && styles.clockDanger]}>
        <Text style={[styles.label, !showBothEqual && playerColor !== 'red' && styles.labelDim]}>
          RED
        </Text>
        <Text style={[styles.time, redLow && styles.timeDanger]}>
          {formatTime(redTimeRemaining)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={[styles.clock, blueActive && styles.clockActive, blueLow && styles.clockDanger]}>
        <Text style={[styles.label, !showBothEqual && playerColor !== 'blue' && styles.labelDim]}>
          BLUE
        </Text>
        <Text style={[styles.time, blueLow && styles.timeDanger]}>
          {formatTime(blueTimeRemaining)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clock: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 80,
  },
  clockActive: {
    borderColor: '#4A3728',
    backgroundColor: '#F5F0E8',
  },
  clockDanger: {
    borderColor: '#EE2222',
    backgroundColor: '#FFF0F0',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#999',
  },
  labelDim: {
    opacity: 0.5,
  },
  time: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    fontVariant: ['tabular-nums'],
  },
  timeDanger: {
    color: '#EE2222',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#E0D8CC',
  },
});
