import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import type { PieceColor } from '@shared/types';

const PIECE_COLORS: Record<PieceColor, string> = {
  red: '#E24B4A',
  blue: '#378ADD',
};

export default function ResultScreen() {
  const { winner, reason, ratingBefore, ratingAfter, ratingDelta } = useLocalSearchParams<{
    winner?: string;
    reason?: string;
    ratingBefore?: string;
    ratingAfter?: string;
    ratingDelta?: string;
  }>();
  const playerColor = useGameStore((s) => s.playerColor);

  const isValidColor = winner === 'red' || winner === 'blue';
  const color = isValidColor ? PIECE_COLORS[winner as PieceColor] : '#1A1A1A';
  const label = winner ? winner.toUpperCase() : '?';

  const before = ratingBefore ? parseInt(ratingBefore, 10) : null;
  const after = ratingAfter ? parseInt(ratingAfter, 10) : null;
  const delta = ratingDelta ? parseInt(ratingDelta, 10) : null;

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

        {before !== null && after !== null && delta !== null && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{before}</Text>
            <Text style={styles.ratingArrow}> → </Text>
            <Text style={styles.ratingText}>{after}</Text>
            <Text style={[styles.ratingDelta, delta >= 0 ? styles.ratingGain : styles.ratingLoss]}>
              {delta >= 0 ? ` (+${delta})` : ` (${delta})`}
            </Text>
          </View>
        )}

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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ratingText: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  ratingArrow: { fontSize: 18, color: '#999' },
  ratingDelta: { fontSize: 18, fontWeight: '700' },
  ratingGain: { color: '#22AA66' },
  ratingLoss: { color: '#EE2222' },
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
