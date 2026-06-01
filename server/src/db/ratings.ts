import type { PieceColor } from '@shared/types';
import { query } from './client';
import { calculateElo } from '../game/elo';

export interface PlayerRating {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

const DEFAULT_RATING = 1200;

export async function getRating(userId: string): Promise<PlayerRating> {
  const result = await query(
    `SELECT rating, games_played, wins, losses FROM player_ratings WHERE user_id = $1`,
    [userId],
  );
  if (result.rows.length === 0) {
    return { rating: DEFAULT_RATING, gamesPlayed: 0, wins: 0, losses: 0 };
  }
  const row = result.rows[0] as { rating: number; games_played: number; wins: number; losses: number };
  return { rating: row.rating, gamesPlayed: row.games_played, wins: row.wins, losses: row.losses };
}

export interface RatingUpdate {
  winner: { before: number; after: number; delta: number };
  loser: { before: number; after: number; delta: number };
}

export interface GameHistoryEntry {
  outcome: 'win' | 'loss';
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  reason: string;
  playedAt: string;
}

export interface PlayerProfile extends PlayerRating {
  history: GameHistoryEntry[];
  hasMore: boolean;
}

const PAGE_SIZE = 10;

export async function getProfile(userId: string, offset = 0): Promise<PlayerProfile> {
  const [statsRes, historyRes] = await Promise.all([
    query(`SELECT rating, games_played, wins, losses FROM player_ratings WHERE user_id = $1`, [userId]),
    query(
      `SELECT
         CASE WHEN winner_id = $1 THEN 'win' ELSE 'loss' END AS outcome,
         CASE WHEN winner_id = $1 THEN winner_rating_before ELSE loser_rating_before END AS rating_before,
         CASE WHEN winner_id = $1 THEN winner_rating_after ELSE loser_rating_after END AS rating_after,
         reason, played_at
       FROM game_results
       WHERE winner_id = $1 OR loser_id = $1
       ORDER BY played_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, PAGE_SIZE + 1, offset],
    ),
  ]);

  const stats =
    statsRes.rows.length > 0
      ? (statsRes.rows[0] as { rating: number; games_played: number; wins: number; losses: number })
      : null;

  const rows = historyRes.rows as Array<{
    outcome: 'win' | 'loss';
    rating_before: number;
    rating_after: number;
    reason: string;
    played_at: string;
  }>;
  const hasMore = rows.length > PAGE_SIZE;
  const history: GameHistoryEntry[] = rows.slice(0, PAGE_SIZE).map((r) => ({
    outcome: r.outcome,
    ratingBefore: r.rating_before,
    ratingAfter: r.rating_after,
    delta: r.rating_after - r.rating_before,
    reason: r.reason,
    playedAt: r.played_at,
  }));

  return {
    rating: stats?.rating ?? DEFAULT_RATING,
    gamesPlayed: stats?.games_played ?? 0,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    history,
    hasMore,
  };
}

export async function applyRatings(
  roomCode: string,
  winner: PieceColor,
  winnerId: string,
  loserId: string,
  reason: string,
): Promise<RatingUpdate> {
  const [winnerData, loserData] = await Promise.all([
    getRating(winnerId),
    getRating(loserId),
  ]);

  const elo = calculateElo(
    winnerData.rating,
    loserData.rating,
    winnerData.gamesPlayed,
    loserData.gamesPlayed,
  );

  // Upsert winner
  await query(
    `INSERT INTO player_ratings (user_id, rating, games_played, wins, losses, updated_at)
     VALUES ($1, $2, 1, 1, 0, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       rating = $2,
       games_played = player_ratings.games_played + 1,
       wins = player_ratings.wins + 1,
       updated_at = NOW()`,
    [winnerId, elo.newWinnerRating],
  );

  // Upsert loser
  await query(
    `INSERT INTO player_ratings (user_id, rating, games_played, wins, losses, updated_at)
     VALUES ($1, $2, 1, 0, 1, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       rating = $2,
       games_played = player_ratings.games_played + 1,
       losses = player_ratings.losses + 1,
       updated_at = NOW()`,
    [loserId, elo.newLoserRating],
  );

  // Log game result
  await query(
    `INSERT INTO game_results
       (room_code, winner_id, loser_id,
        winner_rating_before, loser_rating_before,
        winner_rating_after, loser_rating_after, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      roomCode,
      winnerId,
      loserId,
      winnerData.rating,
      loserData.rating,
      elo.newWinnerRating,
      elo.newLoserRating,
      reason,
    ],
  );

  return {
    winner: { before: winnerData.rating, after: elo.newWinnerRating, delta: elo.winnerDelta },
    loser: { before: loserData.rating, after: elo.newLoserRating, delta: elo.loserDelta },
  };
}
