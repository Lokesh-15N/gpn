import { Server } from 'socket.io';
import { Token } from './models/index.js';

let io;

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ WebSocket client connected: ${socket.id}`);

    // Subscribe to token updates
    socket.on('subscribe', (data) => {
      const { channel, tokenId, doctorId, deptId} = data;

      if (channel === 'token' && tokenId) {
        socket.join(`token:${tokenId}`);
        console.log(`Socket ${socket.id} subscribed to token:${tokenId}`);
      }

      if (channel === 'doctor_queue' && doctorId) {
        socket.join(`doctor:${doctorId}`);
        console.log(`Socket ${socket.id} subscribed to doctor:${doctorId}`);
      }

      if (channel === 'display_board' && deptId) {
        socket.join(`dept:${deptId}`);
        console.log(`Socket ${socket.id} subscribed to dept:${deptId}`);
      }

      if (channel === 'admin_dashboard') {
        socket.join('admin:dashboard');
        console.log(`Socket ${socket.id} subscribed to admin dashboard`);
      }
    });

    // Unsubscribe
    socket.on('unsubscribe', (data) => {
      const { channel, tokenId, doctorId, deptId } = data;

      if (channel === 'token' && tokenId) {
        socket.leave(`token:${tokenId}`);
      }

      if (channel === 'doctor_queue' && doctorId) {
        socket.leave(`doctor:${doctorId}`);
      }

      if (channel === 'display_board' && deptId) {
        socket.leave(`dept:${deptId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Broadcast functions
export const broadcastTokenUpdate = (tokenId, data) => {
  if (io) {
    io.to(`token:${tokenId}`).emit('token:position_updated', data);
  }
};

export const broadcastCallAlert = (tokenId, data) => {
  if (io) {
    io.to(`token:${tokenId}`).emit('token:call_alert', data);
  }
};

export const broadcastTMinus3Alert = (tokenId, data) => {
  if (io) {
    io.to(`token:${tokenId}`).emit('token:tminus3', data);
  }
};

export const broadcastDoctorQueueUpdate = (doctorId, data) => {
  if (io) {
    io.to(`doctor:${doctorId}`).emit('queue:update', data);
  }
};

export const broadcastDisplayBoardUpdate = (deptId, data) => {
  if (io) {
    io.to(`dept:${deptId}`).emit('display:queue_update', data);
  }
};

export const broadcastAdminAlert = (data) => {
  if (io) {
    io.to('admin:dashboard').emit('admin:alert', data);
  }
};

export default { initializeWebSocket, broadcastTokenUpdate, broadcastCallAlert };
