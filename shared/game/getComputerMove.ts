import type { Direction, Edge, GameState, PieceColor, Position } from '@shared/types';
import { getValidMoves } from './getValidMoves';
import { applyMove } from './applyMove';
import { applyWall } from './applyWall';
import { checkWinner } from './checkWinner';
import { isWallPlacementValid } from './isWallPlacementValid';
import { normalizeEdge } from './normalizeEdge';
import { getCompanionEdge } from './getCompanionEdge';
import { getAdjacentSquare } from './getAdjacentSquare';
import { isWallBlocking } from './isWallBlocking';

export type ComputerAction =
  | { type: 'move'; direction: Direction }
  | { type: 'wall'; edge: Edge };

export type AiDifficulty = 'easy' | 'hard';

// ─── Shared BFS helpers ──────────────────────────────────────────────────────

const DIRS = ['up', 'down', 'left', 'right'] as const;

function bfsDistance(walls: Edge[], from: Position, targetRow: number): number {
  if (from.row === targetRow) return 0;
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

// Returns the full BFS path from `from` to the closest square in `targetRow`,
// or null if unreachable.
function bfsPath(walls: Edge[], from: Position, targetRow: number): Position[] | null {
  if (from.row === targetRow) return [from];
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

// ─── Wall helpers ────────────────────────────────────────────────────────────

function edgesEqual(a: Edge, b: Edge): boolean {
  return (
    a.from.row === b.from.row && a.from.col === b.from.col &&
    a.to.row === b.to.row && a.to.col === b.to.col
  );
}

function wallBlocksPath(edge: Edge, companion: Edge, path: Position[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const norm = normalizeEdge({ from: path[i], to: path[i + 1] });
    if (edgesEqual(norm, edge) || edgesEqual(norm, companion)) return true;
  }
  return false;
}

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

// ─── Easy: greedy BFS toward own goal; places path-blocking walls ────────────

// Returns the first valid wall that cuts the opponent's current shortest path.
function blockingWall(state: GameState): Edge | null {
  const current = state.currentTurn;
  const oppPos = current === 'red' ? state.bluePosition : state.redPosition;
  const oppGoalRow = current === 'red' ? 0 : 8;

  const oppPath = bfsPath(state.placedWalls, oppPos, oppGoalRow);
  if (!oppPath) return null;

  for (const edge of allWallCandidates()) {
    const companion = getCompanionEdge(edge);
    if (!companion) continue;
    if (!wallBlocksPath(edge, companion, oppPath)) continue;
    if (isWallPlacementValid(state, edge)) return edge;
  }
  return null;
}

function easyMove(state: GameState): ComputerAction {
  const computer = state.currentTurn;
  const myGoalRow = computer === 'red' ? 8 : 0;
  const wallsRemaining = computer === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;
  const oppPos = computer === 'red' ? state.bluePosition : state.redPosition;
  const oppGoalRow = computer === 'red' ? 0 : 8;

  if (wallsRemaining > 0) {
    const oppDist = bfsDistance(state.placedWalls, oppPos, oppGoalRow);
    // Always try to block if opponent is about to win (and save at least 1 wall).
    const mustBlock = oppDist <= 2 && wallsRemaining > 1;
    // Only spend walls opportunistically when we still have plenty left (>3),
    // and only 20% of the time so walls last through the game.
    const spendOpportunistically = wallsRemaining > 3 && Math.random() < 0.20;
    if (mustBlock || spendOpportunistically) {
      const wall = blockingWall(state) ?? randomValidWall(state);
      if (wall) return { type: 'wall', edge: wall };
    }
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

// ─── Hard: minimax with alpha-beta pruning ───────────────────────────────────

const SEARCH_DEPTH = 4;
const MAX_WALL_CANDIDATES = 8;

// Evaluation from `aiColor`'s perspective — higher is better.
// Blocking the opponent (2×) is weighted more than advancing yourself (1×).
// A small wall-count bonus discourages burning walls wastefully early.
function evaluate(state: GameState, aiColor: PieceColor): number {
  const myPos  = aiColor === 'red' ? state.redPosition  : state.bluePosition;
  const oppPos = aiColor === 'red' ? state.bluePosition : state.redPosition;
  const myGoalRow  = aiColor === 'red' ? 8 : 0;
  const oppGoalRow = aiColor === 'red' ? 0 : 8;
  const myDist  = bfsDistance(state.placedWalls, myPos,  myGoalRow);
  const oppDist = bfsDistance(state.placedWalls, oppPos, oppGoalRow);
  const myWalls  = aiColor === 'red' ? state.redWallsRemaining  : state.blueWallsRemaining;
  const oppWalls = aiColor === 'red' ? state.blueWallsRemaining : state.redWallsRemaining;
  return 2 * oppDist - myDist + 0.3 * (myWalls - oppWalls);
}

// Returns up to MAX_WALL_CANDIDATES walls for the current player.
// Pre-filters cheaply via wallBlocksPath before running the expensive
// isWallPlacementValid BFS, keeping the search branching factor small.
function searchWallCandidates(state: GameState): Edge[] {
  const current = state.currentTurn;
  const myPos  = current === 'red' ? state.redPosition  : state.bluePosition;
  const oppPos = current === 'red' ? state.bluePosition : state.redPosition;
  const myGoalRow  = current === 'red' ? 8 : 0;
  const oppGoalRow = current === 'red' ? 0 : 8;
  const wallsLeft  = current === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;
  if (wallsLeft === 0) return [];

  const oppPath = bfsPath(state.placedWalls, oppPos, oppGoalRow);
  if (!oppPath) return [];

  const curOppDist = oppPath.length - 1;
  const curMyDist  = bfsDistance(state.placedWalls, myPos, myGoalRow);

  const scored: Array<{ edge: Edge; score: number }> = [];

  for (const edge of allWallCandidates()) {
    const companion = getCompanionEdge(edge);
    if (!companion) continue;
    // Cheap filter: ignore walls that don't cut the opponent's current path.
    if (!wallBlocksPath(edge, companion, oppPath)) continue;
    // Full validity check (overlap + intersection + path existence).
    if (!isWallPlacementValid(state, edge)) continue;

    const hypo = [...state.placedWalls, edge, companion];
    const newOppDist = bfsDistance(hypo, oppPos, oppGoalRow);
    const newMyDist  = bfsDistance(hypo, myPos,  myGoalRow);
    const score = 2 * (newOppDist - curOppDist) - (newMyDist - curMyDist);
    if (score > 0) scored.push({ edge, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_WALL_CANDIDATES).map(s => s.edge);
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  aiColor: PieceColor,
): number {
  const winner = checkWinner(state);
  if (winner !== null) {
    // Add depth bonus so the AI prefers winning sooner and losing later.
    return winner === aiColor ? 10000 + depth : -(10000 + depth);
  }
  if (depth === 0) return evaluate(state, aiColor);

  const isMax = state.currentTurn === aiColor;
  let best = isMax ? -Infinity : Infinity;

  // ── Evaluate move actions ────────────────────────────────────────────────
  for (const dir of getValidMoves(state)) {
    let next: GameState;
    try { next = applyMove(state, dir); } catch { continue; }
    const score = minimax(next, depth - 1, alpha, beta, aiColor);
    if (isMax) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }

  // ── Evaluate wall actions (skip if already cut off by alpha-beta) ────────
  if (beta > alpha) {
    for (const edge of searchWallCandidates(state)) {
      let next: GameState;
      try { next = applyWall(state, edge); } catch { continue; }
      const score = minimax(next, depth - 1, alpha, beta, aiColor);
      if (isMax) {
        if (score > best) best = score;
        if (best > alpha) alpha = best;
      } else {
        if (score < best) best = score;
        if (best < beta) beta = best;
      }
      if (beta <= alpha) break;
    }
  }

  // Fallback if no actions were found (shouldn't occur in a valid game state).
  return best === (isMax ? -Infinity : Infinity) ? evaluate(state, aiColor) : best;
}

function hardMove(state: GameState): ComputerAction {
  const computer = state.currentTurn;

  // Take an immediate win without burning search budget.
  for (const dir of getValidMoves(state)) {
    try {
      const next = applyMove(state, dir);
      if (checkWinner(next)) return { type: 'move', direction: dir };
    } catch { /* skip */ }
  }

  const dirs = getValidMoves(state);
  const wallEdges = searchWallCandidates(state);

  let bestAction: ComputerAction = { type: 'move', direction: dirs[0] ?? 'up' };
  let bestScore = -Infinity;

  for (const dir of dirs) {
    let next: GameState;
    try { next = applyMove(state, dir); } catch { continue; }
    const score = minimax(next, SEARCH_DEPTH - 1, -Infinity, Infinity, computer);
    if (score > bestScore) {
      bestScore = score;
      bestAction = { type: 'move', direction: dir };
    }
  }

  for (const edge of wallEdges) {
    let next: GameState;
    try { next = applyWall(state, edge); } catch { continue; }
    const score = minimax(next, SEARCH_DEPTH - 1, -Infinity, Infinity, computer);
    if (score > bestScore) {
      bestScore = score;
      bestAction = { type: 'wall', edge };
    }
  }

  return bestAction;
}

export function getComputerMove(state: GameState, difficulty: AiDifficulty): ComputerAction {
  return difficulty === 'hard' ? hardMove(state) : easyMove(state);
}
