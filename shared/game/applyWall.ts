import type { Edge, GameState } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';
import { isWallPlacementValid } from './isWallPlacementValid';

export function applyWall(state: GameState, wall: Edge): GameState {
  const normalized = normalizeEdge(wall);

  if (!isWallPlacementValid(state, normalized)) {
    throw new Error('Invalid wall placement');
  }

  const isRed = state.currentTurn === 'red';

  return {
    ...state,
    placedWalls: [...state.placedWalls, normalized],
    redWallsRemaining: isRed ? state.redWallsRemaining - 1 : state.redWallsRemaining,
    blueWallsRemaining: isRed ? state.blueWallsRemaining : state.blueWallsRemaining - 1,
    currentTurn: isRed ? 'blue' : 'red',
  };
}
