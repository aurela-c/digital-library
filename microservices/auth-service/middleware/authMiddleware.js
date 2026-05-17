import jwt from "jsonwebtoken";

import { getSecret } from "../../observability/config/secrets.js";

const ACCESS_SECRET = getSecret("ACCESS_SECRET", "ACCESS_SECRET_KEY");

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No token provided",
      code: "NO_TOKEN",
    });
  }

  const token = header.split(" ")[1];

  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
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
