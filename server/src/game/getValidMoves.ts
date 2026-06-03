import type { Direction, GameState, Position } from '@shared/types';
import { getAdjacentSquare } from './getAdjacentSquare';
import { isWallBlocking } from './isWallBlocking';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export function getValidMoves(state: GameState): Direction[] {
  const myPos = state.currentTurn === 'red' ? state.redPosition : state.bluePosition;
  const oppPos = state.currentTurn === 'red' ? state.bluePosition : state.redPosition;

  const valid: Direction[] = [];

  for (const dir of DIRECTIONS) {
    const adj = getAdjacentSquare(myPos, dir);
    if (adj === null) continue;
    if (isWallBlocking(state.placedWalls, myPos, adj)) continue;

    if (adj.row === oppPos.row && adj.col === oppPos.col) {
      const behind = getAdjacentSquare(oppPos, dir);
      if (behind === null) continue;
      if (isWallBlocking(state.placedWalls, oppPos, behind)) continue;
      if (behind.row === myPos.row && behind.col === myPos.col) continue;
      valid.push(dir);
    } else {
      valid.push(dir);
    }
  }

  return valid;
}

export interface DeflectedJump {
  jumpDir: Direction;
  landPos: Position;
}

// When the opponent occupies an adjacent square and the straight-through jump
// is blocked (wall or out-of-bounds), the moving piece may instead land on any
// accessible adjacent cell of the opponent (excluding the cell it came from).
export function getDeflectedJumps(state: GameState): DeflectedJump[] {
  const myPos = state.currentTurn === 'red' ? state.redPosition : state.bluePosition;
  const oppPos = state.currentTurn === 'red' ? state.bluePosition : state.redPosition;
  const result: DeflectedJump[] = [];

  for (const dir of DIRECTIONS) {
    const adj = getAdjacentSquare(myPos, dir);
    if (adj === null) continue;
    if (isWallBlocking(state.placedWalls, myPos, adj)) continue;
    if (adj.row !== oppPos.row || adj.col !== oppPos.col) continue;

    // Opponent is adjacent in `dir`. Is the straight jump possible?
    const behind = getAdjacentSquare(oppPos, dir);
    const straightJumpOk =
      behind !== null &&
      !isWallBlocking(state.placedWalls, oppPos, behind) &&
      !(behind.row === myPos.row && behind.col === myPos.col);

    if (straightJumpOk) continue; // Straight jump available — no deflection.

    // Straight jump blocked: offer accessible perpendicular cells of the opponent.
    for (const adjDir of DIRECTIONS) {
      if (adjDir === dir) continue; // Skip the blocked straight-ahead landing.
      const candidate = getAdjacentSquare(oppPos, adjDir);
      if (candidate === null) continue;
      if (candidate.row === myPos.row && candidate.col === myPos.col) continue;
      if (isWallBlocking(state.placedWalls, oppPos, candidate)) continue;
      result.push({ jumpDir: dir, landPos: candidate });
    }
  }

  return result;
}
