import type { Edge, GameState, Position } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';
import { wallsIntersect } from './wallsIntersect';
import { pathExists } from './pathExists';
import { getCompanionEdge } from './getCompanionEdge';
import { BOARD_SIZE } from './boardConfig';

function hasPathToRow(walls: Edge[], from: Position, targetRow: number): boolean {
  return Array.from({ length: BOARD_SIZE }, (_, col) => col).some((col) =>
    pathExists(walls, from, { row: targetRow, col }),
  );
}

function isDuplicate(walls: Edge[], edge: Edge): boolean {
  return walls.some(
    (w) =>
      w.from.row === edge.from.row &&
      w.from.col === edge.from.col &&
      w.to.row === edge.to.row &&
      w.to.col === edge.to.col,
  );
}

function filterToPrimary(walls: Edge[]): Edge[] {
  return walls.filter((wall) => {
    if (wall.from.row === wall.to.row) {
      return (
        wall.from.row === 0 ||
        !walls.some(
          (w) =>
            w.from.row === wall.from.row - 1 &&
            w.from.col === wall.from.col &&
            w.to.row === wall.to.row - 1 &&
            w.to.col === wall.to.col,
        )
      );
    }
    return (
      wall.from.col === 0 ||
      !walls.some(
        (w) =>
          w.from.row === wall.from.row &&
          w.from.col === wall.from.col - 1 &&
          w.to.row === wall.to.row &&
          w.to.col === wall.to.col - 1,
      )
    );
  });
}

export function isWallPlacementValid(state: GameState, wall: Edge): boolean {
  const normalized = normalizeEdge(wall);

  const rowDiff = Math.abs(normalized.from.row - normalized.to.row);
  const colDiff = Math.abs(normalized.from.col - normalized.to.col);
  if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) return false;

  const companion = getCompanionEdge(normalized);
  if (!companion) return false;

  const hasWalls =
    state.currentTurn === 'red' ? state.redWallsRemaining > 0 : state.blueWallsRemaining > 0;
  if (!hasWalls) return false;

  if (isDuplicate(state.placedWalls, normalized)) return false;
  if (isDuplicate(state.placedWalls, companion)) return false;

  const existingPrimaries = filterToPrimary(state.placedWalls);
  if (existingPrimaries.some((w) => wallsIntersect(normalized, w))) return false;

  const hypothetical = [...state.placedWalls, normalized, companion];
  if (!hasPathToRow(hypothetical, state.redPosition, 8)) return false;
  if (!hasPathToRow(hypothetical, state.bluePosition, 0)) return false;

  return true;
}
