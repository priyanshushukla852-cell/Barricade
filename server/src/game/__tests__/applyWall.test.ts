import { applyWall } from '../applyWall';
import type { GameState, Edge } from '@shared/types';

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

const VALID_WALL: Edge = { from: { row: 1, col: 1 }, to: { row: 1, col: 2 } };

describe('applyWall', () => {
  it('valid wall: appears in placedWalls of returned state', () => {
    const result = applyWall(makeState(), VALID_WALL);
    expect(result.placedWalls).toContainEqual(VALID_WALL);
  });

  it('valid wall: redWallsRemaining decrements when it is red turn', () => {
    const result = applyWall(makeState({ currentTurn: 'red' }), VALID_WALL);
    expect(result.redWallsRemaining).toBe(9);
    expect(result.blueWallsRemaining).toBe(10);
  });

  it('valid wall: blueWallsRemaining decrements when it is blue turn', () => {
    const result = applyWall(makeState({ currentTurn: 'blue' }), VALID_WALL);
    expect(result.blueWallsRemaining).toBe(9);
    expect(result.redWallsRemaining).toBe(10);
  });

  it('valid wall: currentTurn advances', () => {
    const result = applyWall(makeState({ currentTurn: 'red' }), VALID_WALL);
    expect(result.currentTurn).toBe('blue');
  });

  it('valid wall: input state not mutated', () => {
    const state = makeState();
    const wallsBefore = state.placedWalls.length;
    const turnBefore = state.currentTurn;
    applyWall(state, VALID_WALL);
    expect(state.placedWalls.length).toBe(wallsBefore);
    expect(state.currentTurn).toBe(turnBefore);
    expect(state.redWallsRemaining).toBe(10);
  });

  it('invalid wall: throws Error("Invalid wall placement")', () => {
    // Non-adjacent squares
    const bad: Edge = { from: { row: 0, col: 0 }, to: { row: 2, col: 0 } };
    expect(() => applyWall(makeState(), bad)).toThrow('Invalid wall placement');
  });
});
