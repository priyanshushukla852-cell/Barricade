import './instrument';
import express from 'express';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import { registerSocketHandlers } from './socket/handlers';
import { query } from './db/client';
import lobbyRouter from './routes/lobby';
import ratingsRouter from './routes/ratings';
import logger from './logger';

async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, '../src/db/migrate.sql'), 'utf8');
    await query(sql);
    logger.info('Migrations applied');
  } catch (err) {
    logger.error({ err }, 'Migration error');
  }
}
runMigrations();

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,   // wait 60 s for pong before disconnecting (generous for mobile)
  pingInterval: 25000,  // ping every 25 s
});

app.use(express.json());
app.use('/lobby', lobbyRouter);
app.use('/ratings', ratingsRouter);

Sentry.setupExpressErrorHandler(app);

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
