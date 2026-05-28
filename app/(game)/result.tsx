import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import type { PieceColor } from '@shared/types';

const PIECE_COLORS: Record<PieceColor, string> = {
  red: '#E24B4A',
  blue: '#378ADD',
};

export default function ResultScreen() {
  const { winner, reason } = useLocalSearchParams<{ winner?: string; reason?: string }>();
  const playerColor = useGameStore((s) => s.playerColor);

  const isValidColor = winner === 'red' || winner === 'blue';
  const color = isValidColor ? PIECE_COLORS[winner as PieceColor] : '#1A1A1A';
  const label = winner ? winner.toUpperCase() : '?';

  function getSubtitle() {
    if (!reason) return '';
    if (reason === 'reached_goal') return "Reached the opponent's home!";
    if (reason === 'opponent_left') return 'Opponent left the game.';
    if (reason === 'timeout') {
      if (!playerColor) {
        const loser = winner === 'red' ? 'blue' : 'red';
        return `${loser.charAt(0).toUpperCase() + loser.slice(1)} ran out of time!`;
      }
      return playerColor === winner ? 'Opponent ran out of time!' : 'You ran out of time!';
    }
    return '';
  }

  const subtitle = getSubtitle();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={[styles.winner, { color }]}>{label} WINS!</Text>
        {subtitle !== '' && <Text style={styles.subtitle}>{subtitle}</Text>}

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => router.replace('/(game)/home')}
          >
            <Text style={styles.btnPrimaryText}>Play Again</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => router.replace('/(game)/home')}
          >
            <Text style={styles.btnSecondaryText}>Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  winner: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#4A3728' },
  btnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderWidth: 1.5, borderColor: '#4A3728' },
  btnSecondaryText: { color: '#4A3728', fontSize: 16, fontWeight: '600' },
});
