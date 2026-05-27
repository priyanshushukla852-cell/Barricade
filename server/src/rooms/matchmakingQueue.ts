export type QueueEntry = {
  userId: string;
  socketId: string;
  nickname: string;
  joinedAt: number;
};

const queue: QueueEntry[] = [];

export function enqueue(entry: QueueEntry): void {
  if (queue.some((e) => e.userId === entry.userId)) return;
  queue.push(entry);
}

export function dequeue(userId: string): void {
  const idx = queue.findIndex((e) => e.userId === userId);
  if (idx !== -1) queue.splice(idx, 1);
}

export function dequeueBySocketId(socketId: string): void {
  const idx = queue.findIndex((e) => e.socketId === socketId);
  if (idx !== -1) queue.splice(idx, 1);
}

// Returns the first two waiting players (FIFO) or null if fewer than 2.
export function tryMatch(): [QueueEntry, QueueEntry] | null {
  if (queue.length < 2) return null;
  const first = queue.shift()!;
  const second = queue.shift()!;
  return [first, second];
}
