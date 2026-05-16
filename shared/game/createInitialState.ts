import type { GameState, TimerOption } from '@shared/types';

export function createInitialState(timerConfig: TimerOption): GameState {
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
