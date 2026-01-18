import { io } from 'socket.io-client';

// Socket.IO connection
// Change this URL to match your server
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

/**
 * Initialize socket connection with event handlers
 */
export function initializeSocket() {
  socket.on('connect', () => {
    console.log('🔌 Connected to server:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('♻️ Reconnected to server after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Failed to reconnect to server');
  });
}

export default socket;

