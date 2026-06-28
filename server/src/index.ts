import './instrument';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { DefaultEventsMap } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, SocketData } from '@shared/types';
import { registerSocketHandlers } from './socket/handlers';
import { isAuthEnforced, verifyToken } from './auth/firebaseAdmin';
import { requireAuth } from './auth/requireAuth';
import { query } from './db/client';
import { MIGRATION_SQL } from './db/migrations';
import lobbyRouter from './routes/lobby';
import ratingsRouter from './routes/ratings';
import logger from './logger';

async function runMigrations() {
  try {
    await query(MIGRATION_SQL);
    logger.info('Migrations applied');
  } catch (err) {
    logger.error({ err }, 'Migration error');
  }
}
runMigrations();

const IS_PROD = process.env.NODE_ENV === 'production';

const allowedOrigins = IS_PROD
  ? (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3001', 'http://localhost:8081'];

const app = express();
const httpServer = createServer(app);

// Socket.IO: keep permissive for mobile (React Native WebSocket doesn't send
// browser-style Origin headers; restricting here risks blocking the app itself).
const io = new Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Authenticate every socket connection. In legacy mode (no service account
// configured) this is a no-op and handlers fall back to client-supplied userId.
io.use(async (socket, next) => {
  if (!isAuthEnforced()) {
    next();
    return;
  }
  const token = socket.handshake.auth?.token as string | undefined;
  const uid = await verifyToken(token);
  if (!uid) {
    next(new Error('UNAUTHENTICATED'));
    return;
  }
  socket.data.userId = uid;
  next();
});

// REST CORS: block untrusted web origins from calling the API.
// Mobile clients aren't affected — they don't enforce CORS.
app.use(cors({
  origin: IS_PROD ? allowedOrigins : true,
  methods: ['GET', 'POST'],
}));

// General rate limit: 120 requests per 15 minutes per IP.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limit for lobby creation to prevent room spam.
const lobbyCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many rooms created, please try again later.' },
});

app.use(express.json());
app.use(generalLimiter);
app.use('/lobby/create', lobbyCreateLimiter);
app.use('/lobby', requireAuth, lobbyRouter);
app.use('/ratings', ratingsRouter);

Sentry.setupExpressErrorHandler(app);

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
