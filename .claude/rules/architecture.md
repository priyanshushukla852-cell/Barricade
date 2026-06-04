# Architecture

## Tech Stack
- **Frontend**: React Native (Expo SDK), TypeScript, Zustand, Expo Router
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL (Neon)
- **Auth**: Firebase Auth (email + Google OAuth)
- **Hosting**: Railway (backend), Expo EAS (mobile builds)

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

## Game Logic Functions (server/game/ — pure functions, no mutations, no I/O)

| File | Function | Notes |
|---|---|---|
| `normalizeEdge.ts` | `normalizeEdge(edge): Edge` | Ensures from < to (row-major) |
| `getAdjacentSquare.ts` | `getAdjacentSquare(pos, dir): Position \| null` | Returns null if out of bounds |
| `isWallBlocking.ts` | `isWallBlocking(walls, from, to): boolean` | Checks normalized edge in placedWalls |
| `getValidMoves.ts` | `getValidMoves(state): Direction[]` | All legal directions for currentTurn player |
| `getValidMoves.ts` | `getDeflectedJumps(state): DeflectedJump[]` | Deflected jump landing positions when straight jump is blocked |
| `applyMove.ts` | `applyMove(state, dir, landingOverride?): GameState` | Applies move + jump/deflected jump. Throws if invalid. |
| `wallsIntersect.ts` | `wallsIntersect(a, b): boolean` | True if two walls cross at a grid point |
| `pathExists.ts` | `pathExists(walls, from, target): boolean` | BFS on 9×9 respecting walls |
| `isWallPlacementValid.ts` | `isWallPlacementValid(state, wall): boolean` | Checks adjacency + overlap + intersection + path rule |
| `applyWall.ts` | `applyWall(state, wall): GameState` | Places wall. Throws if invalid. |
| `checkWinner.ts` | `checkWinner(state): PieceColor \| null` | Checks if either piece has reached the opponent's starting row |
| `createInitialState.ts` | `createInitialState(timerConfig): GameState` | Returns starting GameState |

## Architecture Rules
- All game logic in `server/game/` only — pure functions, fully unit tested.
- Client never mutates game state — emits actions, renders server broadcasts.
- Timer enforced server-side with `setTimeout`. Cleared and reset on every turn change.
- Wall validity (including path check) always validated server-side. Client preview uses local validation for UX only.
- All socket payloads validated with Zod before processing. Invalid → emit `error`, return.
- Never use untyped `socket.emit` — always use typed payload types from `shared/types.ts`.
- Firebase Auth for identity only. Session state managed by backend.
- **Server game files** (`server/src/game/`) must be kept in sync with `shared/game/` — they are separate copies, not symlinks.

## Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `join_lobby` | `JoinPayload` | Join or create a room |
| `start_game` | `StartPayload` | Host starts game with timer config |
| `move_piece` | `MovePayload` | Move piece in a direction (optional landingOverride for deflected jumps) |
| `place_wall` | `WallPayload` | Place a wall on an edge |
| `leave_game` | `{ roomCode: string }` | Forfeit — opponent wins |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `game_state` | `GameState` | Full state after every action |
| `timer_tick` | `{ redTimeRemaining, blueTimeRemaining }` | Emitted every second during active turn |
| `game_over` | `{ winner: PieceColor; reason; ratingChange? }` | Game ended |
| `opponent_left` | `{ reconnecting: boolean; secondsLeft?: number }` | Opponent disconnected |
| `error` | `{ message: string }` | Invalid action rejected |

## State Management
- `gameStore` — mirrors `GameState` from server + local UI state (`draggingWall`, `wallPreview`, `highlightedSquares`, `deflectedJumps`)
- `authStore` — Firebase user (userId, nickname, token, rating)
- Ephemeral UI state (animations, hover) — `useState` in components
- Never call `socket.emit` from a component — always via a hook in `hooks/`
