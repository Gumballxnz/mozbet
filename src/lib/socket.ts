import { io } from "socket.io-client";

// O IP da tua VPS Oracle (em produção, isto virá do .env)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://155.248.224.133:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// Helper para entrar em salas
export const joinRoom = (roomName: string) => {
  socket.emit("join_room", roomName);
};

export const leaveRoom = (roomName: string) => {
  socket.emit("leave_room", roomName);
};
