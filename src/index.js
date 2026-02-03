import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
const PORT = Number(process.env.PORT);
const HOST = process.env.HOST;
const app = express();
const server = http.createServer(app);

// Middleware to parse JSON bodies
app.use(express.json());

// Root GET route
app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.use("/matches", matchRouter);
// Import and attach WebSocket server
// Assume attachWebSocketServer is defined in src/ws/server.js

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
// Start the server and log the URL
server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server started on ${baseUrl}`);
  console.log(`WebSocket server available at ${baseUrl.replace('http', 'ws')}/ws`)
});
