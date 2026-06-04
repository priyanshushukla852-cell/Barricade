import { getDeflectedJumps } from '../getValidMoves';
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

describe('getDeflectedJumps', () => {
  it('returns empty when opponent is not adjacent', () => {
    // Red at {3,4}, Blue at {7,4} — not adjacent
    expect(
      getDeflectedJumps(makeState({ redPosition: { row: 3, col: 4 } })),
    ).toEqual([]);
  });

  it('returns empty when straight-through jump is valid (no deflection needed)', () => {
    // Red at {3,4}, Blue at {4,4}, behind {5,4} is clear — straight jump available
    expect(
      getDeflectedJumps(
        makeState({ redPosition: { row: 3, col: 4 }, bluePosition: { row: 4, col: 4 } }),
      ),
    ).toEqual([]);
  });

  it('offers deflected landings when straight jump is blocked by a wall', () => {
    // Red at {3,4}, Blue at {4,4}, wall between {4,4} and {5,4} blocks straight jump
    const wall: Edge = { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } };
    const result = getDeflectedJumps(
      makeState({
        redPosition: { row: 3, col: 4 },
        bluePosition: { row: 4, col: 4 },
        placedWalls: [wall],
      }),
    );
    expect(result.length).toBeGreaterThan(0);
    // All landings must use direction 'down' (toward opponent)
    for (const dj of result) {
      expect(dj.jumpDir).toBe('down');
    }
    // Possible lateral landings: {4,3} and {4,5}
    const landCols = result.map((dj) => dj.landPos.col).sort();
    expect(landCols).toContain(3);
    expect(landCols).toContain(5);
  });

  it('offers deflected landings when straight jump is blocked by board edge', () => {
    // Red at {7,4}, Blue at {8,4}, behind row 9 is out of bounds
    const result = getDeflectedJumps(
      makeState({ redPosition: { row: 7, col: 4 }, bluePosition: { row: 8, col: 4 } }),
    );
    expect(result.length).toBeGreaterThan(0);
    for (const dj of result) {
      expect(dj.jumpDir).toBe('down');
      expect(dj.landPos.row).toBe(8); // must land on opponent's row
    }
  });

  it('excludes the origin square from deflected landings', () => {
    // Red at {3,4}, Blue at {4,4}, straight jump blocked
    const wall: Edge = { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } };
    const result = getDeflectedJumps(
      makeState({
        redPosition: { row: 3, col: 4 },
        bluePosition: { row: 4, col: 4 },
        placedWalls: [wall],
      }),
    );
    // {3,4} is Red's own position — must not appear as a landing
    for (const dj of result) {
      expect(dj.landPos).not.toEqual({ row: 3, col: 4 });
    }
  });

  it('excludes wall-blocked lateral landings', () => {
    // Red at {3,4}, Blue at {4,4}, straight jump blocked,
    // AND wall between {4,4} and {4,5} blocks the right lateral landing
    const walls: Edge[] = [
      { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } }, // blocks straight jump
      { from: { row: 4, col: 4 }, to: { row: 4, col: 5 } }, // blocks right lateral
    ];
    const result = getDeflectedJumps(
      makeState({
        redPosition: { row: 3, col: 4 },
        bluePosition: { row: 4, col: 4 },
        placedWalls: walls,
      }),
    );
    // Only the left lateral {4,3} should remain
    expect(result.length).toBe(1);
    expect(result[0].landPos).toEqual({ row: 4, col: 3 });
  });

  it('returns empty when all deflected landings are blocked', () => {
    // Red at {3,0}, Blue at {4,0} — left is out of bounds, right blocked by wall,
    // straight blocked by wall
    const walls: Edge[] = [
      { from: { row: 4, col: 0 }, to: { row: 5, col: 0 } }, // blocks straight jump
      { from: { row: 4, col: 0 }, to: { row: 4, col: 1 } }, // blocks only lateral
    ];
    const result = getDeflectedJumps(
      makeState({
        redPosition: { row: 3, col: 0 },
        bluePosition: { row: 4, col: 0 },
        placedWalls: walls,
      }),
    );
    expect(result).toEqual([]);
  });

  it('works correctly for blue moving upward into red', () => {
    // Blue at {5,4} (currentTurn=blue), Red at {4,4}, straight jump blocked by wall
    const wall: Edge = { from: { row: 3, col: 4 }, to: { row: 4, col: 4 } };
    const result = getDeflectedJumps(
      makeState({
        currentTurn: 'blue',
        redPosition: { row: 4, col: 4 },
        bluePosition: { row: 5, col: 4 },
        placedWalls: [wall],
      }),
    );
    expect(result.length).toBeGreaterThan(0);
    for (const dj of result) {
      expect(dj.jumpDir).toBe('up');
      expect(dj.landPos.row).toBe(4);
    }
  });
});
