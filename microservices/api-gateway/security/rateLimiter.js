import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests, slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path || req.url || "";
    return p === "/metrics" || p === "/health";
  },
});