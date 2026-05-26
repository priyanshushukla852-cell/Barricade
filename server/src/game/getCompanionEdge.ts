import type { Edge } from '@shared/types';

export function getCompanionEdge(wall: Edge): Edge | null {
  if (wall.from.row === wall.to.row) {
    if (wall.from.row + 1 > 8) return null;
    return {
      from: { row: wall.from.row + 1, col: wall.from.col },
      to: { row: wall.from.row + 1, col: wall.to.col },
    };
  }
  if (wall.from.col + 1 > 8) return null;
  return {
    from: { row: wall.from.row, col: wall.from.col + 1 },
    to: { row: wall.to.row, col: wall.to.col + 1 },
  };
}
