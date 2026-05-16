import { getAdjacentSquare } from '../getAdjacentSquare';

describe('getAdjacentSquare', () => {
  it('up from {row:1,col:4} returns {row:0,col:4}', () => {
    expect(getAdjacentSquare({ row: 1, col: 4 }, 'up')).toEqual({ row: 0, col: 4 });
  });

  it('down from {row:8,col:4} returns null (out of bounds)', () => {
    expect(getAdjacentSquare({ row: 8, col: 4 }, 'down')).toBeNull();
  });

  it('left from {row:0,col:0} returns null (out of bounds)', () => {
    expect(getAdjacentSquare({ row: 0, col: 0 }, 'left')).toBeNull();
  });

  it('right from {row:4,col:4} returns {row:4,col:5}', () => {
    expect(getAdjacentSquare({ row: 4, col: 4 }, 'right')).toEqual({ row: 4, col: 5 });
  });
});
