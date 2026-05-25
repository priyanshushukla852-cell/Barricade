import type { Edge } from '@shared/types';

/**
 * Returns true if two 2-unit walls cross at a grid intersection point.
 *
 * A vertical 2-unit wall (horizontal adjacency edge, e.g. from.row===to.row) has its midpoint
 * at grid row (from.row + 1), grid col (from.col + 1).
 * A horizontal 2-unit wall (vertical adjacency edge) has its midpoint at
 * grid row (from.row + 1), grid col (from.col + 1).
 *
 * They cross iff they have opposite orientations and identical from positions.
 */
export function wallsIntersect(a: Edge, b: Edge): boolean {
  const aIsVertBar = a.from.row === a.to.row; // horizontal adjacency → vertical bar
  const bIsVertBar = b.from.row === b.to.row;
  if (aIsVertBar === bIsVertBar) return false; // parallel — can never cross
  return a.from.row === b.from.row && a.from.col === b.from.col;
}
