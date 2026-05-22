import { io } from "socket.io-client";

// Em produção, usamos um path relativo ("") para que os requests passem pelo proxy (rewrites)
// do Next.js (Vercel) e não causem erro de Mixed Content (HTTPS -> HTTP).
// A Vercel não suporta proxy de WebSockets puros, portanto forçamos "polling".
// SEGURANÇA: IP do servidor nunca hardcoded — vem de variável de ambiente em dev
const SOCKET_URL = process.env.NODE_ENV === "production" ? "" : (process.env.NEXT_PUBLIC_VPS_SOCKET_URL || "http://localhost:3001");

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  transports: ["polling"], // Forçado polling porque Vercel não suporta WS Rewrites
  withCredentials: true,
});

// Helper para entrar em salas
export const joinRoom = (roomName: string) => {
  socket.emit("join_room", roomName);
};

export const leaveRoom = (roomName: string) => {
  socket.emit("leave_room", roomName);
};
