import { calculateElo } from '../elo';

describe('calculateElo', () => {
  it('winner gains rating, loser loses rating', () => {
    const result = calculateElo(1200, 1200, 0, 0);
    expect(result.winnerDelta).toBeGreaterThan(0);
    expect(result.loserDelta).toBeLessThan(0);
    expect(result.newWinnerRating).toBe(1200 + result.winnerDelta);
    expect(result.newLoserRating).toBe(1200 + result.loserDelta);
  });

  it('equal ratings produce ~16 delta with K=32', () => {
    const result = calculateElo(1200, 1200, 0, 0);
    expect(result.winnerDelta).toBe(16);
    expect(result.loserDelta).toBe(-16);
  });

  it('upset (lower-rated wins) produces larger gain', () => {
    const upset = calculateElo(1000, 1400, 0, 0);
    const expected = calculateElo(1400, 1000, 0, 0);
    expect(upset.winnerDelta).toBeGreaterThan(expected.winnerDelta);
  });

  it('uses K=16 for established players (30+ games)', () => {
    const result = calculateElo(1200, 1200, 30, 30);
    expect(result.winnerDelta).toBe(8);
    expect(result.loserDelta).toBe(-8);
  });

  it('rating never drops below 100', () => {
    const result = calculateElo(200, 2000, 0, 0);
    expect(result.newLoserRating).toBeGreaterThanOrEqual(100);
  });

  it('provisional player (< 30 games) uses K=32', () => {
    const result = calculateElo(1200, 1200, 29, 0);
    expect(result.winnerDelta).toBe(16);
  });
});
