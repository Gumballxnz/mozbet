import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_VPS_SOCKET_URL ||
  "";

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,

  transports: ["websocket", "polling"],
  withCredentials: true,
});

export const joinRoom = (roomName: string) => {
  socket.emit("join_room", roomName);
};

export const leaveRoom = (roomName: string) => {
  socket.emit("leave_room", roomName);
};
