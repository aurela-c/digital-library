import { randomUUID } from "crypto";

/**
 * Propagate or create X-Request-Id for distributed tracing across services.
 */
export function correlationIdMiddleware(req, res, next) {
  const id =
    req.get("x-request-id") ||
    req.get("X-Request-Id") ||
    randomUUID();
  req.correlationId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
