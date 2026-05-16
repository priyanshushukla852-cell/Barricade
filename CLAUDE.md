# Barricade – Mobile Game (React Native / Expo)

## Project Overview
A 2-player digital Barricade board game. Red vs Blue. Each player moves one piece across a 9×9 grid from their starting square to the opponent's starting square. Players can also spend turns placing wall segments to block movement. Supports local (hot seat) and online real-time multiplayer with a configurable per-turn chess clock. Built with React Native (Expo), TypeScript, and a Node.js/Socket.IO backend.

---

## Game Rules (Source of Truth — no assumptions, no exceptions)

### Board
- 9×9 grid of squares. Squares identified by (row, col): row 0 = top, row 8 = bottom, col 0 = left, col 8 = right.
- All 81 squares are traversable. No blocked or special-type squares — entire board is open.
- Edges exist between every pair of horizontally or vertically adjacent squares. An edge is identified by the two squares it connects: `Edge = { from: Position; to: Position }` always stored with the lesser position first (row-major: smaller row first; if same row, smaller col first) to avoid duplicates.

### Starting Positions
- **Red** starts at row 0, col 4 (top row, center).
- **Blue** starts at row 8, col 4 (bottom row, center).
- These starting squares are also the WIN squares for the opponent.

### Winning Condition
- **Red wins** when its piece reaches row 8, col 4 (Blue's starting square).
- **Blue wins** when its piece reaches row 0, col 4 (Red's starting square).
- Win is checked immediately after every move. Game ends instantly on a winning move.

### Pieces
- Each player has exactly **1 piece**.
- A piece occupies exactly one square at all times.
- Two pieces cannot occupy the same square — ever (except jump resolution, see below).

### Movement Rules (per turn: move piece)
- A piece moves exactly **1 square** per turn — up, down, left, or right. No diagonal movement.
- A move is **blocked** if a wall exists on the edge between the current square and the target square.
- A move is **blocked** if the target square is occupied by the opponent's piece, UNLESS the jump rule applies.
- A move is **invalid** if the target square is outside the 9×9 grid.

### Jump Rule
- Condition: opponent's piece is on the target square AND the square directly behind the opponent (2 squares away from the moving piece, same direction) is empty AND no wall blocks the edge between the opponent's square and the behind-square.
- If all conditions met: the moving piece jumps over the opponent and lands 2 squares away.
- If the behind-square is occupied OR a wall blocks it: the jump is not allowed and movement in that direction is entirely blocked.
- The jump is not optional — if conditions are met and the player moves in that direction, the jump always happens.

### Barricade (Wall) Rules (per turn: place a wall)
- Each player has exactly **10 walls** total. Once all 10 are placed, that player must move their piece every remaining turn.
- A wall is placed on an **edge** between two adjacent squares (horizontal or vertical adjacency only).
- A wall blocks movement across that edge in **both directions** for both players.
- **Drag and drop UI:** Player drags a wall token from their hand and drops it onto the board. Wall snaps to the nearest valid edge on drop. Green preview = valid, red = invalid.
- **Intersection rule:** No two walls may cross each other. Two walls intersect if they share a midpoint (a horizontal wall and a vertical wall cross at the same grid intersection point). Must be checked on placement.
- **Chaining rule:** A new wall CAN share an endpoint with an existing wall (walls may touch at corners/ends). Walls cannot overlap the same edge.
- **Path rule (mandatory):** A wall placement is **invalid** if it leaves either player with zero possible paths to their target square. BFS/DFS must be run for both players after every attempted placement. If either player has no path, reject the placement.
- Walls are **permanent** — once placed, cannot be moved or removed.
- A player CAN place a wall that restricts their own movement — allowed as long as they still have a path to the goal.

### Turn Structure
- Each turn a player does exactly ONE action:
  1. Move their piece 1 square (or 2 if jump applies), OR
  2. Place one wall on any valid edge
- After the action, turn passes to the opponent.
- If the timer hits zero before the action is completed, that player loses immediately.

### Timer
- **Per-turn timer** (resets every turn, not a total clock).
- Configurable by the host before game starts: 1, 2, 3, or 5 minutes.
- Timer resets to the full configured value at the start of each player's turn.
- Timer runs and is enforced **server-side** using setTimeout. Client shows a countdown display only.
- If timer reaches zero: server emits `game_over` with the waiting player as winner, reason `'timeout'`. No automatic action is taken for the losing player.

---

## Core Data Types (use shared/types.ts — do not redefine locally)

```typescript
type Position = { row: number; col: number };
type PieceColor = 'red' | 'blue';
type Direction = 'up' | 'down' | 'left' | 'right';
type TimerOption = 1 | 2 | 3 | 5; // minutes

// An edge between two adjacent squares. Always normalize before storing or comparing.
// "Lesser" position = smaller row first; if same row, smaller col first.
type Edge = { from: Position; to: Position };

interface GameState {
  redPosition: Position;           // Red piece's current square
  bluePosition: Position;          // Blue piece's current square
  redWallsRemaining: number;       // 0–10
  blueWallsRemaining: number;      // 0–10
  placedWalls: Edge[];             // All walls on the board (normalized)
  currentTurn: PieceColor;
  phase: 'choosing' | 'game_over';
  winner: PieceColor | null;
  timerSeconds: number;            // Current countdown (server-managed)
  timerConfig: TimerOption;        // Minutes per turn, set at game start
}

// Socket payload types
type MovePayload  = { roomCode: string; direction: Direction };
type WallPayload  = { roomCode: string; wall: Edge };
type JoinPayload  = { roomCode: string; userId: string; nickname: string };
type StartPayload = { roomCode: string; timerConfig: TimerOption };
```

---

## Tech Stack
- **Frontend**: React Native (Expo SDK), TypeScript, Zustand, Expo Router
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL
- **Auth**: Firebase Auth (email + Google OAuth)
- **Hosting**: Railway or Render (backend), Expo EAS (mobile builds)

---

## Project Structure
```
/
├── app/
│   ├── (auth)/             # AuthScreen
│   ├── (game)/             # HomeScreen, LobbyScreen, GameScreen, ResultScreen
│   └── index.tsx           # Splash
├── components/
│   ├── board/              # BoardComponent, SquareComponent, PieceComponent, WallOverlay
│   └── ui/                 # TurnIndicator, TimerDisplay, ActionButtons, WallHand
├── store/
│   ├── gameStore.ts
│   └── authStore.ts
├── hooks/
│   ├── useSocket.ts
│   ├── useGame.ts
│   └── useAuth.ts
├── lib/
│   ├── firebase.ts
│   └── socketClient.ts
├── server/
│   ├── game/               # Pure game logic + tests
│   ├── rooms/              # In-memory room manager
│   ├── socket/             # Socket.IO handlers
│   ├── routes/             # REST endpoints
│   └── db/                 # PostgreSQL client + migrations
├── shared/
│   └── types.ts
└── assets/
```

---

## Game Logic Functions (server/game/ — pure functions, no mutations, no I/O)

| File | Function | Notes |
|---|---|---|
| `normalizeEdge.ts` | `normalizeEdge(edge): Edge` | Ensures from < to (row-major) |
| `getAdjacentSquare.ts` | `getAdjacentSquare(pos, dir): Position \| null` | Returns null if out of bounds |
| `isWallBlocking.ts` | `isWallBlocking(walls, from, to): boolean` | Checks normalized edge in placedWalls |
| `getValidMoves.ts` | `getValidMoves(state): Direction[]` | All legal directions for currentTurn player |
| `applyMove.ts` | `applyMove(state, dir): GameState` | Applies move + jump if applicable. Throws if invalid. |
| `wallsIntersect.ts` | `wallsIntersect(a, b): boolean` | True if two walls cross at a grid point |
| `pathExists.ts` | `pathExists(walls, from, target): boolean` | BFS on 9×9 respecting walls |
| `isWallPlacementValid.ts` | `isWallPlacementValid(state, wall): boolean` | Checks adjacency + overlap + intersection + path rule |
| `applyWall.ts` | `applyWall(state, wall): GameState` | Places wall. Throws if invalid. |
| `checkWinner.ts` | `checkWinner(state): PieceColor \| null` | Checks if either piece is on opponent's start |
| `createInitialState.ts` | `createInitialState(timerConfig): GameState` | Returns starting GameState |

---

## Architecture Rules
- All game logic in `server/game/` only — pure functions, fully unit tested.
- Client never mutates game state — emits actions, renders server broadcasts.
- Timer enforced server-side with `setTimeout`. Cleared and reset on every turn change.
- Wall validity (including path check) always validated server-side. Client preview uses local validation for UX only.
- All socket payloads validated with Zod before processing. Invalid → emit `error`, return.
- Never use untyped `socket.emit` — always use typed payload types from `shared/types.ts`.
- Firebase Auth for identity only. Session state managed by backend.

---

## Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_lobby` | `JoinPayload` | Join or create a room |
| `start_game` | `StartPayload` | Host starts game with timer config |
| `move_piece` | `MovePayload` | Move piece in a direction |
| `place_wall` | `WallPayload` | Place a wall on an edge |
| `leave_game` | `{ roomCode: string }` | Forfeit — opponent wins |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `game_state` | `GameState` | Full state after every action |
| `timer_tick` | `{ seconds: number }` | Emitted every second during active turn |
| `game_over` | `{ winner: PieceColor; reason: 'reached_goal' \| 'timeout' \| 'opponent_left' }` | Game ended |
| `opponent_left` | `{ reconnecting: boolean; secondsLeft?: number }` | Opponent disconnected |
| `error` | `{ message: string }` | Invalid action rejected |

---

## Key Screens
1. **SplashScreen** — logo, redirect to auth or home based on session
2. **AuthScreen** — email/password + Google sign-in
3. **HomeScreen** — Local Game / Online (Create Room / Join Room)
4. **LobbyScreen** — room code display, timer config selector (host only), waiting indicator
5. **GameScreen** — 9×9 board + wall hand (remaining count) + turn indicator + timer countdown
6. **ResultScreen** — winner, reason (goal reached / timeout / opponent left), Play Again / Home

---

## GameScreen UI Behaviour
- **Moving:** Tap own piece → valid destination squares highlight → tap highlighted square → emits `move_piece` with direction.
- **Placing a wall:** Drag wall token from wall hand → drag over board → snaps to nearest edge → green (valid) or red (invalid) preview → release to confirm → emits `place_wall` with normalized edge.
- **Wall preview:** Run `isWallPlacementValid` locally for instant feedback while dragging. Server validates on drop — if rejected, revert preview and show error.
- **Disabled:** All interactions disabled when it is not the player's turn.
- **Timer display:** Countdown in seconds. Flashes red below 10 seconds.

---

## Code Style
- TypeScript `strict: true` — no `any`, narrow `unknown` explicitly
- Functional components + hooks only
- File names: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Named exports everywhere; default export only for Expo Router screens
- `const` over `let`; never `var`
- Zod for all runtime validation

---

## State Management
- `gameStore` — mirrors `GameState` from server + local UI state (`draggingWall`, `wallPreview`, `highlightedSquares`)
- `authStore` — Firebase user (userId, nickname, token)
- Ephemeral UI state (animations, hover) — `useState` in components
- Never call `socket.emit` from a component — always via a hook in `hooks/`

---

## Do / Don't
- ✅ Validate every action server-side before applying
- ✅ Broadcast full `GameState` after every action (no diffs)
- ✅ Enforce timer with server-side `setTimeout`; clear on every turn change
- ✅ Run `pathExists` for BOTH players after every wall placement attempt
- ✅ Normalize all edges before storing or comparing
- ✅ Write unit tests for every function in `server/game/`
- ❌ Never trust client-reported game state
- ❌ Never put game logic in components or Zustand actions
- ❌ Never skip the path-existence check on wall placement
- ❌ Never allow diagonal movement
- ❌ Never allow a wall on a non-adjacent edge pair
- ❌ Never allow intersection of two walls

---

## Environment Variables
```
# Client (.env)
EXPO_PUBLIC_SERVER_URL=http://localhost:3001
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...

# Server (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001
```

---

## Testing
- All game logic: Jest unit tests in `server/game/__tests__/`
- Run: `cd server && npx jest`
- Every rule and edge case in this document must have a corresponding test
- A function is not done until its tests pass

## When Compacting
Preserve: current task number, files created, failing tests + error messages, unresolved edge cases.