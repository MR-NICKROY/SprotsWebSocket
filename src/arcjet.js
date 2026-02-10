import arcjet, { shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  console.warn("WARNING: ARCJET_KEY is not defined. Arcjet disabled (null).");
}

// 1. HTTP Rules: Max 10 requests per minute
const httpRules = [
  shield({
    mode: "DRY_RUN",
    interval: "10s",
    max: 10, // Limit: 10 connections/min
  }),
  slidingWindow({
    mode: "LIVE",
    interval: "10s",
    max: 10, // Limit: 10 req/min (Fixed comment to match code)
  }),
];

// 2. WebSocket Rules: Max 10 connections per minute
const wsRules = [
  shield({
    mode: "DRY_RUN",
    interval: "10s",
    max: 10, // Limit: 10 connections/min
  }),
  slidingWindow({
    mode: "LIVE",
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
