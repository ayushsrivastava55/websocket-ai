"use client";

import { io, Socket } from "socket.io-client";
import { nanoid } from "nanoid";

let socket: Socket | null = null;

function getSessionId(): string {
  const key = "chat-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = nanoid();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      auth: { sessionId: getSessionId() },
    });
  }
  return socket;
}
