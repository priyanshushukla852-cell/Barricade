import type { Direction, Position } from '@shared/types';
import { BOARD_SIZE } from './boardConfig';

export function getAdjacentSquare(pos: Position, dir: Direction): Position | null {
  let row = pos.row;
  let col = pos.col;

  if (dir === 'up') row -= 1;
  else if (dir === 'down') row += 1;
  else if (dir === 'left') col -= 1;
  else col += 1;

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}
