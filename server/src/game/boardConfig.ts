import type { Position } from '@shared/types';

export const BOARD_SIZE = 9; // 9×9 grid; rows and cols are 0-indexed

// All 81 squares are traversable — no blocked or special-type cells.

/** Red's starting square (top-centre). Also the square Blue must reach to win. */
export const RED_START: Position = { row: 0, col: 4 };

/** Red's goal square (bottom-centre, Blue's starting square). */
export const RED_GOAL: Position = { row: 8, col: 4 };

/** Blue's starting square (bottom-centre). Also the square Red must reach to win. */
export const BLUE_START: Position = { row: 8, col: 4 };

/** Blue's goal square (top-centre, Red's starting square). */
export const BLUE_GOAL: Position = { row: 0, col: 4 };
