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

// All 128 possible primary wall edges (8×8 for each orientation).
function allWallCandidates(): Edge[] {
  const candidates: Edge[] = [];
  for (let row = 0; row <= 7; row++) {
    for (let col = 0; col <= 7; col++) {
      // Horizontal adjacency (vertical bar wall — extends down one row)
      candidates.push(normalizeEdge({ from: { row, col }, to: { row, col: col + 1 } }));
      // Vertical adjacency (horizontal bar wall — extends right one col)
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

// Easy: random move most of the time; occasional random wall.
function easyMove(state: GameState): ComputerAction {
  const validDirs = getValidMoves(state);
  const wallsRemaining =
    state.currentTurn === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;

  if (wallsRemaining > 0 && Math.random() < 0.2) {
    const wall = randomValidWall(state);
    if (wall) return { type: 'wall', edge: wall };
  }

  return {
    type: 'move',
    direction: validDirs[Math.floor(Math.random() * validDirs.length)],
  };
}

// Hard: greedy BFS heuristic — move to minimise own distance, or place a wall
// that maximises (opponent distance gained − own distance lost).
function hardMove(state: GameState): ComputerAction {
  const computer = state.currentTurn;
  const myPos = computer === 'red' ? state.redPosition : state.bluePosition;
  const oppPos = computer === 'red' ? state.bluePosition : state.redPosition;
  const myGoalRow = computer === 'red' ? 8 : 0;
  const oppGoalRow = computer === 'red' ? 0 : 8;
  const wallsRemaining =
    computer === 'red' ? state.redWallsRemaining : state.blueWallsRemaining;

  // Best move: direction that leaves us closest to goal.
  const validDirs = getValidMoves(state);
  let bestDir = validDirs[0];
  let bestMoveDist = Infinity;

  for (const dir of validDirs) {
    try {
      const next = applyMove(state, dir);
      const newMyPos = computer === 'red' ? next.redPosition : next.bluePosition;
      const dist = bfsDistance(state.placedWalls, newMyPos, myGoalRow);
      if (dist < bestMoveDist) {
        bestMoveDist = dist;
        bestDir = dir;
      }
    } catch {
      // invalid move — skip
    }
  }

  // If we can reach the goal this turn, always take it.
  if (bestMoveDist === 0) return { type: 'move', direction: bestDir };

  // Best wall: maximises net distance gained on opponent minus lost on self.
  if (wallsRemaining > 0) {
    const curOppDist = bfsDistance(state.placedWalls, oppPos, oppGoalRow);
    const curMyDist = bfsDistance(state.placedWalls, myPos, myGoalRow);

    let bestWall: Edge | null = null;
    let bestScore = -Infinity;

    for (const edge of allWallCandidates()) {
      if (!isWallPlacementValid(state, edge)) continue;
      const companion = getCompanionEdge(edge)!;
      const hypo = [...state.placedWalls, edge, companion];
      const newOppDist = bfsDistance(hypo, oppPos, oppGoalRow);
      const newMyDist = bfsDistance(hypo, myPos, myGoalRow);
      const score = (newOppDist - curOppDist) - (newMyDist - curMyDist);
      if (score > bestScore) {
        bestScore = score;
        bestWall = edge;
      }
    }

    // Only place a wall if it meaningfully slows the opponent.
    if (bestWall !== null && bestScore >= 2) {
      return { type: 'wall', edge: bestWall };
    }
  }

  return { type: 'move', direction: bestDir };
}

export function getComputerMove(state: GameState, difficulty: AiDifficulty): ComputerAction {
  return difficulty === 'hard' ? hardMove(state) : easyMove(state);
}
