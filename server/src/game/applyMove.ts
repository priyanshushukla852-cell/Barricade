import type { Direction, GameState, Position } from '@shared/types';
import { getAdjacentSquare } from './getAdjacentSquare';
import { getValidMoves, getDeflectedJumps } from './getValidMoves';

export function applyMove(state: GameState, dir: Direction, landingOverride?: Position): GameState {
  const isRed = state.currentTurn === 'red';
  const myPos = isRed ? state.redPosition : state.bluePosition;
  const oppPos = isRed ? state.bluePosition : state.redPosition;

  let newPos: Position;

  if (landingOverride) {
    const deflected = getDeflectedJumps(state);
    const valid = deflected.some(
      (dj) =>
        dj.jumpDir === dir &&
        dj.landPos.row === landingOverride.row &&
        dj.landPos.col === landingOverride.col,
    );
    if (!valid) throw new Error('Invalid deflected jump');
    newPos = landingOverride;
  } else {
    if (!getValidMoves(state).includes(dir)) throw new Error('Invalid move direction');
    const adj = getAdjacentSquare(myPos, dir)!;
    const isJump = adj.row === oppPos.row && adj.col === oppPos.col;
    newPos = isJump ? getAdjacentSquare(oppPos, dir)! : adj;
  }

  return {
    ...state,
    redPosition: isRed ? newPos : state.redPosition,
    bluePosition: isRed ? state.bluePosition : newPos,
    currentTurn: isRed ? 'blue' : 'red',
  };
}
