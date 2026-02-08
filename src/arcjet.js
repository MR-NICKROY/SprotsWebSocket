//
import arcjet, { shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  console.warn("WARNING: ARCJET_KEY is not defined. Arcjet disabled (null).");
}

// 1. HTTP Rules: Max 50 requests per minute
const httpRules = [
  shield({
    mode: "DRY_RUN",
    interval: "10s",
    max: 10, // Limit: 10 connections/min
  }), // Don't block suspicious payloads in dev
  slidingWindow({
    mode: "LIVE", // Force "LIVE" to ENFORCE the limit locally
    interval: "10s",
    max: 10, // Limit: 50 req/min
  }),
];

// 2. WebSocket Rules: Max 10 connections per minute
// We use a stricter limit here because establishing connections is expensive.
const wsRules = [
  shield({
    mode: "DRY_RUN",
    interval: "10s",
    max: 10, // Limit: 10 connections/min
  }),
  slidingWindow({
    mode: "LIVE", // Force "LIVE" to ENFORCE the limit locally
    interval: "10s",
    max: 10, // Limit: 10 connections/min
  }),
];

export const httpArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      characteristics: ["ip.src"],
      rules: httpRules,
    })
  : null;

export const wsArcjet = arcjetKey
  ? arcjet({
      key: arcjetKey,
      characteristics: ["ip.src"],
      rules: wsRules,
    })
  : null;

export function securityMiddleware() {
  return async (req, res, next) => {
    if (!httpArcjet) return next();
    try {
      const decision = await httpArcjet.protect(req);
      if (decision.isDenied()) {
        if (decision.reason.isRateLimit()) {
          return res.status(429).send("Too many requests");
        } else {
          return res.status(403).send("Forbidden");
        }
      }
      next();
    } catch (error) {
      console.log("Arcjet error:", error);
      next();
    }
  };
}
