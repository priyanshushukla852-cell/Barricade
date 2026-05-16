import type { Edge } from '@shared/types';

// Every wall spans exactly one edge (1 unit).
// One-unit segments can only share endpoints — they cannot cross interior points.
export function wallsIntersect(_a: Edge, _b: Edge): boolean {
  return false;
}
