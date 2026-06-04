import type { Direction, Edge, GameState, PieceColor, Position } from '@shared/types';
import { getValidMoves, getDeflectedJumps } from './getValidMoves';
import { applyMove } from './applyMove';
import { applyWall } from './applyWall';
import { checkWinner } from './checkWinner';
import { isWallPlacementValid } from './isWallPlacementValid';
import { normalizeEdge } from './normalizeEdge';
import { getCompanionEdge } from './getCompanionEdge';
import { getAdjacentSquare } from './getAdjacentSquare';
import { isWallBlocking } from './isWallBlocking';

export type ComputerAction =
  | { type: 'move'; direction: Direction; landingOverride?: Position }
  | { type: 'wall'; edge: Edge };

export type AiDifficulty = 'easy' | 'hard';

// ─── Shared BFS helpers ──────────────────────────────────────────────────────

const DIRS = ['up', 'down', 'left', 'right'] as const;

function bfsDistance(walls: Edge[], from: Position, targetRow: number): number {
  if (from.row === targetRow) return 0;
  const visited = new Uint8Array(81);
  visited[from.row * 9 + from.col] = 1;
  const queue: Array<{ pos: Position; dist: number }> = [{ pos: from, dist: 0 }];
  while (queue.length > 0) {
    const { pos, dist } = queue.shift()!;
    for (const dir of DIRS) {
      const next = getAdjacentSquare(pos, dir);
      if (!next) continue;
      if (isWallBlocking(walls, pos, next)) continue;
      const key = next.row * 9 + next.col;
      if (visited[key]) continue;
      if (next.row === targetRow) return dist + 1;
      visited[key] = 1;
      queue.push({ pos: next, dist: dist + 1 });
    }
  }
  return Infinity;
}

// Returns the full BFS path from `from` to the closest square in `targetRow`,
// or null if unreachable.
function bfsPath(walls: Edge[], from: Position, targetRow: number): Position[] | null {
  if (from.row === targetRow) return [from];
  const parent = new Map<number, number | null>();
  const posMap = new Map<number, Position>();
  const fromKey = from.row * 9 + from.col;
  parent.set(fromKey, null);
  posMap.set(fromKey, from);
  const queue: Position[] = [from];
  let goalKey: number | null = null;

  outer:
  while (queue.length > 0) {
    const pos = queue.shift()!;
    const posKey = pos.row * 9 + pos.col;
    for (const dir of DIRS) {
      const next = getAdjacentSquare(pos, dir);
      if (!next) continue;
      if (isWallBlocking(walls, pos, next)) continue;
      const key = next.row * 9 + next.col;
      if (parent.has(key)) continue;
      parent.set(key, posKey);
      posMap.set(key, next);
      if (next.row === targetRow) { goalKey = key; break outer; }
      queue.push(next);
    }
  }

  if (goalKey === null) return null;
  const path: Position[] = [];
  let cur: number | null = goalKey;
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

// Fix #10: proper Fisher-Yates shuffle instead of biased Array.sort random comparator.
function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomValidWall(state: GameState): Edge | null {
  for (const edge of shuffled(allWallCandidates())) {
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
    // Fix #6: use last wall for emergency blocking — removed `wallsRemaining > 1` guard
    // so the AI always blocks when opponent is about to win, even with 1 wall left.
    const mustBlock = oppDist <= 2;
    // Only spend walls opportunistically when we still have plenty left (>3),
    // and only 20% of the time so walls last through the game.
    const spendOpportunistically = wallsRemaining > 3 && Math.random() < 0.20;
    if (mustBlock || spendOpportunistically) {
      const wall = blockingWall(state) ?? randomValidWall(state);
      if (wall) return { type: 'wall', edge: wall };
    }
  }

  const myPos = computer === 'red' ? state.redPosition : state.bluePosition;
  const validDirs = getValidMoves(state);
  let bestDir = validDirs[0];

  // Follow the actual BFS shortest path step-by-step to prevent oscillation.
  // Greedy distance-minimisation can bounce between two squares when walls
  // create a dead-end entrance; path-following never revisits a position.
  const path = bfsPath(state.placedWalls, myPos, myGoalRow);
  if (path && path.length > 1) {
    const nextPos = path[1];
    let foundDir = false;
    for (const dir of validDirs) {
      try {
        const next = applyMove(state, dir);
        const newMyPos = computer === 'red' ? next.redPosition : next.bluePosition;
        // Accept path[1] (normal move) or path[2] (jump clears an extra square).
        const onPath =
          (newMyPos.row === nextPos.row && newMyPos.col === nextPos.col) ||
          (path.length > 2 &&
            newMyPos.row === path[2].row &&
            newMyPos.col === path[2].col);
        if (onPath) { bestDir = dir; foundDir = true; break; }
      } catch { /* skip */ }
    }
    // Fallback: path step is blocked by opponent piece.
    // Fix #8: complete the deflected-jump loop and return the best landing,
    // not just the first one found.
    if (!foundDir) {
      const deflected = getDeflectedJumps(state);
      if (deflected.length > 0) {
        let bestDist = Infinity;
        let bestDj: typeof deflected[0] | null = null;
        for (const dj of deflected) {
          const dist = bfsDistance(state.placedWalls, dj.landPos, myGoalRow);
          if (dist < bestDist) {
            bestDist = dist;
            bestDj = dj;
            foundDir = true;
          }
        }
        if (bestDj) return { type: 'move', direction: bestDj.jumpDir, landingOverride: bestDj.landPos };
      }
      if (!foundDir) {
        let bestDist = Infinity;
        for (const dir of validDirs) {
          try {
            const next = applyMove(state, dir);
            const newMyPos = computer === 'red' ? next.redPosition : next.bluePosition;
            const dist = bfsDistance(state.placedWalls, newMyPos, myGoalRow);
            if (dist < bestDist) { bestDist = dist; bestDir = dir; }
          } catch { /* skip */ }
        }
      }
    }
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
  // Raw row-progress bonus (0.05 per row toward goal) breaks ties when BFS distances
  // are equal from adjacent squares — prevents the AI from oscillating in wall mazes.
  // Scale is tiny vs strategic terms (2.0+) so it never overrides real decisions.
  const rowProgress = aiColor === 'red' ? myPos.row / 8 : (8 - myPos.row) / 8;
  return 2 * oppDist - myDist + 0.3 * (myWalls - oppWalls) + 0.05 * rowProgress;
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
  deadline: number,
): number {
  const winner = checkWinner(state);
  if (winner !== null) {
    // Add depth bonus so the AI prefers winning sooner and losing later.
    return winner === aiColor ? 10000 + depth : -(10000 + depth);
  }
  if (depth === 0) return evaluate(state, aiColor);

  const isMax = state.currentTurn === aiColor;
  let best = isMax ? -Infinity : Infinity;

  // Fix #7 / #9: deadline checked at the start of each iteration inside the loops,
  // not as an early-return at the top of the node. This prevents mixing full-depth
  // and shallow evaluate() scores in the same alpha-beta pass (which corrupts pruning),
  // while still bounding total search time and preventing ANR.

  // ── Evaluate move actions (including deflected jumps) ───────────────────
  for (const dir of getValidMoves(state)) {
    if (Date.now() >= deadline) break;
    let next: GameState;
    try { next = applyMove(state, dir); } catch { continue; }
    const score = minimax(next, depth - 1, alpha, beta, aiColor, deadline);
    if (isMax) {
      if (score > best) best = score;
      if (best > alpha) alpha = best;
    } else {
      if (score < best) best = score;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }
  for (const dj of getDeflectedJumps(state)) {
    if (Date.now() >= deadline) break;
    let next: GameState;
    try { next = applyMove(state, dj.jumpDir, dj.landPos); } catch { continue; }
    const score = minimax(next, depth - 1, alpha, beta, aiColor, deadline);
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
      if (Date.now() >= deadline) break;
      let next: GameState;
      try { next = applyWall(state, edge); } catch { continue; }
      const score = minimax(next, depth - 1, alpha, beta, aiColor, deadline);
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

// How many wall candidates the hard AI will consider, based on walls already spent.
// 0–4 used  → up to 3 candidates: walls are available, but moves still compete evenly.
// 5–7 used  → up to 1 candidate, only when opponent is close or meaningfully ahead.
// 8–9 used  → emergency only: 1 candidate when opponent is ≤3 squares from winning.
function hardWallCandidates(state: GameState, computer: PieceColor): Edge[] {
  const wallsRemaining = computer === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;
  const wallsUsed = 10 - wallsRemaining;
  if (wallsRemaining === 0) return [];

  const oppPos      = computer === 'red' ? state.bluePosition : state.redPosition;
  const oppGoalRow  = computer === 'red' ? 0 : 8;
  const myPos       = computer === 'red' ? state.redPosition  : state.bluePosition;
  const myGoalRow   = computer === 'red' ? 8 : 0;

  if (wallsUsed >= 8) {
    // Emergency: save last 2 walls for when opponent is almost at the goal.
    const oppDist = bfsDistance(state.placedWalls, oppPos, oppGoalRow);
    return oppDist <= 3 ? searchWallCandidates(state).slice(0, 1) : [];
  }

  if (wallsUsed >= 5) {
    const oppDist = bfsDistance(state.placedWalls, oppPos, oppGoalRow);
    const myDist  = bfsDistance(state.placedWalls, myPos,  myGoalRow);
    // Fix #1: also block when opponent is ≤2 steps from winning (even if distances
    // are equal), to prevent losing in a parity race with walls in hand.
    return (oppDist < myDist - 1 || oppDist <= 2)
      ? searchWallCandidates(state).slice(0, 1)
      : [];
  }

  // Early game: allow up to 3 candidates so moves still compete.
  return searchWallCandidates(state).slice(0, 3);
}

function hardMove(state: GameState): ComputerAction {
  const computer = state.currentTurn;
  const deadline = Date.now() + 700; // 700ms compute budget; UI adds ~300ms delay = ~1s total

  // Fix #2: take an immediate win — check both regular moves AND deflected jumps.
  for (const dir of getValidMoves(state)) {
    try {
      const next = applyMove(state, dir);
      if (checkWinner(next) === computer) return { type: 'move', direction: dir };
    } catch { /* skip */ }
  }
  for (const dj of getDeflectedJumps(state)) {
    try {
      const next = applyMove(state, dj.jumpDir, dj.landPos);
      if (checkWinner(next) === computer) return { type: 'move', direction: dj.jumpDir, landingOverride: dj.landPos };
    } catch { /* skip */ }
  }

  const myPos      = computer === 'red' ? state.redPosition  : state.bluePosition;
  const myGoalRow  = computer === 'red' ? 8 : 0;
  const currentDist = bfsDistance(state.placedWalls, myPos, myGoalRow);

  // Fix #4 / #5: evaluate walls FIRST so they always get budget before the move loop
  // consumes it. A wall must only score strictly higher than the best move to win
  // (moves can tie-break on forward progress; walls win any subsequent ties with moves).
  const wallEdges = hardWallCandidates(state, computer);
  const dirs = getValidMoves(state);

  let bestAction: ComputerAction = { type: 'move', direction: dirs[0] ?? 'up' };
  let bestScore = -Infinity;
  // Track BFS distance after the chosen action so we can apply a forward tiebreaker.
  let bestDistAfter = currentDist;

  // Walls evaluated first — moves need strictly higher score to override a wall.
  for (const edge of wallEdges) {
    if (Date.now() >= deadline) break;
    let next: GameState;
    try { next = applyWall(state, edge); } catch { continue; }
    const score = minimax(next, SEARCH_DEPTH - 1, -Infinity, Infinity, computer, deadline);
    if (score > bestScore) {
      bestScore = score;
      bestAction = { type: 'wall', edge };
      bestDistAfter = currentDist; // wall doesn't move the piece
    }
  }

  for (const dir of dirs) {
    if (Date.now() >= deadline) break;
    let next: GameState;
    try { next = applyMove(state, dir); } catch { continue; }
    const score = minimax(next, SEARCH_DEPTH - 1, -Infinity, Infinity, computer, deadline);
    const newPos = computer === 'red' ? next.redPosition : next.bluePosition;
    const distAfter = bfsDistance(next.placedWalls, newPos, myGoalRow);
    // Accept if strictly better score, OR same score but move is more forward-progressing.
    if (score > bestScore || (score === bestScore && distAfter < bestDistAfter)) {
      bestScore = score;
      bestAction = { type: 'move', direction: dir };
      bestDistAfter = distAfter;
    }
  }

  for (const dj of getDeflectedJumps(state)) {
    if (Date.now() >= deadline) break;
    let next: GameState;
    try { next = applyMove(state, dj.jumpDir, dj.landPos); } catch { continue; }
    const score = minimax(next, SEARCH_DEPTH - 1, -Infinity, Infinity, computer, deadline);
    const distAfter = bfsDistance(next.placedWalls, dj.landPos, myGoalRow);
    if (score > bestScore || (score === bestScore && distAfter < bestDistAfter)) {
      bestScore = score;
      bestAction = { type: 'move', direction: dj.jumpDir, landingOverride: dj.landPos };
      bestDistAfter = distAfter;
    }
  }

  return bestAction;
}

export function getComputerMove(state: GameState, difficulty: AiDifficulty): ComputerAction {
  return difficulty === 'hard' ? hardMove(state) : easyMove(state);
}
