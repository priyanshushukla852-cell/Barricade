import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3001';

interface HistoryEntry {
  outcome: 'win' | 'loss';
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  reason: string;
  playedAt: string;
}

interface ProfileData {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  history: HistoryEntry[];
}

function reasonLabel(reason: string): string {
  if (reason === 'reached_goal') return 'Goal reached';
  if (reason === 'timeout') return 'Timeout';
  if (reason === 'opponent_left') return 'Opponent left';
  return reason;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProfileScreen() {
  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    fetch(`${SERVER_URL}/ratings/profile?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load profile');
        setLoading(false);
      });
  }, [userId]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A3728" />
        </View>
      )}

      {!loading && error !== '' && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && profile !== null && (
        <FlatList
          data={profile.history}
          keyExtractor={(_, i) => String(i)}
          ListHeaderComponent={
            <View>
              {/* Identity */}
              <View style={styles.identityCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {nickname ? nickname.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
                <Text style={styles.nickname}>{nickname ?? 'Player'}</Text>
                <Text style={styles.ratingBig}>★ {profile.rating}</Text>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{profile.gamesPlayed}</Text>
                  <Text style={styles.statLabel}>Games</Text>
                </View>
                <View style={[styles.statBox, styles.statBorder]}>
                  <Text style={[styles.statValue, styles.statWin]}>{profile.wins}</Text>
                  <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, styles.statLoss]}>{profile.losses}</Text>
                  <Text style={styles.statLabel}>Losses</Text>
                </View>
              </View>

              {profile.history.length > 0 && (
                <Text style={styles.historyHeading}>Recent Games</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No games played yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.historyRow}>
              <View style={[styles.outcomeBadge, item.outcome === 'win' ? styles.badgeWin : styles.badgeLoss]}>
                <Text style={styles.badgeText}>{item.outcome === 'win' ? 'W' : 'L'}</Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyReason}>{reasonLabel(item.reason)}</Text>
                <Text style={styles.historyDate}>{formatDate(item.playedAt)}</Text>
              </View>
              <View style={styles.historyRating}>
                <Text style={styles.historyRatingText}>
                  {item.ratingBefore} → {item.ratingAfter}
                </Text>
                <Text style={[styles.historyDelta, item.delta >= 0 ? styles.deltaGain : styles.deltaLoss]}>
                  {item.delta >= 0 ? `+${item.delta}` : String(item.delta)}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 15, color: '#4A3728', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EE2222', fontSize: 15 },

  identityCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  nickname: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.5 },
  ratingBig: { fontSize: 18, fontWeight: '700', color: '#888' },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E2D8',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    marginBottom: 28,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: '#E8E2D8' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  statWin: { color: '#22AA66' },
  statLoss: { color: '#EE2222' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#999', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },

  historyHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 24,
    marginBottom: 10,
  },
  listContent: { paddingBottom: 40 },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE8DE',
    gap: 12,
  },
  outcomeBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWin: { backgroundColor: '#22AA66' },
  badgeLoss: { backgroundColor: '#EE2222' },
  badgeText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  historyInfo: { flex: 1 },
  historyReason: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  historyDate: { fontSize: 12, color: '#AAA', marginTop: 2 },

  historyRating: { alignItems: 'flex-end' },
  historyRatingText: { fontSize: 13, color: '#555', fontWeight: '500' },
  historyDelta: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  deltaGain: { color: '#22AA66' },
  deltaLoss: { color: '#EE2222' },

  emptyText: { textAlign: 'center', color: '#AAA', marginTop: 32, fontSize: 15 },
});
