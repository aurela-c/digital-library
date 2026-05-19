import { ROLES, normalizeRoleKey } from "../constants/roles.js";

export const requireSelfOrAdmin =
  (paramName = "id") =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (normalizeRoleKey(req.user.role) === normalizeRoleKey(ROLES.ADMIN)) {
      return next();
    }

    const uid = req.user.id ?? req.user.userId ?? req.user.sub;
    if (String(uid) === String(req.params[paramName])) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden" });
  };
