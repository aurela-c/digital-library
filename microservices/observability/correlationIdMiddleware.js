import { randomUUID } from "crypto";


export function correlationIdMiddleware(req, res, next) {
  const id =
    req.get("x-request-id") ||
    req.get("X-Request-Id") ||
    randomUUID();
  req.correlationId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
