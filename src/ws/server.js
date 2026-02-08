//
import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

const json = JSON;

function broadcast(clients, payload) {
  const message = json.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true, // IMPORTANT: We handle the upgrade manually now
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  // 1. Handle HTTP Upgrade (The Security Gatekeeper)
  server.on("upgrade", async (request, socket, head) => {
    // Only handle upgrades for the /ws path
    if (request.url !== "/ws") {
      // Let other handlers deal with it, or close if strict
      // In this specific setup, we just ignore other paths
      return;
    }

    // Arcjet Protection Logic
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(request);

        if (decision.isDenied()) {
          // If denied, destroy the socket immediately using HTTP codes
          const isRateLimit = decision.reason.isRateLimit();
          const message = isRateLimit ? "Too many requests" : "Forbidden";

          console.warn(`Block WS Upgrade: ${message}`);

          // Send a valid HTTP error response to the client
          socket.write(
            `HTTP/1.1 ${isRateLimit ? 429 : 403} ${message}\r\n\r\n`,
          );
          socket.destroy();
          return;
        }
      } catch (error) {
        console.error("Arcjet upgrade error:", error);
        socket.destroy();
        return;
      }
    }

    // If allowed, proceed to standard WebSocket handling
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // 2. Heartbeat Logic
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  // 3. Connection Logic (Now safe from spam)
  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    console.log("New WebSocket connection established");

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        json.stringify({
          type: "Welcome",
          message: "Connected to Horizon API",
        }),
      );
    }
  });

  function broadcastMatchCreated(match) {
    broadcast(wss.clients, { type: "MatchCreated", data: match });
  }

  return { broadcastMatchCreated };
}
