// ============================================================
// EventPulse Engine — バックエンド エントリーポイント
// ============================================================
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerSocketHandlers } from './socket/handlers';
import { roomRouter } from './routes/rooms';

const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// REST API
app.use('/api/rooms', roomRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[EventPulse] Backend listening on port ${PORT}`);
});
