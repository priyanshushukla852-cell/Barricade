import { wallsIntersect } from '../wallsIntersect';
import type { Edge } from '@shared/types';

// 1-unit walls span exactly one edge and can only share endpoints, never cross.
// All cases return false by geometric necessity.
describe('wallsIntersect', () => {
  it('two horizontal walls: returns false', () => {
    const a: Edge = { from: { row: 2, col: 3 }, to: { row: 2, col: 4 } };
    const b: Edge = { from: { row: 2, col: 5 }, to: { row: 2, col: 6 } };
    expect(wallsIntersect(a, b)).toBe(false);
  });

  it('two vertical walls: returns false', () => {
    const a: Edge = { from: { row: 2, col: 3 }, to: { row: 3, col: 3 } };
    const b: Edge = { from: { row: 4, col: 3 }, to: { row: 5, col: 3 } };
    expect(wallsIntersect(a, b)).toBe(false);
  });

  it('one horizontal and one vertical sharing only an endpoint: returns false', () => {
    // Horizontal (2,3)↔(2,4) and vertical (2,4)↔(3,4) share the corner {2,4}
    const a: Edge = { from: { row: 2, col: 3 }, to: { row: 2, col: 4 } };
    const b: Edge = { from: { row: 2, col: 4 }, to: { row: 3, col: 4 } };
    expect(wallsIntersect(a, b)).toBe(false);
  });
});
