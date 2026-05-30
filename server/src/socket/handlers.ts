import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import logger from '../logger';
import {
  getRoom,
  getRoomBySocketId,
  joinRoom,
  updateState,
  deleteRoom,
  createMatchedRoom,
  setRated,
} from '../rooms/roomManager';
import type { Room } from '../rooms/roomManager';
import { enqueue, dequeue, dequeueBySocketId, tryMatch } from '../rooms/matchmakingQueue';
import { createInitialState, applyMove, applyWall, checkWinner } from '../game';
import { saveGame } from '../db/saveGame';
import { applyRatings, getRating } from '../db/ratings';

const PositionSchema = z.object({ row: z.number().int(), col: z.number().int() });
const EdgeSchema = z.object({ from: PositionSchema, to: PositionSchema });

const JoinSchema = z.object({
  roomCode: z.string(),
  userId: z.string(),
  nickname: z.string(),
});
const StartSchema = z.object({
  roomCode: z.string(),
  timerConfig: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5)]),
});
const MoveSchema = z.object({
  roomCode: z.string(),
  direction: z.enum(['up', 'down', 'left', 'right']),
});
const WallSchema = z.object({ roomCode: z.string(), wall: EdgeSchema });
const LeaveSchema = z.object({ roomCode: z.string() });
const QueueSchema = z.object({ userId: z.string(), nickname: z.string() });
const LeaveQueueSchema = z.object({ userId: z.string() });
const UpdateLobbySchema = z.object({ roomCode: z.string(), rated: z.boolean() });
const RematchSchema = z.object({ roomCode: z.string() });

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const RECONNECT_SECONDS = 60;

async function finalizeGame(
  io: AppServer,
  roomCode: string,
  room: Room,
  winner: import('@shared/types').PieceColor,
  reason: 'reached_goal' | 'timeout' | 'opponent_left',
): Promise<void> {
  const winnerPlayer = winner === 'red' ? room.red : room.blue;
  const loserPlayer = winner === 'red' ? room.blue : room.red;

  let winnerChange: { before: number; after: number; delta: number } | undefined;
  let loserChange: { before: number; after: number; delta: number } | undefined;

  if (winnerPlayer && loserPlayer && room.rated) {
    try {
      const update = await applyRatings(roomCode, winner, winnerPlayer.userId, loserPlayer.userId, reason);
      winnerChange = update.winner;
      loserChange = update.loser;
    } catch (err) {
      logger.error({ err }, 'applyRatings error');
    }
  }

  // Emit to each player individually so each gets their own ratingChange
  if (winnerPlayer && winnerPlayer.socketId !== 'pending') {
    const sock = io.sockets.sockets.get(winnerPlayer.socketId);
    sock?.emit('game_over', { winner, reason, ratingChange: winnerChange });
  }
  if (loserPlayer && loserPlayer.socketId !== 'pending') {
    const sock = io.sockets.sockets.get(loserPlayer.socketId);
    sock?.emit('game_over', { winner, reason, ratingChange: loserChange });
  }

  if (room.red && room.blue && room.startedAt) {
    saveGame(roomCode, winner, room.red.userId, room.blue.userId, room.startedAt).catch((err) => logger.error({ err }, 'finalizeGame error'));
  }

  // Keep room alive for 90 s to allow rematch, then clean up.
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => deleteRoom(roomCode), 90_000);
}

export function clearTurnTimer(room: Room): void {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  if (room.tickInterval) clearInterval(room.tickInterval);
  room.turnTimer = null;
  room.tickInterval = null;
}

export function startTurnTimer(io: AppServer, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room || !room.state) return;

  clearTurnTimer(room);

  const activePlayer = room.state.currentTurn;
  const durationMs =
    (activePlayer === 'red' ? room.state.redTimeRemaining : room.state.blueTimeRemaining) * 1000;

  room.tickInterval = setInterval(() => {
    const r = getRoom(roomCode);
    if (!r || !r.state) return;
    if (r.state.currentTurn === 'red') {
      r.state.redTimeRemaining = Math.max(0, r.state.redTimeRemaining - 1);
    } else {
      r.state.blueTimeRemaining = Math.max(0, r.state.blueTimeRemaining - 1);
    }
    io.to(roomCode).emit('timer_tick', {
      redTimeRemaining: r.state.redTimeRemaining,
      blueTimeRemaining: r.state.blueTimeRemaining,
    });
  }, 1000);

  room.turnTimer = setTimeout(() => {
    const r = getRoom(roomCode);
    if (!r || !r.state) return;
    clearTurnTimer(r);
    const winner = r.state.currentTurn === 'red' ? 'blue' : 'red';
    r.state.winner = winner;
    r.state.phase = 'game_over';
    finalizeGame(io, roomCode, r, winner, 'timeout').catch((err) => logger.error({ err }, 'finalizeGame error'));
  }, durationMs);
}

export function registerSocketHandlers(io: AppServer, socket: AppSocket) {
  socket.on('join_lobby', (payload) => {
    const result = JoinSchema.safeParse(payload);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid join_lobby payload' });
      return;
    }
    const { roomCode, userId, nickname } = result.data;

    const room = getRoom(roomCode);

    // Player already in the room (pre-registered via REST or reconnecting after disconnect).
    if (room) {
      const existing = room.red?.userId === userId
        ? room.red
        : room.blue?.userId === userId
          ? room.blue
          : null;
      if (existing) {
        const timer = room.disconnectTimers.get(userId);
        if (timer) {
          clearTimeout(timer);
          room.disconnectTimers.delete(userId);
        }
        existing.socketId = socket.id;
        socket.join(roomCode);

        if (room.state) {
          // Game already in progress — catch the player up.
          socket.emit('game_state', room.state);
          // Restart turn timer if it was cleared by a disconnect.
          if (!room.turnTimer && room.state.phase === 'choosing') {
            startTurnTimer(io, roomCode);
          }
        } else {
          // Still in lobby — notify when both players have an active socket.
          const redReady = room.red !== null && room.red.socketId !== 'pending';
          const blueReady = room.blue !== null && room.blue.socketId !== 'pending';
          if (redReady && blueReady) {
            io.to(roomCode).emit('lobby_ready');
            io.to(roomCode).emit('lobby_info', { rated: room.rated });
            // Auto-start for random-matched rooms (no host needed).
            if (room.autoStart) {
              const state = createInitialState(3);
              updateState(roomCode, state);
              room.startedAt = new Date();
              startTurnTimer(io, roomCode);
              io.to(roomCode).emit('game_state', state);
            }
          }
        }
        return;
      }
    }

    // First-time join via socket only (no prior REST registration).
    socket.join(roomCode);
    try {
      joinRoom(roomCode, socket.id, userId, nickname);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Join failed';
      socket.emit('error', { message });
      return;
    }
    const updated = getRoom(roomCode);
    if (updated && updated.red !== null && updated.blue !== null) {
      io.to(roomCode).emit('lobby_ready');
      io.to(roomCode).emit('lobby_info', { rated: updated.rated });
    }
  });

  socket.on('update_lobby', (payload) => {
    const result = UpdateLobbySchema.safeParse(payload);
    if (!result.success) return;
    const { roomCode, rated } = result.data;
    const room = getRoom(roomCode);
    const hostPlayer = room ? (room.hostColor === 'red' ? room.red : room.blue) : null;
    if (!room || hostPlayer?.socketId !== socket.id) return; // only host may change this
    setRated(roomCode, rated);
    io.to(roomCode).emit('lobby_info', { rated });
  });

  socket.on('start_game', (payload) => {
    const result = StartSchema.safeParse(payload);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid start_game payload' });
      return;
    }
    const { roomCode, timerConfig } = result.data;
    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (!room.red || !room.blue) {
      socket.emit('error', { message: 'Not enough players' });
      return;
    }
    const state = createInitialState(timerConfig);
    updateState(roomCode, state);
    room.startedAt = new Date();
    startTurnTimer(io, roomCode);
    io.to(roomCode).emit('game_state', state);
  });

  socket.on('move_piece', (payload) => {
    const result = MoveSchema.safeParse(payload);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid move_piece payload' });
      return;
    }
    const { roomCode, direction } = result.data;
    const room = getRoom(roomCode);
    if (!room || !room.state) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    const color =
      room.red?.socketId === socket.id
        ? 'red'
        : room.blue?.socketId === socket.id
          ? 'blue'
          : null;
    if (!color || color !== room.state.currentTurn) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    let newState;
    try {
      newState = applyMove(room.state, direction);
    } catch (err) {
      socket.emit('error', { message: err instanceof Error ? err.message : 'Move failed' });
      return;
    }
    const winner = checkWinner(newState);
    if (winner) {
      newState = { ...newState, winner, phase: 'game_over' as const };
      clearTurnTimer(room);
      updateState(roomCode, newState);
      finalizeGame(io, roomCode, room, winner, 'reached_goal').catch((err) => logger.error({ err }, 'finalizeGame error'));
    } else {
      updateState(roomCode, newState);
      clearTurnTimer(room);
      startTurnTimer(io, roomCode);
      io.to(roomCode).emit('game_state', newState);
    }
  });

  socket.on('place_wall', (payload) => {
    const result = WallSchema.safeParse(payload);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid place_wall payload' });
      return;
    }
    const { roomCode, wall } = result.data;
    const room = getRoom(roomCode);
    if (!room || !room.state) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    const color =
      room.red?.socketId === socket.id
        ? 'red'
        : room.blue?.socketId === socket.id
          ? 'blue'
          : null;
    if (!color || color !== room.state.currentTurn) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    let newState;
    try {
      newState = applyWall(room.state, wall);
    } catch (err) {
      socket.emit('error', {
        message: err instanceof Error ? err.message : 'Wall placement failed',
      });
      return;
    }
    const winner = checkWinner(newState);
    if (winner) {
      newState = { ...newState, winner, phase: 'game_over' as const };
      clearTurnTimer(room);
      updateState(roomCode, newState);
      finalizeGame(io, roomCode, room, winner, 'reached_goal').catch((err) => logger.error({ err }, 'finalizeGame error'));
    } else {
      updateState(roomCode, newState);
      clearTurnTimer(room);
      startTurnTimer(io, roomCode);
      io.to(roomCode).emit('game_state', newState);
    }
  });

  socket.on('leave_game', (payload) => {
    const result = LeaveSchema.safeParse(payload);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid leave_game payload' });
      return;
    }
    const { roomCode } = result.data;
    const room = getRoom(roomCode);
    if (!room) return;

    // Game not yet started (lobby cancel) — clean up without penalties.
    if (!room.state) {
      clearTurnTimer(room);
      deleteRoom(roomCode);
      socket.to(roomCode).emit('opponent_left', { reconnecting: false });
      return;
    }

    const leavingColor = room.red?.socketId === socket.id ? 'red'
      : room.blue?.socketId === socket.id ? 'blue'
      : null;
    const winner = leavingColor === 'red' ? 'blue' : 'red';

    clearTurnTimer(room);
    finalizeGame(io, roomCode, room, winner, 'opponent_left').catch((err) => logger.error({ err }, 'finalizeGame error'));
  });

  socket.on('join_queue', async (payload) => {
    const result = QueueSchema.safeParse(payload);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid join_queue payload' });
      return;
    }
    const { userId, nickname } = result.data;
    const { rating } = await getRating(userId).catch(() => ({ rating: 1200, gamesPlayed: 0, wins: 0, losses: 0 }));
    enqueue({ userId, socketId: socket.id, nickname, joinedAt: Date.now(), rating });

    const match = tryMatch();
    if (!match) return;

    const [player1, player2] = match;
    const roomCode = createMatchedRoom(
      { userId: player1.userId, nickname: player1.nickname },
      { userId: player2.userId, nickname: player2.nickname },
    );

    const sock1 = io.sockets.sockets.get(player1.socketId);
    const sock2 = io.sockets.sockets.get(player2.socketId);

    if (!sock1 || !sock2) {
      // A socket disconnected between queuing and matching — re-queue the survivor.
      deleteRoom(roomCode);
      if (sock1) enqueue(player1);
      if (sock2) enqueue(player2);
      return;
    }

    sock1.emit('matched', { roomCode, playerColor: 'red' });
    sock2.emit('matched', { roomCode, playerColor: 'blue' });
  });

  socket.on('leave_queue', (payload) => {
    const result = LeaveQueueSchema.safeParse(payload);
    if (!result.success) return;
    dequeue(result.data.userId);
  });

  socket.on('request_rematch', (payload) => {
    const result = RematchSchema.safeParse(payload);
    if (!result.success) return;
    const { roomCode } = result.data;
    const room = getRoom(roomCode);
    if (!room || !room.red || !room.blue) return;

    const requester = room.red.socketId === socket.id ? room.red
      : room.blue.socketId === socket.id ? room.blue
      : null;
    if (!requester) return;

    room.rematchRequests.add(requester.userId);

    if (room.rematchRequests.size === 1) {
      // First request: notify opponent and start 30 s window.
      socket.to(roomCode).emit('rematch_requested');
      room.rematchTimer = setTimeout(() => {
        const r = getRoom(roomCode);
        if (!r) return;
        io.to(roomCode).emit('rematch_expired');
        if (r.rematchTimer) { clearTimeout(r.rematchTimer); r.rematchTimer = null; }
      }, 30_000);
    } else {
      // Both requested: swap colors, start new game.
      if (room.rematchTimer) { clearTimeout(room.rematchTimer); room.rematchTimer = null; }
      if (room.cleanupTimer) { clearTimeout(room.cleanupTimer); room.cleanupTimer = null; }

      const oldRed = { ...room.red };
      const oldBlue = { ...room.blue };
      room.red = { ...oldBlue, color: 'red' };
      room.blue = { ...oldRed, color: 'blue' };
      room.rematchRequests.clear();

      const timerConfig = (room.state?.timerConfig ?? 3) as import('@shared/types').TimerOption;
      const newState = createInitialState(timerConfig === 0 ? 3 : timerConfig);
      updateState(roomCode, newState);
      room.startedAt = new Date();

      const redSock = io.sockets.sockets.get(room.red.socketId);
      const blueSock = io.sockets.sockets.get(room.blue.socketId);
      redSock?.emit('rematch_started', { playerColor: 'red' });
      blueSock?.emit('rematch_started', { playerColor: 'blue' });

      startTurnTimer(io, roomCode);
      io.to(roomCode).emit('game_state', newState);
    }
  });

  socket.on('disconnect', () => {
    dequeueBySocketId(socket.id);
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { roomCode, room } = found;

    const disconnecting = room.red?.socketId === socket.id ? room.red : room.blue;
    if (!disconnecting) return;

    // Notify the other player they can wait for reconnect
    socket.to(roomCode).emit('opponent_left', {
      reconnecting: true,
      secondsLeft: RECONNECT_SECONDS,
    });
    clearTurnTimer(room);

    const timer = setTimeout(() => {
      const r = getRoom(roomCode);
      if (!r) return;
      // The winner is whichever player is NOT the one who disconnected
      const winner = disconnecting.color === 'red' ? 'blue' : 'red';
      finalizeGame(io, roomCode, r, winner, 'opponent_left').catch((err) => logger.error({ err }, 'finalizeGame error'));
    }, RECONNECT_SECONDS * 1000);

    room.disconnectTimers.set(disconnecting.userId, timer);
  });
}
