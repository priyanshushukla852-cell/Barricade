import { applyMove } from '../applyMove';
import type { GameState } from '@shared/types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    redPosition: { row: 4, col: 4 },
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

describe('applyMove', () => {
  it('normal move updates current player position correctly', () => {
    const result = applyMove(makeState(), 'up');
    expect(result.redPosition).toEqual({ row: 3, col: 4 });
  });

  it('normal move does not change opponent position', () => {
    const result = applyMove(makeState(), 'up');
    expect(result.bluePosition).toEqual({ row: 8, col: 4 });
  });

  it('currentTurn switches after move', () => {
    const result = applyMove(makeState(), 'up');
    expect(result.currentTurn).toBe('blue');
  });

  it('jump: current player lands 2 squares past opponent, opponent position unchanged', () => {
    // Red at {3,4}, Blue at {4,4} — moving down triggers jump to {5,4}
    const state = makeState({ redPosition: { row: 3, col: 4 }, bluePosition: { row: 4, col: 4 } });
    const result = applyMove(state, 'down');
    expect(result.redPosition).toEqual({ row: 5, col: 4 });
    expect(result.bluePosition).toEqual({ row: 4, col: 4 });
  });

  it('invalid direction throws Error("Invalid move direction")', () => {
    // Red at {0,4}: up is out of bounds → invalid
    const state = makeState({ redPosition: { row: 0, col: 4 } });
    expect(() => applyMove(state, 'up')).toThrow('Invalid move direction');
  });

  it('throws when moving into opponent-occupied square blocked by wall behind opponent', () => {
    // Red at {3,4}, Blue at {4,4}, wall between {4,4} and {5,4} — jump is blocked
    const wall = { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } };
    const state = makeState({
      redPosition: { row: 3, col: 4 },
      bluePosition: { row: 4, col: 4 },
      placedWalls: [wall],
    });
    expect(() => applyMove(state, 'down')).toThrow('Invalid move direction');
  });

  it('throws when jumping over opponent whose behind-square is out of bounds', () => {
    // Red at {7,4}, Blue at {8,4} — behind square would be row 9, out of bounds
    const state = makeState({ redPosition: { row: 7, col: 4 }, bluePosition: { row: 8, col: 4 } });
    expect(() => applyMove(state, 'down')).toThrow('Invalid move direction');
  });

  it('input state is not mutated after call', () => {
    const state = makeState();
    const redBefore = { ...state.redPosition };
    applyMove(state, 'down');
    expect(state.redPosition).toEqual(redBefore);
    expect(state.currentTurn).toBe('red');
  });

  it('phase remains "choosing" after move', () => {
    const result = applyMove(makeState(), 'down');
    expect(result.phase).toBe('choosing');
  });
});
