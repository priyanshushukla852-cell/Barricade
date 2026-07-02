import { getComputerMove } from '../getComputerMove';
import type { AiDifficulty } from '../getComputerMove';
import { createInitialState } from '../createInitialState';
import { applyMove } from '../applyMove';
import { applyWall } from '../applyWall';
import { checkWinner } from '../checkWinner';
import type { GameState } from '@shared/types';

const DIFFICULTIES: AiDifficulty[] = ['easy', 'medium', 'hard'];

describe('getComputerMove', () => {
  it.each(DIFFICULTIES)('%s returns an applicable action from the initial state', (difficulty) => {
    const state = createInitialState(5);
    const action = getComputerMove(state, difficulty);
    if (action.type === 'move') {
      expect(() => applyMove(state, action.direction, action.landingOverride)).not.toThrow();
    } else {
      expect(() => applyWall(state, action.edge)).not.toThrow();
    }
  });

  // Easy is excluded: it can randomly spend a wall instead of taking the win.
  it.each(['medium', 'hard'] as AiDifficulty[])('%s seizes an immediate win', (difficulty) => {
    const state: GameState = {
      ...createInitialState(5),
      redPosition: { row: 7, col: 4 },
      bluePosition: { row: 4, col: 0 },
      currentTurn: 'red',
    };
    const action = getComputerMove(state, difficulty);
    expect(action.type).toBe('move');
    if (action.type === 'move') {
      const next = applyMove(state, action.direction, action.landingOverride);
      expect(checkWinner(next)).toBe('red');
    }
  });

  it('hard stops the opponent from winning next turn when a blocking wall exists', () => {
    // Blue (goal row 0) is one step from winning; red (AI) is far from its goal.
    // The only way hard avoids losing on the next turn is a wall in front of blue.
    const state: GameState = {
      ...createInitialState(5),
      redPosition: { row: 1, col: 8 },
      bluePosition: { row: 1, col: 0 },
      currentTurn: 'red',
    };
    const action = getComputerMove(state, 'hard');
    expect(action.type).toBe('wall');
    if (action.type === 'wall') {
      const next = applyWall(state, action.edge);
      // After the wall, blue must not be able to reach row 0 in one move.
      const blueUp = { row: 0, col: 0 };
      const blocked = next.placedWalls.some(
        (w) =>
          (w.from.row === blueUp.row && w.from.col === blueUp.col &&
           w.to.row === state.bluePosition.row && w.to.col === state.bluePosition.col),
      );
      expect(blocked).toBe(true);
    }
  });
});
