import type { Edge } from '@shared/types';

export function wallsIntersect(a: Edge, b: Edge): boolean {
  const aIsVertBar = a.from.row === a.to.row;
  const bIsVertBar = b.from.row === b.to.row;
  if (aIsVertBar === bIsVertBar) return false;
  return a.from.row === b.from.row && a.from.col === b.from.col;
}
