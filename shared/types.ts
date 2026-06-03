// ── Core domain types (source of truth: CLAUDE.md) ──────────────────────────

export type Position = { row: number; col: number };
export type PieceColor = 'red' | 'blue';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type TimerOption = 0 | 1 | 2 | 3 | 5; // minutes per turn; 0 = unlimited (local only)

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
  redTimeRemaining: number; // Red player's remaining seconds
  blueTimeRemaining: number; // Blue player's remaining seconds
  timerConfig: TimerOption; // Minutes per turn, set at game start
}

// ── Socket payload types ─────────────────────────────────────────────────────

export type MovePayload = { roomCode: string; direction: Direction; landingOverride?: Position };
export type WallPayload = { roomCode: string; wall: Edge };
export type JoinPayload = { roomCode: string; userId: string; nickname: string };
export type StartPayload = { roomCode: string; timerConfig: TimerOption };
export type UpdateLobbyPayload = { roomCode: string; rated: boolean };
export type QueuePayload = { userId: string; nickname: string };
export type LeaveQueuePayload = { userId: string };
export type MatchedPayload = { roomCode: string; playerColor: PieceColor };

export interface ClientToServerEvents {
  join_lobby: (payload: JoinPayload) => void;
  start_game: (payload: StartPayload) => void;
  move_piece: (payload: MovePayload) => void;
  place_wall: (payload: WallPayload) => void;
  leave_game: (payload: { roomCode: string }) => void;
  join_queue: (payload: QueuePayload) => void;
  leave_queue: (payload: LeaveQueuePayload) => void;
  update_lobby: (payload: UpdateLobbyPayload) => void;
  request_rematch: (payload: { roomCode: string }) => void;
  chat_message: (payload: { roomCode: string; text: string }) => void;
}

export interface ServerToClientEvents {
  lobby_ready: () => void;
  lobby_info: (payload: { rated: boolean }) => void;
  game_state: (state: GameState) => void;
  timer_tick: (payload: { redTimeRemaining: number; blueTimeRemaining: number }) => void;
  game_over: (payload: {
    winner: PieceColor;
    reason: 'reached_goal' | 'timeout' | 'opponent_left';
    ratingChange?: { before: number; after: number; delta: number };
  }) => void;
  opponent_left: (payload: { reconnecting: boolean; secondsLeft?: number }) => void;
  matched: (payload: MatchedPayload) => void;
  error: (payload: { message: string }) => void;
  rematch_requested: () => void;
  rematch_started: (payload: { playerColor: PieceColor }) => void;
  rematch_expired: () => void;
  chat_message: (payload: { senderId: string; senderNickname: string; text: string; timestamp: number }) => void;
}
