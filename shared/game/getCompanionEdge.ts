import type { Edge } from '@shared/types';

/**
 * Returns the second edge of a 2-unit wall, or null if it would extend off-board.
 * - Vertical wall (horizontal adjacency): companion is the same column boundary one row below.
 * - Horizontal wall (vertical adjacency): companion is the same row boundary one column to the right.
 */
export function getCompanionEdge(wall: Edge): Edge | null {
  if (wall.from.row === wall.to.row) {
    // Vertical wall bar — extends down one more row
    if (wall.from.row + 1 > 8) return null;
    return {
      from: { row: wall.from.row + 1, col: wall.from.col },
      to: { row: wall.from.row + 1, col: wall.to.col },
    };
  }
  // Horizontal wall bar — extends right one more column
  if (wall.from.col + 1 > 8) return null;
  return {
    from: { row: wall.from.row, col: wall.from.col + 1 },
    to: { row: wall.to.row, col: wall.to.col + 1 },
  };
}
