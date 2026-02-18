import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(channel, id, callback) {
    if (!this.socket) this.connect();

    const data = {};
    data.channel = channel;

    if (channel === 'token') data.tokenId = id;
    if (channel === 'doctor_queue') data.doctorId = id;
    if (channel === 'display_board') data.deptId = id;

    this.socket.emit('subscribe', data);

    // Store callback
    const key = `${channel}:${id}`;
    this.listeners.set(key, callback);
  }

  unsubscribe(channel, id) {
    if (!this.socket) return;

    const data = {};
    data.channel = channel;

    if (channel === 'token') data.tokenId = id;
    if (channel === 'doctor_queue') data.doctorId = id;
    if (channel === 'display_board') data.deptId = id;

    this.socket.emit('unsubscribe', data);

    // Remove callback
    const key = `${channel}:${id}`;
    this.listeners.delete(key);
  }

  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

const websocketService = new WebSocketService();

export default websocketService;
