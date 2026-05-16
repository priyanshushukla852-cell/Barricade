import type { Edge, Position } from '@shared/types';
import { getAdjacentSquare } from './getAdjacentSquare';
import { isWallBlocking } from './isWallBlocking';

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export function pathExists(walls: Edge[], from: Position, target: Position): boolean {
  if (from.row === target.row && from.col === target.col) return true;

  const visited = new Set<string>();
  const queue: Position[] = [from];
  visited.add(`${from.row},${from.col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dir of DIRECTIONS) {
      const next = getAdjacentSquare(current, dir);
      if (next === null) continue;
      if (isWallBlocking(walls, current, next)) continue;
      const key = `${next.row},${next.col}`;
      if (visited.has(key)) continue;
      if (next.row === target.row && next.col === target.col) return true;
      visited.add(key);
      queue.push(next);
    }
  }

  return false;
}
