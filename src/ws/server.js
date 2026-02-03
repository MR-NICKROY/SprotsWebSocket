// src/ws/server.js
import { WebSocket, WebSocketServer } from "ws";

// Assume json is a custom JSON utility module (or use standard JSON)
const json = JSON; // fallback if you don't have the custom module imported

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(json.stringify(payload));
}

function broadcast(clients, payload) {
  // FIX: wss.clients is a Set, so we must loop through every client
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json.stringify(payload));
    }
  });
}

export function attachWebSocketServer(server) {
  // FIX: Use WebSocketServer directly, not WebSocket.Server
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024, // 1 MB
  });

  wss.on("connection", (socket) => {
    sendJson(socket, { type: "Welcome", message: "Connection established" });

    socket.on("error", console.error);
  });

  function broadcastMatchCreated(match) {
    broadcast(wss.clients, { type: "MatchCreated", data: match });
  }

  return { broadcastMatchCreated };
}
