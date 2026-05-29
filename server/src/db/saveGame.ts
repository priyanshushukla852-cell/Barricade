import type { PieceColor } from '@shared/types';
import { query } from './client';
import logger from '../logger';

export async function saveGame(
  roomCode: string,
  winner: PieceColor,
  redUserId: string,
  blueUserId: string,
  startedAt: Date,
): Promise<void> {
  const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  try {
    await query(
      `INSERT INTO completed_games (room_code, winner, red_user_id, blue_user_id, duration_seconds)
       VALUES ($1, $2, $3, $4, $5)`,
      [roomCode, winner, redUserId, blueUserId, durationSeconds],
    );
  } catch (err) {
    logger.error({ err }, 'saveGame error');
  }
}
