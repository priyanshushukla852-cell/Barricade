import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { updateNickname } from '../../hooks/useAuth';
import { apiFetch } from '../../lib/api';

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
  hasMore: boolean;
}

function reasonLabel(reason: string, outcome: 'win' | 'loss'): string {
  if (reason === 'reached_goal') return outcome === 'win' ? 'Goal reached' : 'Goal reached';
  if (reason === 'timeout') return outcome === 'win' ? 'Opponent timed out' : 'Timeout';
  if (reason === 'opponent_left') return outcome === 'win' ? 'Opponent left' : 'You left';
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(nickname ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    apiFetch(`/ratings/profile?userId=${encodeURIComponent(userId)}&offset=0`)
      .then((r) => {
        if (!r.ok) throw new Error('Server error');
        return r.json();
      })
      .then((data: ProfileData) => {
        setProfile(data);
        setHistory(data.history);
        setHasMore(data.hasMore);
        setNextOffset(data.history.length);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load profile');
        setLoading(false);
      });
  }, [userId]);

  async function handleLoadMore() {
    if (!userId || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await apiFetch(
        `/ratings/profile?userId=${encodeURIComponent(userId)}&offset=${nextOffset}`,
      );
      if (!r.ok) throw new Error('Server error');
      const data = (await r.json()) as ProfileData;
      setHistory((prev) => [...prev, ...data.history]);
      setHasMore(data.hasMore);
      setNextOffset((prev) => prev + data.history.length);
    } catch {
      // silently ignore load-more errors
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSave() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed.length > 20) {
      setSaveError('Name must be 1–20 characters.');
      return;
    }
    setSaveError('');
    setSaving(true);
    try {
      await updateNickname(trimmed);
      setEditing(false);
    } catch {
      setSaveError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit() {
    setEditValue(nickname ?? '');
    setSaveError('');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }


  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
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

      {!loading && error === '' && (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={styles.identityCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(nickname ?? '').charAt(0).toUpperCase() || '?'}
              </Text>
            </View>

            {editing ? (
              <View style={styles.editRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.nicknameInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  maxLength={20}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                <Pressable
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.saveBtnText}>Save</Text>
                  }
                </Pressable>
                <Pressable style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nicknameRow} onPress={handleStartEdit}>
                <Text style={styles.nickname}>{nickname ?? 'Player'}</Text>
                <Text style={styles.editIcon}>✏️</Text>
              </Pressable>
            )}

            {saveError !== '' && <Text style={styles.saveError}>{saveError}</Text>}
            <Text style={styles.ratingBig}>★ {profile?.rating ?? 1200}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profile?.gamesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={[styles.statBox, styles.statBorder]}>
              <Text style={[styles.statValue, styles.statWin]}>{profile?.wins ?? 0}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.statLoss]}>{profile?.losses ?? 0}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
          </View>

          {/* History */}
          {history.length > 0 ? (
            <>
              <Text style={styles.historyHeading}>Recent Games</Text>
              {history.map((item, i) => (
                <View key={i} style={styles.historyRow}>
                  <View style={[styles.outcomeBadge, item.outcome === 'win' ? styles.badgeWin : styles.badgeLoss]}>
                    <Text style={styles.badgeText}>{item.outcome === 'win' ? 'W' : 'L'}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyReason}>{reasonLabel(item.reason, item.outcome)}</Text>
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
              ))}
              {hasMore && (
                <Pressable
                  style={[styles.loadMoreBtn, loadingMore && styles.loadMoreBtnDisabled]}
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? <ActivityIndicator size="small" color="#4A3728" />
                    : <Text style={styles.loadMoreText}>Load more</Text>
                  }
                </Pressable>
              )}
            </>
          ) : (
            !loading && <Text style={styles.emptyText}>No games played yet.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF7F2', paddingTop: 20, paddingBottom: 20 },
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

  scrollContent: { paddingBottom: 48 },

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
  nicknameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nickname: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', letterSpacing: 0.5 },
  editIcon: { fontSize: 16 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  nicknameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    borderBottomWidth: 2,
    borderBottomColor: '#4A3728',
    paddingVertical: 4,
    minWidth: 120,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#4A3728',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  cancelEditBtn: { paddingHorizontal: 8 },
  cancelEditText: { color: '#999', fontSize: 14, fontWeight: '600' },
  saveError: { color: '#EE2222', fontSize: 12, marginTop: -8 },
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

  loadMoreBtn: {
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4A3728',
    alignItems: 'center',
  },
  loadMoreBtnDisabled: { opacity: 0.5 },
  loadMoreText: { color: '#4A3728', fontSize: 14, fontWeight: '700' },
});
