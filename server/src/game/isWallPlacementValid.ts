import type { Edge, GameState, Position } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';
import { wallsIntersect } from './wallsIntersect';
import { getCompanionEdge } from './getCompanionEdge';
import { getAdjacentSquare } from './getAdjacentSquare';
import { isWallBlocking } from './isWallBlocking';

const DIRS = ['up', 'down', 'left', 'right'] as const;

// Single BFS that terminates on any cell in targetRow — replaces the old 9-call loop
// over pathExists() which ran one full BFS per column (18 BFS per wall validation).
function hasPathToRow(walls: Edge[], from: Position, targetRow: number): boolean {
  if (from.row === targetRow) return true;
  const visited = new Uint8Array(81);
  visited[from.row * 9 + from.col] = 1;
  const queue: Position[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const dir of DIRS) {
      const next = getAdjacentSquare(cur, dir);
      if (!next || isWallBlocking(walls, cur, next)) continue;
      if (next.row === targetRow) return true;
      const key = next.row * 9 + next.col;
      if (visited[key]) continue;
      visited[key] = 1;
      queue.push(next);
    }
  }
  return false;
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

// wallsIntersect is only valid when both arguments are primary edges.
// applyWall always appends [primary, companion] so even-indexed entries are primaries.
function filterToPrimary(walls: Edge[]): Edge[] {
  return walls.filter((_, i) => i % 2 === 0);
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

  // Two 2-unit walls cross iff their primary edges satisfy wallsIntersect.
  // Comparing against companion edges produces false positives (they only touch
  // endpoints, not interior points), so compare primary-vs-primary only.
  const existingPrimaries = filterToPrimary(state.placedWalls);
  if (existingPrimaries.some((w) => wallsIntersect(normalized, w))) return false;

  // Both players must still have a path to their goal row after placing both edges.
  const hypothetical = [...state.placedWalls, normalized, companion];
  if (!hasPathToRow(hypothetical, state.redPosition, 8)) return false;
  if (!hasPathToRow(hypothetical, state.bluePosition, 0)) return false;

  return true;
}
