import { pathExists } from '../pathExists';
import type { Edge } from '@shared/types';

describe('pathExists', () => {
  it('empty wall array: path exists between any two squares', () => {
    expect(pathExists([], { row: 0, col: 0 }, { row: 8, col: 8 })).toBe(true);
  });

  it('from equals target: returns true', () => {
    expect(pathExists([], { row: 3, col: 3 }, { row: 3, col: 3 })).toBe(true);
  });

  it('adjacent squares with no wall between them: returns true', () => {
    expect(pathExists([], { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
  });

  it('single wall blocking direct route but alternate exists: returns true', () => {
    // Wall between (4,4) and (4,5) — direct right step blocked, but path via row 3 exists
    const wall: Edge = { from: { row: 4, col: 4 }, to: { row: 4, col: 5 } };
    expect(pathExists([wall], { row: 4, col: 4 }, { row: 4, col: 5 })).toBe(true);
  });

  it('adjacent squares with wall between them: returns true via alternate route', () => {
    // Wall between (0,0) and (0,1) — can still reach (0,1) via (1,0)→(1,1)→(0,1)
    const wall: Edge = { from: { row: 0, col: 0 }, to: { row: 0, col: 1 } };
    expect(pathExists([wall], { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
  });

  it('complete horizontal barrier across all 9 columns: returns false', () => {
    // 9 walls sealing every passage between rows 4 and 5
    const barrier: Edge[] = Array.from({ length: 9 }, (_, col) => ({
      from: { row: 4, col },
      to: { row: 5, col },
    }));
    expect(pathExists(barrier, { row: 0, col: 4 }, { row: 8, col: 4 })).toBe(false);
  });
});
