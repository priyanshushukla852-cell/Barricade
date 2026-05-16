import type { Edge, Position } from '@shared/types';

function isLesser(a: Position, b: Position): boolean {
  return a.row < b.row || (a.row === b.row && a.col < b.col);
}

export function normalizeEdge(edge: Edge): Edge {
  if (isLesser(edge.from, edge.to) || (edge.from.row === edge.to.row && edge.from.col === edge.to.col)) {
    return { from: { ...edge.from }, to: { ...edge.to } };
  }
  return { from: { ...edge.to }, to: { ...edge.from } };
}
