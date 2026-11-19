import io from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:9092', {
      transports: ['polling', 'websocket'], 
      withCredentials: false, // <--- Ye line CORS fix karti hai
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