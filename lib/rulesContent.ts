export const RULES: { title: string; body: string }[] = [
  {
    title: 'Goal',
    body: 'Move your piece to the top row to win. Your piece always starts at the bottom of your screen.',
  },
  {
    title: 'Your turn',
    body: 'Each turn, do exactly one thing: move your piece one square (up, down, left, or right), or place a wall.',
  },
  {
    title: 'Walls',
    body: 'Each player has 10 walls. A wall spans two squares and permanently blocks movement across that edge for both players.',
  },
  {
    title: 'Wall placement',
    body: 'Walls cannot cross each other. You can never place a wall that completely cuts off either player\'s path to the goal.',
  },
  {
    title: 'Jump',
    body: 'If your opponent is directly ahead and the square behind them is open, you jump over them and land 2 squares forward.',
  },
  {
    title: 'Timer',
    body: 'Each turn has a time limit. If the clock runs out on your turn, you lose.',
  },
];
