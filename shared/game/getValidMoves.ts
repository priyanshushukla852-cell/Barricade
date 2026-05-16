import type { Direction, GameState } from '@shared/types';
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
