import jwt from "jsonwebtoken";
import { ACCESS_SECRET } from "../config/jwt.js";
import { createLogger } from "../../observability/logger.js";

const gatewayLog = createLogger("api-gateway");

const normalizeUser = (decoded) => {
  const id = decoded.id ?? decoded.userId ?? (decoded.sub != null ? Number(decoded.sub) : undefined);
  return {
    ...decoded,
    id,
    userId: decoded.userId ?? id,
    role: decoded.role,
  };
};

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token provided", code: "NO_TOKEN" });
  }

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Invalid token format", code: "INVALID_FORMAT" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = normalizeUser(decoded);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(403).json({
      error: "Invalid token",
      code: "TOKEN_INVALID",
    });
  }
};

export const auditLog = (action) => {
  return (req, res, next) => {
    const userId = req.user?.id ?? req.user?.userId ?? "anonymous";
    gatewayLog.info(
      {
        event: "gateway_audit",
        action,
        userId,
        correlationId: req.correlationId,
      },
      action
    );
    next();
  };
};
