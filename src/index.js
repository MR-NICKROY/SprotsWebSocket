import express from "express";
import { matchRouter } from "./routes/matches.js";
const app = express();
const PORT = 8000;

// Middleware to parse JSON bodies
app.use(express.json());

// Root GET route
app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.use("/matches", matchRouter);

// Start the server and log the URL
app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
