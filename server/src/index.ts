import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@shared/types';
import { registerSocketHandlers } from './socket/handlers';
import lobbyRouter from './routes/lobby';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());
app.use('/lobby', lobbyRouter);

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
