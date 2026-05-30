import type { Direction, Edge, GameState, Position } from '@shared/types';
import { getValidMoves } from './getValidMoves';
import { applyMove } from './applyMove';
import { isWallPlacementValid } from './isWallPlacementValid';
import { normalizeEdge } from './normalizeEdge';
import { getCompanionEdge } from './getCompanionEdge';
import { getAdjacentSquare } from './getAdjacentSquare';
import { isWallBlocking } from './isWallBlocking';

export type ComputerAction =
  | { type: 'move'; direction: Direction }
  | { type: 'wall'; edge: Edge };

export type AiDifficulty = 'easy' | 'hard';

// BFS shortest distance from `from` to any square in `targetRow`.
function bfsDistance(walls: Edge[], from: Position, targetRow: number): number {
  if (from.row === targetRow) return 0;
  const DIRS = ['up', 'down', 'left', 'right'] as const;
  const visited = new Set<string>([`${from.row},${from.col}`]);
  const queue: Array<{ pos: Position; dist: number }> = [{ pos: from, dist: 0 }];
  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    for (const dir of DIRS) {
      const next = getAdjacentSquare(pos, dir);
      if (!next) continue;
      if (isWallBlocking(walls, pos, next)) continue;
      const key = `${next.row},${next.col}`;
      if (visited.has(key)) continue;
      if (next.row === targetRow) return dist + 1;
      visited.add(key);
      queue.push({ pos: next, dist: dist + 1 });
    }
  }
  return Infinity;
}

// BFS shortest path — returns list of positions from `from` to goal row (inclusive),
// or null if no path exists.
function bfsPath(walls: Edge[], from: Position, targetRow: number): Position[] | null {
  if (from.row === targetRow) return [from];
  const DIRS = ['up', 'down', 'left', 'right'] as const;
  const parent = new Map<string, string | null>();
  const posMap = new Map<string, Position>();
  const fromKey = `${from.row},${from.col}`;
  parent.set(fromKey, null);
  posMap.set(fromKey, from);
  const queue: Position[] = [from];
  let goalKey: string | null = null;

  outer:
  while (queue.length > 0) {
    const pos = queue.shift()!;
    const posKey = `${pos.row},${pos.col}`;
    for (const dir of DIRS) {
      const next = getAdjacentSquare(pos, dir);
      if (!next) continue;
      if (isWallBlocking(walls, pos, next)) continue;
      const key = `${next.row},${next.col}`;
      if (parent.has(key)) continue;
      parent.set(key, posKey);
      posMap.set(key, next);
      if (next.row === targetRow) { goalKey = key; break outer; }
      queue.push(next);
    }
  }

  if (!goalKey) return null;
  const path: Position[] = [];
  let cur: string | null = goalKey;
  while (cur !== null) {
    path.unshift(posMap.get(cur)!);
    cur = parent.get(cur) ?? null;
  }
  return path;
}

// Returns true if the opponent at `oppPos` could jump over `myNewPos` next turn.
// A jump is possible when: opponent is adjacent to myNewPos, no wall between them,
// the square behind myNewPos (same direction) is in-bounds and unblocked.
function couldBeJumped(walls: Edge[], myNewPos: Position, oppPos: Position): boolean {
  const DIRS = ['up', 'down', 'left', 'right'] as const;
  for (const dir of DIRS) {
    const adj = getAdjacentSquare(oppPos, dir);
    if (!adj) continue;
    if (adj.row !== myNewPos.row || adj.col !== myNewPos.col) continue;
    if (isWallBlocking(walls, oppPos, myNewPos)) continue;
    const jumpTarget = getAdjacentSquare(myNewPos, dir);
    if (!jumpTarget) continue;
    if (isWallBlocking(walls, myNewPos, jumpTarget)) continue;
    return true;
  }
  return false;
}

function edgesEqual(a: Edge, b: Edge): boolean {
  return (
    a.from.row === b.from.row && a.from.col === b.from.col &&
    a.to.row === b.to.row && a.to.col === b.to.col
  );
}

// Returns true if the wall (primary + companion) blocks any step on `path`.
function wallBlocksPath(edge: Edge, companion: Edge, path: Position[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const norm = normalizeEdge({ from: path[i], to: path[i + 1] });
    if (edgesEqual(norm, edge) || edgesEqual(norm, companion)) return true;
  }
  return false;
}

// All 128 primary wall edges (8×8 per orientation, companion always goes right/down).
function allWallCandidates(): Edge[] {
  const candidates: Edge[] = [];
  for (let row = 0; row <= 7; row++) {
    for (let col = 0; col <= 7; col++) {
      candidates.push(normalizeEdge({ from: { row, col }, to: { row, col: col + 1 } }));
      candidates.push(normalizeEdge({ from: { row, col }, to: { row: row + 1, col } }));
    }
  }
  return candidates;
}

function randomValidWall(state: GameState): Edge | null {
  const shuffled = allWallCandidates().sort(() => Math.random() - 0.5);
  for (const edge of shuffled) {
    if (isWallPlacementValid(state, edge)) return edge;
  }
  return null;
}

// ─── Easy: greedy BFS toward own goal; occasionally places a random wall ────
function easyMove(state: GameState): ComputerAction {
  const computer = state.currentTurn;
  const myGoalRow = computer === 'red' ? 8 : 0;
  const wallsRemaining = computer === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;

  if (wallsRemaining > 0 && Math.random() < 0.15) {
    const wall = randomValidWall(state);
    if (wall) return { type: 'wall', edge: wall };
  }

  const validDirs = getValidMoves(state);
  let bestDir = validDirs[0];
  let bestDist = Infinity;

  for (const dir of validDirs) {
    try {
      const next = applyMove(state, dir);
      const newMyPos = computer === 'red' ? next.redPosition : next.bluePosition;
      const dist = bfsDistance(state.placedWalls, newMyPos, myGoalRow);
      if (dist < bestDist) { bestDist = dist; bestDir = dir; }
    } catch { /* invalid move */ }
  }

  return { type: 'move', direction: bestDir };
}

// ─── Hard: jump-aware race logic with opponent-path targeted walls ───────────
function hardMove(state: GameState): ComputerAction {
  const computer = state.currentTurn;
  const myPos = computer === 'red' ? state.redPosition : state.bluePosition;
  const oppPos = computer === 'red' ? state.bluePosition : state.redPosition;
  const myGoalRow = computer === 'red' ? 8 : 0;
  const oppGoalRow = computer === 'red' ? 0 : 8;
  const wallsRemaining = computer === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;

  const curMyDist = bfsDistance(state.placedWalls, myPos, myGoalRow);
  const curOppDist = bfsDistance(state.placedWalls, oppPos, oppGoalRow);

  // ── 1. Immediate win ──────────────────────────────────────────────────────
  const validDirs = getValidMoves(state);
  for (const dir of validDirs) {
    try {
      const next = applyMove(state, dir);
      const newMyPos = computer === 'red' ? next.redPosition : next.bluePosition;
      if (newMyPos.row === myGoalRow) return { type: 'move', direction: dir };
    } catch { /* skip */ }
  }

  // ── 2. Best move direction (jump-penalized) ───────────────────────────────
  let bestDir = validDirs[0];
  let bestMoveScore = Infinity;

  for (const dir of validDirs) {
    try {
      const next = applyMove(state, dir);
      const newMyPos = computer === 'red' ? next.redPosition : next.bluePosition;
      let dist = bfsDistance(state.placedWalls, newMyPos, myGoalRow);
      // Penalise positions where opponent can jump over us next turn
      if (couldBeJumped(state.placedWalls, newMyPos, oppPos)) dist += 2;
      if (dist < bestMoveScore) { bestMoveScore = dist; bestDir = dir; }
    } catch { /* skip */ }
  }

  // ── 3. Wall evaluation ────────────────────────────────────────────────────
  if (wallsRemaining > 0) {
    const oppPath = bfsPath(state.placedWalls, oppPos, oppGoalRow);

    let bestWall: Edge | null = null;
    let bestWallScore = -Infinity;

    for (const edge of allWallCandidates()) {
      if (!isWallPlacementValid(state, edge)) continue;
      const companion = getCompanionEdge(edge)!;
      const hypo = [...state.placedWalls, edge, companion];

      const newOppDist = bfsDistance(hypo, oppPos, oppGoalRow);
      const newMyDist = bfsDistance(hypo, myPos, myGoalRow);

      const oppGain = newOppDist - curOppDist;
      const myLoss = newMyDist - curMyDist;

      // Weight blocking the opponent twice as much as slowing ourselves.
      let score = 2 * oppGain - myLoss;

      // Bonus for cutting directly across the opponent's actual shortest path.
      if (oppPath && wallBlocksPath(edge, companion, oppPath)) score += 1;

      if (score > bestWallScore) { bestWallScore = score; bestWall = edge; }
    }

    // Threshold scales with race gap:
    //   winning by 2+  → only place exceptional walls (avoid wasting turns)
    //   tied/slightly ahead → standard threshold
    //   losing          → any net-positive wall
    const raceGap = curMyDist - curOppDist; // positive = AI is losing the race
    const threshold = raceGap <= -2 ? 4 : raceGap <= 0 ? 2 : 1;

    if (bestWall !== null && bestWallScore >= threshold) {
      return { type: 'wall', edge: bestWall };
    }
  }

  return { type: 'move', direction: bestDir };
}

export function getComputerMove(state: GameState, difficulty: AiDifficulty): ComputerAction {
  return difficulty === 'hard' ? hardMove(state) : easyMove(state);
}
