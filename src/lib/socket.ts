import { io } from "socket.io-client";

// Em produção, conectamos diretamente ao subdomínio HTTPS gerenciado pelo Cloudflare na VPS
// Isso evita os timeouts e limitações de WebSockets das Serverless Functions da Vercel.
const SOCKET_URL = process.env.NODE_ENV === "production" 
  ? "https://api.mozbet.online" 
  : (process.env.NEXT_PUBLIC_VPS_SOCKET_URL || "http://localhost:3001");

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  // Ativamos WebSockets e polling como fallback, pois a VPS e o Cloudflare suportam WebSockets nativos!
  transports: ["websocket", "polling"],
  withCredentials: true,
});

// Helper para entrar em salas
export const joinRoom = (roomName: string) => {
  socket.emit("join_room", roomName);
};

export const leaveRoom = (roomName: string) => {
  socket.emit("leave_room", roomName);
};
