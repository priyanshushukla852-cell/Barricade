import { isWallBlocking } from '../isWallBlocking';
import type { Edge } from '@shared/types';

describe('isWallBlocking', () => {
  it('returns false on an empty walls array', () => {
    expect(isWallBlocking([], { row: 0, col: 0 }, { row: 0, col: 1 })).toBe(false);
  });

  it('returns true when the exact normalized edge is in walls', () => {
    const walls: Edge[] = [{ from: { row: 2, col: 3 }, to: { row: 2, col: 4 } }];
    expect(isWallBlocking(walls, { row: 2, col: 3 }, { row: 2, col: 4 })).toBe(true);
  });

  it('returns true regardless of from/to order passed (normalizes before checking)', () => {
    const walls: Edge[] = [{ from: { row: 2, col: 3 }, to: { row: 2, col: 4 } }];
    expect(isWallBlocking(walls, { row: 2, col: 4 }, { row: 2, col: 3 })).toBe(true);
  });

  it('returns false when a different edge is in walls', () => {
    const walls: Edge[] = [{ from: { row: 1, col: 1 }, to: { row: 1, col: 2 } }];
    expect(isWallBlocking(walls, { row: 3, col: 3 }, { row: 3, col: 4 })).toBe(false);
  });

  it('does not mutate the walls array', () => {
    const walls: Edge[] = [{ from: { row: 0, col: 0 }, to: { row: 0, col: 1 } }];
    const wallsBefore = JSON.stringify(walls);
    isWallBlocking(walls, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(JSON.stringify(walls)).toBe(wallsBefore);
  });
});
