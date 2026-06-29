import type { Socket } from 'socket.io';

// Per-socket fixed-window rate limiter. Socket events (unlike REST) have no
// built-in limiting, so cheap-to-spam events (chat, moves, queue churn) could
// flood a room or the server. State is held in a WeakMap keyed by the socket, so
// it's reclaimed automatically when the socket disconnects.
type Window = { count: number; resetAt: number };
const buckets = new WeakMap<object, Map<string, Window>>();

/** Returns true if the action is allowed, false if the per-socket limit is exceeded. */
export function allowAction(socket: Socket, key: string, max: number, windowMs: number): boolean {
  let perSocket = buckets.get(socket);
  if (!perSocket) {
    perSocket = new Map();
    buckets.set(socket, perSocket);
  }
  const now = Date.now();
  const win = perSocket.get(key);
  if (!win || now >= win.resetAt) {
    perSocket.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (win.count >= max) return false;
  win.count += 1;
  return true;
}
