import { getValidMoves } from '../getValidMoves';
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

describe('getValidMoves', () => {
  it('red at {0,4} on empty board returns down, left, right (up is out of bounds)', () => {
    const result = getValidMoves(makeState());
    expect(result.sort()).toEqual(['down', 'left', 'right'].sort());
  });

  it('piece blocked by wall on one side: that direction not in result', () => {
    // Wall between {0,4} and {0,5} blocks right
    const wall: Edge = { from: { row: 0, col: 4 }, to: { row: 0, col: 5 } };
    const result = getValidMoves(makeState({ placedWalls: [wall] }));
    expect(result).not.toContain('right');
    expect(result.sort()).toEqual(['down', 'left'].sort());
  });

  it('opponent adjacent with clear behind-square: direction is valid (jump)', () => {
    // Red at {3,4}, Blue at {4,4}, behind = {5,4} — clear
    const result = getValidMoves(
      makeState({ redPosition: { row: 3, col: 4 }, bluePosition: { row: 4, col: 4 } }),
    );
    expect(result).toContain('down');
  });

  it('opponent adjacent but wall between opponent and behind-square: direction invalid', () => {
    // Red at {3,4}, Blue at {4,4}, wall between {4,4} and {5,4}
    const wall: Edge = { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } };
    const result = getValidMoves(
      makeState({
        redPosition: { row: 3, col: 4 },
        bluePosition: { row: 4, col: 4 },
        placedWalls: [wall],
      }),
    );
    expect(result).not.toContain('down');
  });

  it('opponent adjacent but behind-square is out of bounds: direction invalid', () => {
    // Red at {7,4}, Blue at {8,4}, behind = row 9 — out of bounds
    const result = getValidMoves(
      makeState({ redPosition: { row: 7, col: 4 }, bluePosition: { row: 8, col: 4 } }),
    );
    expect(result).not.toContain('down');
  });

  it('piece surrounded by walls returns empty array', () => {
    // Red at {4,4}, walls on all four edges
    const walls: Edge[] = [
      { from: { row: 3, col: 4 }, to: { row: 4, col: 4 } }, // up
      { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } }, // down
      { from: { row: 4, col: 3 }, to: { row: 4, col: 4 } }, // left
      { from: { row: 4, col: 4 }, to: { row: 4, col: 5 } }, // right
    ];
    const result = getValidMoves(
      makeState({ redPosition: { row: 4, col: 4 }, placedWalls: walls }),
    );
    expect(result).toEqual([]);
  });
});
