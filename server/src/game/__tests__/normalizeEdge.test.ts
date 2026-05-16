import { normalizeEdge } from '../normalizeEdge';
import type { Edge } from '@shared/types';

describe('normalizeEdge', () => {
  it('returns same values when edge is already normalized (smaller row in from)', () => {
    const edge: Edge = { from: { row: 1, col: 4 }, to: { row: 2, col: 4 } };
    const result = normalizeEdge(edge);
    expect(result).toEqual({ from: { row: 1, col: 4 }, to: { row: 2, col: 4 } });
  });

  it('swaps from/to when from has a larger row', () => {
    const edge: Edge = { from: { row: 3, col: 4 }, to: { row: 2, col: 4 } };
    const result = normalizeEdge(edge);
    expect(result).toEqual({ from: { row: 2, col: 4 }, to: { row: 3, col: 4 } });
  });

  it('swaps from/to when rows are equal but from has a larger col', () => {
    const edge: Edge = { from: { row: 4, col: 5 }, to: { row: 4, col: 3 } };
    const result = normalizeEdge(edge);
    expect(result).toEqual({ from: { row: 4, col: 3 }, to: { row: 4, col: 5 } });
  });

  it('does not mutate the input edge', () => {
    const edge: Edge = { from: { row: 5, col: 6 }, to: { row: 4, col: 6 } };
    const fromBefore = { ...edge.from };
    const toBefore = { ...edge.to };
    normalizeEdge(edge);
    expect(edge.from).toEqual(fromBefore);
    expect(edge.to).toEqual(toBefore);
  });
});
