import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import { registerSocketHandlers } from './socket/handlers';
import { query } from './db/client';
import lobbyRouter from './routes/lobby';
import ratingsRouter from './routes/ratings';

// Run migrations on every startup (all statements use IF NOT EXISTS — safe to re-run).
async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, '../src/db/migrate.sql'), 'utf8');
    await query(sql);
    console.log('Migrations applied');
  } catch (err) {
    console.error('Migration error:', err);
  }
}
runMigrations();

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());
app.use('/lobby', lobbyRouter);
app.use('/ratings', ratingsRouter);

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
