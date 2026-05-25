import type { Edge, GameState } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';
import { isWallPlacementValid } from './isWallPlacementValid';
import { getCompanionEdge } from './getCompanionEdge';

export function applyWall(state: GameState, wall: Edge): GameState {
  const normalized = normalizeEdge(wall);

  if (!isWallPlacementValid(state, normalized)) {
    throw new Error('Invalid wall placement');
  }

  // Store both the primary and companion edge so movement checks block both cells.
  const companion = getCompanionEdge(normalized)!;

  const isRed = state.currentTurn === 'red';

  return {
    ...state,
    placedWalls: [...state.placedWalls, normalized, companion],
    redWallsRemaining: isRed ? state.redWallsRemaining - 1 : state.redWallsRemaining,
    blueWallsRemaining: isRed ? state.blueWallsRemaining : state.blueWallsRemaining - 1,
    currentTurn: isRed ? 'blue' : 'red',
  };
}
