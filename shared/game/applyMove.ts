import type { Direction, GameState } from '@shared/types';
import { getAdjacentSquare } from './getAdjacentSquare';
import { getValidMoves } from './getValidMoves';

export function applyMove(state: GameState, dir: Direction): GameState {
  if (!getValidMoves(state).includes(dir)) {
    throw new Error('Invalid move direction');
  }

  const isRed = state.currentTurn === 'red';
  const myPos = isRed ? state.redPosition : state.bluePosition;
  const oppPos = isRed ? state.bluePosition : state.redPosition;

  const adj = getAdjacentSquare(myPos, dir)!;
  const isJump = adj.row === oppPos.row && adj.col === oppPos.col;
  const newPos = isJump ? getAdjacentSquare(oppPos, dir)! : adj;

  return {
    ...state,
    redPosition: isRed ? newPos : state.redPosition,
    bluePosition: isRed ? state.bluePosition : newPos,
    currentTurn: isRed ? 'blue' : 'red',
  };
}
