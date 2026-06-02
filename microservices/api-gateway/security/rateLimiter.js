import rateLimit from "express-rate-limit";

/**
 * Defaults match the historical limit (100 requests / minute / IP) so
 * production behaviour is unchanged. The two env vars below let the
 * Locust suite (and any future load-testing harness) raise the cap for
 * the duration of a run WITHOUT touching code or restarting an image:
 *
 *   GATEWAY_RATE_LIMIT_MAX        — integer, max requests per window
 *   GATEWAY_RATE_LIMIT_WINDOW_MS  — integer, window size in milliseconds
 *
 * See `locust/README.md` for the exact override pattern used in load runs.
 */
const toPositiveInt = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const WINDOW_MS = toPositiveInt(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS, 60 * 1000);
const MAX_REQS = toPositiveInt(process.env.GATEWAY_RATE_LIMIT_MAX, 100);

export const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQS,
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
