import { handleMatchmaking } from './matchmaking.js';

/**
 * Setup Socket.IO connection handlers and event listeners
 * @param {Server} io - Socket.IO server instance
 */
export function setupSocketHandlers(io) {
  // Store socket instances by socket ID for easy access
  const sockets = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ New connection: ${socket.id}`);
    sockets.set(socket.id, socket);

    // Handle matchmaking when user joins queue
    socket.on('join-queue', () => {
      console.log(`📥 User ${socket.id} joined queue`);
      handleMatchmaking(socket, io);
    });

    // Relay signaling messages between paired users
    socket.on('signal', (data) => {
      const { targetId, signal } = data;
      console.log(`📨 Signal from ${socket.id} to ${targetId}`, signal.type);

      const targetSocket = sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('signal', {
          fromId: socket.id,
          signal: signal
        });
      } else {
        console.warn(`⚠️ Target socket ${targetId} not found`);
      }
    });

    // Handle user requesting next partner (disconnect current and re-match)
    socket.on('next', () => {
      console.log(`🔄 User ${socket.id} requested next partner`);
      handleMatchmaking(socket, io, true); // force: true to disconnect current pair first
    });

    // Handle user leaving (cleanup and notify partner)
    socket.on('leave', () => {
      console.log(`👋 User ${socket.id} leaving`);
      handleMatchmaking(socket, io, true); // Clean up current pair
    });

    // Handle disconnection (cleanup and notify partner)
    socket.on('disconnect', (reason) => {
      console.log(`❌ User ${socket.id} disconnected: ${reason}`);
      sockets.delete(socket.id);
      handleMatchmaking(socket, io, true); // Clean up current pair
    });
  });
}

