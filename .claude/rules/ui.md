# UI & Screens

## Key Screens
1. **SplashScreen** — logo, redirect to auth or home based on session
2. **AuthScreen** — email/password + Google sign-in
3. **HomeScreen** — Local Game / VS Computer / Online (Find Opponent / Create Room / Join Room) + profile button
4. **LobbyScreen** — room code display, timer config selector (host only), waiting indicator
5. **GameScreen** — 9×9 board + wall hand (remaining count) + turn indicator + timer countdown
6. **ProfileScreen** — ELO rating, win/loss stats, paginated game history with load-more
7. **ResultScreen** — winner, reason (goal reached / timeout / opponent left), Play Again / Home

## GameScreen UI Behaviour
- **Moving:** Valid destination squares are highlighted automatically at the start of the player's turn. Tap a highlighted square to move. No need to tap the piece first.
- **Placing a wall:** Drag wall token from wall hand → drag over board → snaps to nearest edge → green (valid) or red (invalid) preview → release to confirm → emits `place_wall` with normalized edge.
- **Wall preview:** Run `isWallPlacementValid` locally for instant feedback while dragging. Server validates on drop — if rejected, revert preview and show error.
- **Deflected jump:** When the straight-through jump is blocked, additional landing squares adjacent to the opponent are highlighted. Tapping one emits `move_piece` with the correct `jumpDir` and `landingOverride`.
- **Disabled:** All interactions disabled when it is not the player's turn.
- **Timer display:** Countdown in seconds. Flashes red below 10 seconds.

## Core Data Types (use shared/types.ts — do not redefine locally)

```typescript
type Position = { row: number; col: number };
type PieceColor = 'red' | 'blue';
type Direction = 'up' | 'down' | 'left' | 'right';
type TimerOption = 0 | 1 | 2 | 3 | 5; // minutes; 0 = unlimited (local only)

type Edge = { from: Position; to: Position };

interface GameState {
  redPosition: Position;
  bluePosition: Position;
  redWallsRemaining: number;    // 0–10
  blueWallsRemaining: number;   // 0–10
  placedWalls: Edge[];
  currentTurn: PieceColor;
  phase: 'choosing' | 'game_over';
  winner: PieceColor | null;
  redTimeRemaining: number;
  blueTimeRemaining: number;
  timerConfig: TimerOption;
}

type MovePayload = { roomCode: string; direction: Direction; landingOverride?: Position };
type WallPayload = { roomCode: string; wall: Edge };
```
