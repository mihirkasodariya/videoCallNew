import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket.js';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

// CORS configuration for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Random Video Chat Server' });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

