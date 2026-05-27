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
    redTimeRemaining: 300,
    blueTimeRemaining: 300,
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

  it('returns "red" when redPosition is {row:8,col:0} (any col in row 8 wins)', () => {
    expect(checkWinner(makeState({ redPosition: { row: 8, col: 0 } }))).toBe('red');
  });

  it('returns "blue" when bluePosition is {row:0,col:4}', () => {
    expect(checkWinner(makeState({ bluePosition: { row: 0, col: 4 } }))).toBe('blue');
  });

  it('returns "blue" when bluePosition is {row:0,col:8} (any col in row 0 wins)', () => {
    expect(checkWinner(makeState({ bluePosition: { row: 0, col: 8 } }))).toBe('blue');
  });

  it('returns "red" when red is at {row:8,col:3} (any col in row 8 wins)', () => {
    expect(checkWinner(makeState({ redPosition: { row: 8, col: 3 } }))).toBe('red');
  });

  it('returns null when red is at {row:7,col:4} (wrong row)', () => {
    expect(checkWinner(makeState({ redPosition: { row: 7, col: 4 } }))).toBeNull();
  });
});
