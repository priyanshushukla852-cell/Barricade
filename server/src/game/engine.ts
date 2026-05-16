import type { GameState, Position, PieceColor, TimerOption } from '@shared/types';

export const BOARD_SIZE = 9;

export function createInitialState(timerConfig: TimerOption = 5): GameState {
  return {
    redPosition: { row: 0, col: 4 },
    bluePosition: { row: 8, col: 4 },
    redWallsRemaining: 10,
    blueWallsRemaining: 10,
    placedWalls: [],
    currentTurn: 'red',
    phase: 'choosing',
    winner: null,
    timerSeconds: timerConfig * 60,
    timerConfig,
  };
}

export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
}

export function nextTurn(current: PieceColor): PieceColor {
  return current === 'red' ? 'blue' : 'red';
}
