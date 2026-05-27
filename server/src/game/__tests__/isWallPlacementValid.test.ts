import { isWallPlacementValid } from '../isWallPlacementValid';
import { applyWall } from '../applyWall';
import * as wallsIntersectModule from '../wallsIntersect';
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
    redTimeRemaining: 300,
    blueTimeRemaining: 300,
    timerConfig: 5,
    ...overrides,
  };
}

describe('isWallPlacementValid', () => {
  it('valid wall on empty board: returns true', () => {
    const wall: Edge = { from: { row: 1, col: 1 }, to: { row: 1, col: 2 } };
    expect(isWallPlacementValid(makeState(), wall)).toBe(true);
  });

  it('non-adjacent squares (diagonal): returns false', () => {
    const wall: Edge = { from: { row: 1, col: 1 }, to: { row: 2, col: 2 } };
    expect(isWallPlacementValid(makeState(), wall)).toBe(false);
  });

  it('non-adjacent squares (2 apart): returns false', () => {
    const wall: Edge = { from: { row: 1, col: 1 }, to: { row: 1, col: 3 } };
    expect(isWallPlacementValid(makeState(), wall)).toBe(false);
  });

  it('duplicate wall: returns false', () => {
    const wall: Edge = { from: { row: 1, col: 1 }, to: { row: 1, col: 2 } };
    expect(isWallPlacementValid(makeState({ placedWalls: [wall] }), wall)).toBe(false);
  });

  it('current player has 0 walls remaining: returns false', () => {
    const wall: Edge = { from: { row: 1, col: 1 }, to: { row: 1, col: 2 } };
    expect(isWallPlacementValid(makeState({ redWallsRemaining: 0 }), wall)).toBe(false);
  });

  it('wall that leaves Red with no path to goal: returns false', () => {
    // Seal all passages between rows 4 and 5 — Red (at row 0) cannot reach row 8
    const barrier: Edge[] = Array.from({ length: 9 }, (_, col) => ({
      from: { row: 4, col },
      to: { row: 5, col },
    }));
    // Place 8 walls in state, then try to add the 9th (the one that seals the path)
    const state = makeState({ placedWalls: barrier.slice(0, 8), redWallsRemaining: 2 });
    expect(isWallPlacementValid(state, barrier[8])).toBe(false);
  });

  it('wall that leaves Blue with no path to goal: returns false', () => {
    // Seal all passages between rows 3 and 4 — Blue (at row 8) cannot reach row 0
    const barrier: Edge[] = Array.from({ length: 9 }, (_, col) => ({
      from: { row: 3, col },
      to: { row: 4, col },
    }));
    const state = makeState({ placedWalls: barrier.slice(0, 8), blueWallsRemaining: 2 });
    // Blue's turn so the wall-remaining check uses blueWallsRemaining
    expect(
      isWallPlacementValid({ ...state, currentTurn: 'blue' }, barrier[8]),
    ).toBe(false);
  });

  it('wall that blocks one route but alternate exists: returns true', () => {
    // Wall on edge (4,4)↔(4,5): both players have many alternate paths
    const wall: Edge = { from: { row: 4, col: 4 }, to: { row: 4, col: 5 } };
    expect(isWallPlacementValid(makeState(), wall)).toBe(true);
  });

  it('wall chaining (shares endpoint with existing wall): returns true', () => {
    const existing: Edge = { from: { row: 2, col: 3 }, to: { row: 2, col: 4 } };
    // New wall shares endpoint {2,4} — chaining is allowed
    const chained: Edge = { from: { row: 2, col: 4 }, to: { row: 3, col: 4 } };
    expect(isWallPlacementValid(makeState({ placedWalls: [existing] }), chained)).toBe(true);
  });

  it('rejects wall when wallsIntersect reports a crossing with an existing wall', () => {
    // 1-unit walls can never geometrically cross, so spy on wallsIntersect to exercise
    // the rejection branch that delegates to it.
    const spy = jest
      .spyOn(wallsIntersectModule, 'wallsIntersect')
      .mockReturnValueOnce(true);
    const existing: Edge = { from: { row: 1, col: 1 }, to: { row: 1, col: 2 } };
    const newWall: Edge = { from: { row: 2, col: 1 }, to: { row: 3, col: 1 } };
    expect(isWallPlacementValid(makeState({ placedWalls: [existing] }), newWall)).toBe(false);
    spy.mockRestore();
  });

  it('rejects crossing wall at same peg even after two adjacent same-orientation walls', () => {
    // Vertical bars at peg (0,3) and peg (2,3) — same column, 2 rows apart.
    // applyWall stores [primary, companion] pairs so placedWalls has 4 entries.
    const state0 = makeState();
    const state1 = applyWall(state0, { from: { row: 0, col: 3 }, to: { row: 0, col: 4 } }); // vert bar peg(0,3)
    const state2 = applyWall({ ...state1, currentTurn: 'red', redWallsRemaining: 9 },
      { from: { row: 2, col: 3 }, to: { row: 2, col: 4 } }); // vert bar peg(2,3)

    // Horizontal bar at peg(2,3) MUST be rejected: it crosses the vertical bar at peg(2,3).
    const crossing: Edge = { from: { row: 2, col: 3 }, to: { row: 3, col: 3 } };
    expect(isWallPlacementValid({ ...state2, currentTurn: 'red', redWallsRemaining: 8 }, crossing)).toBe(false);
  });

  it('allows a valid wall after two adjacent same-orientation walls', () => {
    // Same setup as above but the new wall is at peg(2,4) — no crossing.
    const state0 = makeState();
    const state1 = applyWall(state0, { from: { row: 0, col: 3 }, to: { row: 0, col: 4 } });
    const state2 = applyWall({ ...state1, currentTurn: 'red', redWallsRemaining: 9 },
      { from: { row: 2, col: 3 }, to: { row: 2, col: 4 } });

    // Horizontal bar at peg(2,4) must be accepted (different peg from the vertical bars).
    const safe: Edge = { from: { row: 2, col: 4 }, to: { row: 3, col: 4 } };
    expect(isWallPlacementValid({ ...state2, currentTurn: 'red', redWallsRemaining: 8 }, safe)).toBe(true);
  });
});
