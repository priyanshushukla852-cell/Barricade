import { Router } from 'express';
import { z } from 'zod';
import { getRating, getProfile } from '../db/ratings';
import logger from '../logger';

const router = Router();

const QuerySchema = z.object({ userId: z.string().min(1) });
const ProfileQuerySchema = z.object({
  userId: z.string().min(1),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get('/me', async (req, res) => {
  const result = QuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'userId query param required' });
    return;
  }
  try {
    const data = await getRating(result.data.userId);
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'GET /ratings/me error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', async (req, res) => {
  const result = ProfileQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'userId query param required' });
    return;
  }
  try {
    const data = await getProfile(result.data.userId, result.data.offset);
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'GET /ratings/profile error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
