import jwt from "jsonwebtoken";
import { getSecret } from "../../observability/config/secrets.js";

const ACCESS_SECRET = getSecret("ACCESS_SECRET", "ACCESS_SECRET_KEY");

const normalizeUser = (decoded) => {
  const id =
    decoded.id ??
    decoded.userId ??
    (decoded.sub != null ? Number(decoded.sub) : undefined);
  return {
    ...decoded,
    id,
    userId: decoded.userId ?? id,
    role: decoded.role,
  };
};

/**
 * Verify JWT from Authorization: Bearer <token> and attach req.user.
 */
export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: "No token provided", code: "NO_TOKEN" });
  }

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Invalid token format",
      code: "INVALID_FORMAT",
    });
  }

  const token = header.split(" ")[1];

  try {
    req.user = normalizeUser(jwt.verify(token, ACCESS_SECRET));
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Access token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({
      error: "Invalid token",
      code: "TOKEN_INVALID",
    });
  }
};
