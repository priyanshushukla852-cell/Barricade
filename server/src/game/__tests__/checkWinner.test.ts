import { checkWinner } from '../checkWinner';
import type { GameState } from '@shared/types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    redPosition: { row: 0, col: 4 },
    bluePosition: { row: 8, col: 4 },
    redWallsRemaining: 10,
    blueWallsRemaining: 10,
    placedWalls: [],
    currentTurn: 'red',
    phase: 'choosing',
    winner: null,
    timerSeconds: 300,
    timerConfig: 5,
    ...overrides,
  };
}

describe('checkWinner', () => {
  it('returns null on initial board state', () => {
    expect(checkWinner(makeState())).toBeNull();
  });

  it('returns "red" when redPosition is {row:8,col:4}', () => {
    expect(checkWinner(makeState({ redPosition: { row: 8, col: 4 } }))).toBe('red');
  });

  it('returns "blue" when bluePosition is {row:0,col:4}', () => {
    expect(checkWinner(makeState({ bluePosition: { row: 0, col: 4 } }))).toBe('blue');
  });

  it('returns null when red is at {row:8,col:3} (wrong col)', () => {
    expect(checkWinner(makeState({ redPosition: { row: 8, col: 3 } }))).toBeNull();
  });

  it('returns null when red is at {row:7,col:4} (wrong row)', () => {
    expect(checkWinner(makeState({ redPosition: { row: 7, col: 4 } }))).toBeNull();
  });
});
