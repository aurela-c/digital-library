import { normalizeRoleKey } from "../constants/roles.js";

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userKey = normalizeRoleKey(req.user.role);
  const allowedKeys = roles.map((r) => normalizeRoleKey(r));

  if (!userKey || !allowedKeys.includes(userKey)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};
