import { Router } from 'express';
import { z } from 'zod';
import { getRating, getProfile } from '../db/ratings';
import logger from '../logger';

const router = Router();

// userId comes from the authenticated request (req.userId), never the query —
// a user may only read their own rating/profile. offset stays a query param.
const ProfileQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
});

router.get('/me', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const data = await getRating(req.userId);
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'GET /ratings/me error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const result = ProfileQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'invalid offset' });
    return;
  }
  try {
    const data = await getProfile(req.userId, result.data.offset);
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'GET /ratings/profile error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
