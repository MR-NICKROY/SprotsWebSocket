import { WebSocketServer, WebSocket } from "ws";
import { wsArcjet } from "../arcjet.js";

// FIX: Corrected variable name spelling
const matchSubscriptions = new Map(); // matchId -> Set of WebSocket clients

// Helper to safely send JSON
function sendJson(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  }
}

function subscribe(matchId, socket) {
  if (!matchSubscriptions.has(matchId)) {
    matchSubscriptions.set(matchId, new Set());
  }
  matchSubscriptions.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
  const subscribers = matchSubscriptions.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size === 0) {
    matchSubscriptions.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  if (!socket.subscriptions) return;
  for (const matchId of socket.subscriptions) {
    unsubscribe(matchId, socket);
  }
}

// FIX: Corrected map retrieval
function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscriptions.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket, data) {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, { type: "Error", message: "Invalid JSON format" });
    return;
  }

  // FIX: Changed check to string "subscribe" instead of function reference
  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "Subscribed", matchId: message.matchId });
    return;
  }

  // FIX: Changed check to string "unsubscribe"
  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "Unsubscribed", matchId: message.matchId });
    return;
  }
}

function broadcastToAll(clients, payload) {
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  server.on("upgrade", async (request, socket, head) => {
    if (request.url !== "/ws") return;

    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(request);
        if (decision.isDenied()) {
          const isRateLimit = decision.reason.isRateLimit();
          const message = isRateLimit ? "Too many requests" : "Forbidden";
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

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // FIX: Logic updated so it doesn't kill active connections
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

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.subscriptions = new Set();

    sendJson(socket, { type: "Welcome", message: "Connected to Horizon API" });

    socket.on("message", (data) => handleMessage(socket, data));
    socket.on("error", () => socket.terminate());
    socket.on("close", () => cleanupSubscriptions(socket));
  });

  function broadcastMatchCreated(match) {
    broadcastToAll(wss.clients, { type: "MatchCreated", data: match });
  }

  function broadcastToCommentary(matchId, commentary) {
    // FIX: Properly passing data to match subscribers
    broadcastToMatch(matchId, { type: "CommentaryUpdate", data: commentary });
  }

  return { broadcastMatchCreated, broadcastToCommentary };
}
