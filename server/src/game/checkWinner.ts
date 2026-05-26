import type { GameState, PieceColor } from '@shared/types';

export function checkWinner(state: GameState): PieceColor | null {
  if (state.redPosition.row === 8) return 'red';
  if (state.bluePosition.row === 0) return 'blue';
  return null;
}
