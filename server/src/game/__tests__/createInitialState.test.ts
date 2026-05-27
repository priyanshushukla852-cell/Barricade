import { createInitialState } from '../createInitialState';
import type { TimerOption } from '@shared/types';

describe('createInitialState', () => {
  const state = createInitialState(5);

  it('redPosition is {row:0,col:4}', () => {
    expect(state.redPosition).toEqual({ row: 0, col: 4 });
  });

  it('bluePosition is {row:8,col:4}', () => {
    expect(state.bluePosition).toEqual({ row: 8, col: 4 });
  });

  it('redWallsRemaining === 10', () => {
    expect(state.redWallsRemaining).toBe(10);
  });

  it('blueWallsRemaining === 10', () => {
    expect(state.blueWallsRemaining).toBe(10);
  });

  it('placedWalls is empty array', () => {
    expect(state.placedWalls).toEqual([]);
  });

  it('currentTurn === "red"', () => {
    expect(state.currentTurn).toBe('red');
  });

  it('phase === "choosing"', () => {
    expect(state.phase).toBe('choosing');
  });

  it('winner === null', () => {
    expect(state.winner).toBeNull();
  });

  it.each<TimerOption>([1, 2, 3, 5])(
    'both player timers === timerConfig * 60 for timerConfig=%i',
    (timerConfig) => {
      const state = createInitialState(timerConfig);
      expect(state.redTimeRemaining).toBe(timerConfig * 60);
      expect(state.blueTimeRemaining).toBe(timerConfig * 60);
    },
  );
});
