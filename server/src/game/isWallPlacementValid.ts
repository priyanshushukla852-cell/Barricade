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

// applyWall always appends [primary, companion], so even-indexed entries are primaries.
function filterToPrimary(walls: Edge[]): Edge[] {
  return walls.filter((_, i) => i % 2 === 0);
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
