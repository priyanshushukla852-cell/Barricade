import type { GameState, PieceColor } from '@shared/types';

export type RoomPlayer = {
  socketId: string;
  userId: string;
  nickname: string;
  color: PieceColor;
};

export type Room = {
  roomCode: string;
  gameId: string | null; // unique per game (regenerated on start/rematch); rating idempotency key
  state: GameState | null;
  red: RoomPlayer | null;
  blue: RoomPlayer | null;
  startedAt: Date | null;
  autoStart: boolean;
  rated: boolean;
  hostColor: PieceColor;
  finalized: boolean;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  tickInterval: NodeJS.Timeout | null;
  turnTimer: NodeJS.Timeout | null;
  rematchRequests: Set<string>;
  rematchTimer: NodeJS.Timeout | null;
  cleanupTimer: NodeJS.Timeout | null;
};

const rooms = new Map<string, Room>();

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
// Hard cap to bound memory against room-flood DoS.
const MAX_ROOMS = 10_000;

export class CapacityError extends Error {
  constructor() {
    super('Server is at capacity, please try again later');
    this.name = 'CapacityError';
  }
}

// Finds an existing un-started room this user already hosts. Makes createRoom
// idempotent so a retried/duplicated POST /lobby/create (mobile networks drop
// responses) returns the same room instead of leaking a second one.
function findHostedUnstartedRoom(userId: string): { roomCode: string; hostColor: PieceColor } | null {
  for (const [roomCode, room] of rooms) {
    if (room.state === null && !room.autoStart) {
      const host = room.hostColor === 'red' ? room.red : room.blue;
      if (host?.userId === userId) return { roomCode, hostColor: room.hostColor };
    }
  }
  return null;
}

export function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
    ).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(
  socketId: string,
  userId: string,
  nickname: string,
): { roomCode: string; hostColor: PieceColor } {
  // Idempotent: reuse an existing un-started room this user already hosts.
  const existing = findHostedUnstartedRoom(userId);
  if (existing) return existing;
  if (rooms.size >= MAX_ROOMS) throw new CapacityError();
  const roomCode = generateRoomCode();
  const hostColor: PieceColor = Math.random() < 0.5 ? 'red' : 'blue';
  const player: RoomPlayer = { socketId, userId, nickname, color: hostColor };
  rooms.set(roomCode, {
    roomCode,
    gameId: null,
    state: null,
    red: hostColor === 'red' ? player : null,
    blue: hostColor === 'blue' ? player : null,
    startedAt: null,
    autoStart: false,
    rated: true,
    hostColor,
    finalized: false,
    disconnectTimers: new Map(),
    tickInterval: null,
    turnTimer: null,
    rematchRequests: new Set(),
    rematchTimer: null,
    cleanupTimer: null,
  });
  return { roomCode, hostColor };
}

export function createMatchedRoom(
  red: { userId: string; nickname: string },
  blue: { userId: string; nickname: string },
): string {
  if (rooms.size >= MAX_ROOMS) throw new CapacityError();
  const roomCode = generateRoomCode();
  rooms.set(roomCode, {
    roomCode,
    gameId: null,
    state: null,
    red: { socketId: 'pending', userId: red.userId, nickname: red.nickname, color: 'red' },
    blue: { socketId: 'pending', userId: blue.userId, nickname: blue.nickname, color: 'blue' },
    startedAt: null,
    autoStart: true,
    rated: true,
    hostColor: 'red', // matchmaking has no concept of host — value unused
    finalized: false,
    disconnectTimers: new Map(),
    tickInterval: null,
    turnTimer: null,
    rematchRequests: new Set(),
    rematchTimer: null,
    cleanupTimer: null,
  });
  return roomCode;
}

export function joinRoom(
  roomCode: string,
  socketId: string,
  userId: string,
  nickname: string,
): PieceColor {
  const room = rooms.get(roomCode);
  if (!room) throw new Error('Room not found');
  if (room.red !== null && room.blue !== null) throw new Error('Room is full');
  const color: PieceColor = room.red === null ? 'red' : 'blue';
  room[color] = { socketId, userId, nickname, color };
  return color;
}

export function getRoom(roomCode: string): Room | null {
  return rooms.get(roomCode) ?? null;
}

export function getRoomBySocketId(
  socketId: string,
): { roomCode: string; room: Room } | null {
  for (const [roomCode, room] of rooms) {
    if (room.red?.socketId === socketId || room.blue?.socketId === socketId) {
      return { roomCode, room };
    }
  }
  return null;
}

export function updateState(roomCode: string, state: GameState): void {
  const room = rooms.get(roomCode);
  if (room) room.state = state;
}

export function removePlayer(roomCode: string, socketId: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (room.red?.socketId === socketId) room.red = null;
  else if (room.blue?.socketId === socketId) room.blue = null;
}

export function setRated(roomCode: string, rated: boolean): void {
  const room = rooms.get(roomCode);
  if (room) room.rated = rated;
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode);
}
