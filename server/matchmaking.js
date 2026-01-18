// In-memory storage for matchmaking
let waitingUsers = [];
let activePairs = new Map(); // Map<socketId, partnerSocketId>

/**
 * Handle matchmaking logic for connecting users
 * @param {Socket} socket - Socket instance of the user
 * @param {Server} io - Socket.IO server instance
 * @param {boolean} force - Force disconnect current pair before matching
 */
export function handleMatchmaking(socket, io, force = false) {
  // If force is true, disconnect from current partner first
  if (force && activePairs.has(socket.id)) {
    const partnerId = activePairs.get(socket.id);
    const partnerSocket = io.sockets.sockets.get(partnerId);

    // Remove pair from both sides
    activePairs.delete(socket.id);
    if (partnerSocket) {
      activePairs.delete(partnerId);
      // Notify partner that their peer left
      partnerSocket.emit('partner-left');
      // Re-add partner to queue if they're still connected
      if (partnerSocket.connected) {
        if (!waitingUsers.includes(partnerId)) {
          waitingUsers.push(partnerId);
          console.log(`♻️ Partner ${partnerId} re-queued`);
        }
      }
    }

    // Remove socket from waiting list if present
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
  }

  // Remove socket from waiting list if already present (avoid duplicates)
  waitingUsers = waitingUsers.filter(id => id !== socket.id);

  // Check if socket is already in a pair
  if (!force && activePairs.has(socket.id)) {
    console.log(`⚠️ User ${socket.id} already in a pair, skipping matchmaking`);
    return;
  }

  // If there's another waiting user, pair them
  if (waitingUsers.length > 0) {
    const partnerId = waitingUsers.shift();
    const partnerSocket = io.sockets.sockets.get(partnerId);

    // Verify partner is still connected
    if (partnerSocket && partnerSocket.connected) {
      // Create pair
      activePairs.set(socket.id, partnerId);
      activePairs.set(partnerId, socket.id);

      // Notify both users they're matched
      socket.emit('matched', { partnerId });
      partnerSocket.emit('matched', { partnerId: socket.id });

      console.log(`🤝 Paired: ${socket.id} <-> ${partnerId}`);
      console.log(`📊 Active pairs: ${activePairs.size / 2}, Waiting: ${waitingUsers.length}`);
    } else {
      // Partner disconnected, try again
      console.log(`⚠️ Partner ${partnerId} not found, retrying matchmaking`);
      // Re-add current socket to queue
      waitingUsers.push(socket.id);
      // Try to match with next available user
      handleMatchmaking(socket, io);
    }
  } else {
    // No partner available, add to waiting queue
    waitingUsers.push(socket.id);
    console.log(`⏳ User ${socket.id} added to queue (${waitingUsers.length} waiting)`);
  }
}

/**
 * Get current matchmaking statistics (for debugging)
 */
export function getMatchmakingStats() {
  return {
    waitingUsers: waitingUsers.length,
    activePairs: activePairs.size / 2,
    waitingUserIds: [...waitingUsers],
    activePairIds: Array.from(activePairs.entries())
  };
}

