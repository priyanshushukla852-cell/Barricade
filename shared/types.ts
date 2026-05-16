// ── Core domain types (source of truth: CLAUDE.md) ──────────────────────────

export type Position = { row: number; col: number };
export type PieceColor = 'red' | 'blue';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type TimerOption = 1 | 2 | 3 | 5; // minutes per turn

// An edge between two adjacent squares. Always normalize before storing or comparing.
// "Lesser" position = smaller row first; if same row, smaller col first.
export type Edge = { from: Position; to: Position };

export interface GameState {
  redPosition: Position; // Red piece's current square
  bluePosition: Position; // Blue piece's current square
  redWallsRemaining: number; // 0–10
  blueWallsRemaining: number; // 0–10
  placedWalls: Edge[]; // All walls on the board (normalized)
  currentTurn: PieceColor;
  phase: 'choosing' | 'game_over';
  winner: PieceColor | null;
  timerSeconds: number; // Current countdown (server-managed)
  timerConfig: TimerOption; // Minutes per turn, set at game start
}

// ── Socket payload types ─────────────────────────────────────────────────────

export type MovePayload = { roomCode: string; direction: Direction };
export type WallPayload = { roomCode: string; wall: Edge };
export type JoinPayload = { roomCode: string; userId: string; nickname: string };
export type StartPayload = { roomCode: string; timerConfig: TimerOption };

export interface ClientToServerEvents {
  join_lobby: (payload: JoinPayload) => void;
  start_game: (payload: StartPayload) => void;
  move_piece: (payload: MovePayload) => void;
  place_wall: (payload: WallPayload) => void;
  leave_game: (payload: { roomCode: string }) => void;
}

export interface ServerToClientEvents {
  lobby_ready: () => void;
  game_state: (state: GameState) => void;
  timer_tick: (payload: { seconds: number }) => void;
  game_over: (payload: {
    winner: PieceColor;
    reason: 'reached_goal' | 'timeout' | 'opponent_left';
  }) => void;
  opponent_left: (payload: { reconnecting: boolean; secondsLeft?: number }) => void;
  error: (payload: { message: string }) => void;
}
