import type { Edge, GameState } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';
import { wallsIntersect } from './wallsIntersect';
import { pathExists } from './pathExists';
import { getCompanionEdge } from './getCompanionEdge';
import { BLUE_GOAL, RED_GOAL } from './boardConfig';

function isDuplicate(walls: Edge[], edge: Edge): boolean {
  return walls.some(
    (w) =>
      w.from.row === edge.from.row &&
      w.from.col === edge.from.col &&
      w.to.row === edge.to.row &&
      w.to.col === edge.to.col,
  );
}

export function isWallPlacementValid(state: GameState, wall: Edge): boolean {
  const normalized = normalizeEdge(wall);

  const rowDiff = Math.abs(normalized.from.row - normalized.to.row);
  const colDiff = Math.abs(normalized.from.col - normalized.to.col);
  if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) return false;

  // Each wall is 2 units — the companion edge must be on-board.
  const companion = getCompanionEdge(normalized);
  if (!companion) return false;

  const hasWalls =
    state.currentTurn === 'red' ? state.redWallsRemaining > 0 : state.blueWallsRemaining > 0;
  if (!hasWalls) return false;

  // Neither the primary nor companion edge may already be occupied.
  if (isDuplicate(state.placedWalls, normalized)) return false;
  if (isDuplicate(state.placedWalls, companion)) return false;

  // Neither edge may cross an existing wall.
  if (state.placedWalls.some((w) => wallsIntersect(normalized, w) || wallsIntersect(companion, w)))
    return false;

  // Both players must still have a path to their goal after placing both edges.
  const hypothetical = [...state.placedWalls, normalized, companion];
  if (!pathExists(hypothetical, state.redPosition, RED_GOAL)) return false;
  if (!pathExists(hypothetical, state.bluePosition, BLUE_GOAL)) return false;

  return true;
}
