import { createInitialState, isValidPosition, nextTurn, BOARD_SIZE } from '../engine';

describe('createInitialState', () => {
  it('places red at row 0 col 4 and blue at row 8 col 4', () => {
    const state = createInitialState();
    expect(state.redPosition).toEqual({ row: 0, col: 4 });
    expect(state.bluePosition).toEqual({ row: 8, col: 4 });
  });

  it('gives each player 10 walls', () => {
    const state = createInitialState();
    expect(state.redWallsRemaining).toBe(10);
    expect(state.blueWallsRemaining).toBe(10);
  });

  it('starts with no placed walls', () => {
    const state = createInitialState();
    expect(state.placedWalls).toHaveLength(0);
  });

  it('starts with red going first in choosing phase', () => {
    const state = createInitialState();
    expect(state.currentTurn).toBe('red');
    expect(state.phase).toBe('choosing');
    expect(state.winner).toBeNull();
  });

  it('sets timerSeconds from timerConfig', () => {
    expect(createInitialState(1).timerSeconds).toBe(60);
    expect(createInitialState(2).timerSeconds).toBe(120);
    expect(createInitialState(3).timerSeconds).toBe(180);
    expect(createInitialState(5).timerSeconds).toBe(300);
  });
});

describe('isValidPosition', () => {
  it('accepts positions within the 9x9 grid', () => {
    expect(isValidPosition({ row: 0, col: 0 })).toBe(true);
    expect(isValidPosition({ row: 8, col: 8 })).toBe(true);
    expect(isValidPosition({ row: 4, col: 4 })).toBe(true);
  });

  it('rejects out-of-bounds positions', () => {
    expect(isValidPosition({ row: -1, col: 0 })).toBe(false);
    expect(isValidPosition({ row: 0, col: 9 })).toBe(false);
    expect(isValidPosition({ row: 9, col: 9 })).toBe(false);
    expect(isValidPosition({ row: 0, col: -1 })).toBe(false);
  });

  it('uses BOARD_SIZE constant', () => {
    expect(BOARD_SIZE).toBe(9);
  });
});

describe('nextTurn', () => {
  it('alternates between red and blue', () => {
    expect(nextTurn('red')).toBe('blue');
    expect(nextTurn('blue')).toBe('red');
  });
});
