import { Router } from 'express';
import { z } from 'zod';
import { createRoom, joinRoom, CapacityError } from '../rooms/roomManager';

const router = Router();

// userId is taken from the authenticated request (req.userId), never the body —
// the body's nickname is display-only.
const CreateSchema = z.object({
  nickname: z.string().min(1).max(20),
});

const JoinSchema = z.object({
  roomCode: z.string().length(6),
  nickname: z.string().min(1).max(20),
});

router.post('/create', (req, res) => {
  const result = CreateSchema.safeParse(req.body);
  if (!result.success || !req.userId) {
    res.status(result.success ? 401 : 400).json({ error: result.success ? 'Authentication required' : result.error.format() });
    return;
  }
  const { nickname } = result.data;
  try {
    const { roomCode, hostColor } = createRoom('pending', req.userId, nickname);
    res.json({ roomCode, playerColor: hostColor });
  } catch (err) {
    if (err instanceof CapacityError) {
      res.status(503).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post('/join', (req, res) => {
  const result = JoinSchema.safeParse(req.body);
  if (!result.success || !req.userId) {
    res.status(result.success ? 401 : 400).json({ error: result.success ? 'Authentication required' : result.error.format() });
    return;
  }
  const { roomCode, nickname } = result.data;
  try {
    const playerColor = joinRoom(roomCode, 'pending', req.userId, nickname);
    res.json({ ok: true, playerColor });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(404).json({ error: message });
  }
});

export default router;
