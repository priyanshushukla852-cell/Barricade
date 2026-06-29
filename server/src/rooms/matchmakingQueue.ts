export type QueueEntry = {
  userId: string;
  socketId: string;
  nickname: string;
  joinedAt: number;
  rating: number;
};

const RATING_WINDOW = 300;
// Hard cap to bound memory against queue-flood DoS.
const MAX_QUEUE = 5000;

const queue: QueueEntry[] = [];

export function enqueue(entry: QueueEntry): void {
  if (queue.some((e) => e.userId === entry.userId)) return;
  if (queue.length >= MAX_QUEUE) return; // drop silently when saturated
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

// Matches the longest-waiting player against the closest-rated opponent within
// RATING_WINDOW. Falls back to FIFO if nobody fits the window.
export function tryMatch(): [QueueEntry, QueueEntry] | null {
  if (queue.length < 2) return null;

  const candidate = queue[0];

  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 1; i < queue.length; i++) {
    const diff = Math.abs(queue[i].rating - candidate.rating);
    if (diff <= RATING_WINDOW && diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  // Fall back to the next FIFO entry if no one is within the rating window.
  const matchIdx = bestIdx !== -1 ? bestIdx : 1;

  queue.splice(0, 1); // remove candidate
  const opponent = queue.splice(matchIdx - 1, 1)[0]!;
  return [candidate, opponent];
}
