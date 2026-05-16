import type { Edge, GameState } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';
import { wallsIntersect } from './wallsIntersect';
import { pathExists } from './pathExists';
import { BLUE_GOAL, RED_GOAL } from './boardConfig';

export function isWallPlacementValid(state: GameState, wall: Edge): boolean {
  const normalized = normalizeEdge(wall);

  // Check 1 — Adjacency
  const rowDiff = Math.abs(normalized.from.row - normalized.to.row);
  const colDiff = Math.abs(normalized.from.col - normalized.to.col);
  if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) return false;

  // Check 2 — No overlap
  const duplicate = state.placedWalls.some(
    (w) =>
      w.from.row === normalized.from.row &&
      w.from.col === normalized.from.col &&
      w.to.row === normalized.to.row &&
      w.to.col === normalized.to.col,
  );
  if (duplicate) return false;

  // Check 3 — No intersection
  if (state.placedWalls.some((w) => wallsIntersect(normalized, w))) return false;

  // Check 4 — Walls remaining
  const hasWalls =
    state.currentTurn === 'red' ? state.redWallsRemaining > 0 : state.blueWallsRemaining > 0;
  if (!hasWalls) return false;

  // Check 5 — Path rule
  const hypothetical = [...state.placedWalls, normalized];
  if (!pathExists(hypothetical, state.redPosition, RED_GOAL)) return false;
  if (!pathExists(hypothetical, state.bluePosition, BLUE_GOAL)) return false;

  return true;
}
