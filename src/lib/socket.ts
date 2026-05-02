import { io } from "socket.io-client";

// Em produção, usamos um path relativo ("") para que os requests passem pelo proxy (rewrites)
// do Next.js (Vercel) e não causem erro de Mixed Content (HTTPS -> HTTP).
// A Vercel não suporta proxy de WebSockets puros, portanto forçamos "polling".
const SOCKET_URL = process.env.NODE_ENV === "production" ? "" : "http://155.248.224.133:3001";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: process.env.NODE_ENV === "production" ? ["polling"] : ["polling", "websocket"],
});

// Helper para entrar em salas
export const joinRoom = (roomName: string) => {
  socket.emit("join_room", roomName);
};

export const leaveRoom = (roomName: string) => {
  socket.emit("leave_room", roomName);
};
