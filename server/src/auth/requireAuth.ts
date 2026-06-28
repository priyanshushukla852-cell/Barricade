import type { Request, Response, NextFunction } from 'express';
import { isAuthEnforced, verifyToken } from './firebaseAdmin';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Express middleware: verifies the Firebase ID token in the Authorization
// header and sets req.userId from the decoded UID. In legacy mode (verification
// disabled) it falls back to the client-supplied userId so existing clients
// keep working until enforcement is turned on.
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isAuthEnforced()) {
    req.userId = (req.body?.userId ?? req.query?.userId) as string | undefined;
    next();
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const uid = await verifyToken(token);
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.userId = uid;
  next();
}
