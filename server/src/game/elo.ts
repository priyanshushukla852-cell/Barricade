const K_PROVISIONAL = 32; // first 30 games
const K_ESTABLISHED = 16; // 30+ games

export interface EloResult {
  newWinnerRating: number;
  newLoserRating: number;
  winnerDelta: number;
  loserDelta: number;
}

function kFactor(gamesPlayed: number): number {
  return gamesPlayed < 30 ? K_PROVISIONAL : K_ESTABLISHED;
}

function expectedScore(myRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
}

export function calculateElo(
  winnerRating: number,
  loserRating: number,
  winnerGamesPlayed: number,
  loserGamesPlayed: number,
): EloResult {
  const winnerK = kFactor(winnerGamesPlayed);
  const loserK = kFactor(loserGamesPlayed);

  const winnerExpected = expectedScore(winnerRating, loserRating);
  const loserExpected = expectedScore(loserRating, winnerRating);

  const winnerDelta = Math.round(winnerK * (1 - winnerExpected));
  const loserDelta = Math.round(loserK * (0 - loserExpected));

  return {
    newWinnerRating: winnerRating + winnerDelta,
    newLoserRating: Math.max(100, loserRating + loserDelta), // floor at 100
    winnerDelta,
    loserDelta,
  };
}
