import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useGameStore } from '../../store/gameStore';

export function TurnIndicator() {
  const gameState = useGameStore((s) => s.gameState);
  const playerColor = useGameStore((s) => s.playerColor);
  const reducedMotion = useReducedMotion();

  const scale = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion && gameState?.currentTurn) {
      scale.value = withSequence(
        withTiming(1.08, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    }
  }, [gameState?.currentTurn, reducedMotion, scale]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!gameState) return null;

  const isMyTurn = playerColor === gameState.currentTurn;
  const dotColor = gameState.currentTurn === 'red' ? '#E24B4A' : '#378ADD';

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.dot, { backgroundColor: dotColor }, dotAnimatedStyle]}
      />
      <Text style={[styles.label, { color: isMyTurn ? '#22AA66' : '#888888' }]}>
        {isMyTurn ? 'Your turn' : "Opponent's turn"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  label: { fontSize: 16, fontWeight: '600' },
});
