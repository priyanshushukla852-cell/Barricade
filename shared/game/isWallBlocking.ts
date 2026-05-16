import type { Edge, Position } from '@shared/types';
import { normalizeEdge } from './normalizeEdge';

export function isWallBlocking(walls: Edge[], from: Position, to: Position): boolean {
  const target = normalizeEdge({ from, to });
  return walls.some(
    (w) =>
      w.from.row === target.from.row &&
      w.from.col === target.from.col &&
      w.to.row === target.to.row &&
      w.to.col === target.to.col,
  );
}
