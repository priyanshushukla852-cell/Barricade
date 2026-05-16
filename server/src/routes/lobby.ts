import { Router } from 'express';
import { z } from 'zod';
import { createRoom, joinRoom } from '../rooms/roomManager';

const router = Router();

const CreateSchema = z.object({
  userId: z.string(),
  nickname: z.string().min(1).max(20),
});

const JoinSchema = z.object({
  roomCode: z.string().length(6),
  userId: z.string(),
  nickname: z.string().min(1).max(20),
});

router.post('/create', (req, res) => {
  const result = CreateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }
  const { userId, nickname } = result.data;
  const roomCode = createRoom('pending', userId, nickname);
  res.json({ roomCode });
});

router.post('/join', (req, res) => {
  const result = JoinSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }
  const { roomCode, userId, nickname } = result.data;
  try {
    joinRoom(roomCode, 'pending', userId, nickname);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(404).json({ error: message });
  }
});

export default router;
