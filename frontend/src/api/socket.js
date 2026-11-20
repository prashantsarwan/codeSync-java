import io from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    // Vercel par set kiya hua VITE_SOCKET_URL yahan aayega
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9092';
    
    socket = io(socketUrl, {
      transports: ['polling', 'websocket'], 
      withCredentials: false, 
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { 
    socket.disconnect(); 
    socket = null; 
  }
};