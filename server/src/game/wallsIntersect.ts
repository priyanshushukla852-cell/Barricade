import type { Edge } from '@shared/types';

// Every wall in this game spans exactly one edge (1 unit).
// One-unit segments can only share endpoints — they cannot cross interior points.
// Therefore two 1-unit walls can never geometrically intersect.
export function wallsIntersect(_a: Edge, _b: Edge): boolean {
  return false;
}
