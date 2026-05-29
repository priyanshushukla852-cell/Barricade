import { Router } from 'express';
import { z } from 'zod';
import { getRating } from '../db/ratings';

const router = Router();

const QuerySchema = z.object({ userId: z.string().min(1) });

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
    console.error('GET /ratings/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
